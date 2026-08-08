"""RAG service orchestration layer."""

from __future__ import annotations

import logging
from typing import Any

from backend.Rag.retrieval import retrieve
from backend.Rag.ingestion import ingest_documents
from backend.storage.session_store import SessionStore, Session, Conversation, Response
from backend.model_loader._model import get_llm_for_model
from backend.Eval.evaluator import evaluate_responses
from backend.prompts.prompts import (
    DPO_SYSTEM_PROMPT_TEMPLATE,
    SFT_HR_SYSTEM_PROMPT,
)

logger = logging.getLogger(__name__)


def _build_chat_messages(
    model_name: str,
    question: str,
    context: str,
) -> list[dict[str, str]]:
    """Build system/user message list for create_chat_completion().

    DPO model:
        The retrieved policy context is injected directly into the system
        message. The user message contains only the bare question. This
        forces the model to treat the policy as the authoritative source.

    SFT model:
        Uses the general HR system prompt. The context (if any) is prepended
        to the user message so the model can reference it without the same
        strict grounding rules applied to DPO.
    """
    if model_name == "dpo":
        if context:
            system_content = DPO_SYSTEM_PROMPT_TEMPLATE.substitute(
                retrieved_context=context
            )
        else:
            # No RAG context available — fall back to a minimal DPO prompt
            system_content = (
                "You are Nexora, an HR policy assistant. "
                "Answer the employee's question professionally and concisely. "
                "If you are uncertain, say so clearly."
            )
        return [
            {"role": "system", "content": system_content},
            {"role": "user", "content": question},
        ]

    else:
        # SFT model: use the original HR system prompt
        user_content = question
        if context:
            user_content = (
                f"Policy context:\n{context}\n\nQuestion: {question}"
            )
        return [
            {"role": "system", "content": SFT_HR_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ]


class RagService:
    """Orchestrates retrieval, generation, session management, and evaluation.

    Does not implement retrieval or embedding logic itself.
    """

    def __init__(self, session_store: SessionStore | None = None) -> None:
        self._session_store = session_store or SessionStore()

    def answer(
        self,
        question: str,
        session_id: str,
        inference_mode: str,
        models: list[str],
    ) -> dict[str, Any]:
        """Retrieve context, generate answers from multiple models, and persist them."""

        if not question.strip():
            raise ValueError("Question must not be empty.")
        if not models:
            raise ValueError("At least one model must be specified.")

        if self._session_store.get_session(session_id) is None:
            raise ValueError(f"Session '{session_id}' not found.")

        target_models = models if inference_mode == "compare" else models[:1]

        logger.info(
            "Answering question for session %s using models %s (mode=%s)",
            session_id,
            target_models,
            inference_mode,
        )

        use_rag = inference_mode in {"online", "compare"}
        if use_rag:
            logger.info("Retrieving context for RAG question.")
            retrieved_docs = retrieve(question)
            logger.info("Retrieved %d docs from RAG retrieval.", len(retrieved_docs))
            if retrieved_docs:
                context_parts = [doc.page_content for doc in retrieved_docs]
                context_text = "\n\n".join(context_parts)
                sources = [doc.metadata.get("source", "unknown") for doc in retrieved_docs]
                prompt = RAG_PROMPT_TEMPLATE.substitute(context=context_text, question=question)
            else:
                logger.info("No RAG context found; falling back to direct question prompt.")
                context_text = ""
                sources = []
                prompt = question
        else:
            context_text = ""
            sources = []
            prompt = question

        conversation = self._session_store.create_conversation(
            session_id=session_id,
            question=question,
            retrieved_context=context_text,
            retrieved_sources=sources,
        )

        responses: list[dict[str, str]] = []

        for model_name in target_models:
            try:
                llm = get_llm_for_model(model_name)

                if hasattr(llm, "invoke"):
                    # ── Groq cloud model (evaluation only — not used for answers) ──
                    result = llm.invoke(prompt)
                    response_text = getattr(result, "content", str(result))

                else:
                    # ── Local GGUF model ──────────────────────────────────────────
                    # Use create_chat_completion() so the ChatML template
                    # (<|im_start|>system…<|im_end|>) is applied correctly.
                    # create_completion() bypasses the template and degrades quality.
                    messages = _build_chat_messages(model_name, question, context_text)
                    logger.info(
                        "Invoking model '%s' via chat completion (%d-char context).",
                        model_name,
                        len(context_text),
                    )
                    result = llm.create_chat_completion(
                        messages=messages,
                        max_tokens=256,
                        temperature=0.1,
                        top_p=0.85,
                        repeat_penalty=1.1,
                        seed=42,
                        stop=["<|im_end|>", "<|im_start|>"],
                    )
                    response_text = result["choices"][0]["message"]["content"].strip()

                logger.info("Model '%s' responded with %d chars.", model_name, len(response_text))
            except Exception as exc:
                logger.error("Model '%s' failed: %s", model_name, exc)
                response_text = f"[Error generating response with {model_name}: {exc}]"

            self._session_store.create_response(
                conversation_id=conversation.id,
                model_name=model_name,
                response_text=response_text,
            )

            responses.append(
                {
                    "model_name": model_name,
                    "response_text": response_text,
                }
            )

        return {
            "conversation_id": conversation.id,
            "question": question,
            "retrieved_context": context_text,
            "retrieved_sources": sources,
            "responses": responses,
        }

    def rebuild_index(self) -> dict[str, Any]:
        """Rebuild the vector index from the configured source document."""

        logger.info("Rebuilding vector index...")
        result = ingest_documents()
        logger.info("Index rebuild completed: %s", result)
        return result

    def create_session(self, session_id: str | None = None, metadata: dict[str, Any] | None = None) -> Session:
        """Create a new session."""

        return self._session_store.create_session(session_id=session_id, metadata=metadata)

    def get_session(self, session_id: str) -> Session | None:
        """Retrieve a session by ID."""

        return self._session_store.get_session(session_id)

    def delete_session(self, session_id: str) -> bool:
        """Delete a session and all associated data."""

        return self._session_store.delete_session(session_id)

    def evaluate_session(self, session_id: str) -> list[dict[str, Any]]:
        """Evaluate all model responses in a session."""

        if self._session_store.get_session(session_id) is None:
            raise ValueError(f"Session '{session_id}' not found.")

        conversations = self._session_store.list_conversations(session_id)
        if not conversations:
            logger.info("No conversations found for session %s", session_id)
            return []

        evaluations: list[dict[str, Any]] = []

        for conv in conversations:
            responses = self._session_store.get_responses_for_conversation(conv.id)
            if not responses:
                continue

            answers = [
                {"model_name": resp.model_name, "response_text": resp.response_text}
                for resp in responses
            ]

            try:
                eval_result = evaluate_responses(
                    question=conv.question,
                    retrieved_context=conv.retrieved_context,
                    responses=answers,
                )
            except Exception as exc:
                logger.error("Evaluation failed for conversation %s: %s", conv.id, exc)
                eval_result = {
                    "evaluations": [],
                    "best_model": None,
                    "summary": f"Evaluation failed: {exc}",
                }

            for resp in responses:
                model_eval = next(
                    (e for e in eval_result.get("evaluations", []) if e.get("model") == resp.model_name),
                    None,
                )
                if model_eval:
                    self._session_store.update_response_evaluation(
                        response_id=resp.id,
                        evaluation=model_eval,
                    )

            evaluations.append(
                {
                    "conversation_id": conv.id,
                    "question": conv.question,
                    "evaluation": eval_result,
                }
            )

        return evaluations
