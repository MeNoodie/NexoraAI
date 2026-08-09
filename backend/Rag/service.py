"""RAG service orchestration layer."""

from __future__ import annotations

import logging
from typing import Any

from backend.Rag.retrieval import retrieve
from backend.Rag.ingestion import ingest_documents
from backend.storage.session_store import SessionStore, Session, Conversation, Response
from backend.model_loader._model import get_llm_for_model
from backend.Eval.evaluator import evaluate_responses
from backend.prompts.prompts import RAG_PROMPT_TEMPLATE

logger = logging.getLogger(__name__)

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
                logger.info("Invoking model '%s' with prompt length %d.", model_name, len(prompt))
                llm = get_llm_for_model(model_name)
                if hasattr(llm, "invoke"):
                    result = llm.invoke(prompt)
                    response_text = getattr(result, "content", str(result))
                else:
                    result = llm.create_completion(prompt=prompt, max_tokens=256)
                    response_text = result["choices"][0]["text"]
                logger.info("Model '%s' responded with %d chars.", model_name, len(response_text))
            except Exception as exc:
                logger.error("Model '%s' failed: %s", model_name, exc)
                response_text = f"[Error generating response with {model_name}: {exc}]"

            display_name = "Rag" if (model_name == "dpo" and use_rag) else model_name

            self._session_store.create_response(
                conversation_id=conversation.id,
                model_name=display_name,
                response_text=response_text,
            )

            responses.append(
                {
                    "model_name": display_name,
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
                {
                    "model_name": "Rag" if (resp.model_name == "dpo" and conv.retrieved_context) else resp.model_name,
                    "response_text": resp.response_text,
                }
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

            # Normalize model name from 'dpo' to 'Rag' in evaluation results when RAG is used
            if conv.retrieved_context and isinstance(eval_result, dict):
                for item in eval_result.get("evaluations", []):
                    if str(item.get("model", "")).lower() in ("dpo", "dpo model"):
                        item["model"] = "Rag"
                if str(eval_result.get("best_model", "")).lower() in ("dpo", "dpo model"):
                    eval_result["best_model"] = "Rag"
                if "summary" in eval_result and isinstance(eval_result["summary"], str):
                    eval_result["summary"] = (
                        eval_result["summary"]
                        .replace("model dpo", "model Rag")
                        .replace("dpo model", "Rag model")
                        .replace("dpo", "Rag")
                        .replace("DPO", "Rag")
                    )

            for resp in responses:
                target_name = "Rag" if (resp.model_name in ("dpo", "Rag") and conv.retrieved_context) else resp.model_name
                model_eval = next(
                    (e for e in eval_result.get("evaluations", []) if e.get("model") in (target_name, resp.model_name)),
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
