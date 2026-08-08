"""Groq-based evaluation of multiple model responses."""

from __future__ import annotations

import json
import logging
import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from backend.prompts.prompts import EVALUATION_PROMPT_TEMPLATE

logger = logging.getLogger(__name__)

# Load .env explicitly so GROQ_API_KEY is always available regardless of import order.
_ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=_ENV_PATH, override=True)


def _load_evaluation_model() -> ChatGroq:
    """Load the Groq judge model from model.yaml evaluation configuration."""

    import yaml
    from pathlib import Path

    config_path = Path(__file__).resolve().parents[1] / "config" / "model.yaml"
    with config_path.open(encoding="utf-8") as f:
        raw = yaml.safe_load(f) or {}

    eval_section = raw.get("Evaluation_model", {})
    models = eval_section.get("models", {})

    if not models:
        raise RuntimeError("No Evaluation_model.models configured in model.yaml.")

    model_name = next(iter(models))
    model_data = models[model_name]

    if model_data.get("provider", "").lower() != "groq":
        raise RuntimeError("Evaluation model must be a Groq model.")

    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise RuntimeError("GROQ_API_KEY environment variable is missing.")

    # Use the explicit 'path' key as the model name; fall back to the dict key.
    resolved_model = model_data.get("path", model_name)
    logger.info("Loading evaluation model: %s", resolved_model)

    return ChatGroq(
        model=resolved_model,
        api_key=groq_api_key,
        temperature=0.0,
    )


@lru_cache(maxsize=1)
def _get_evaluator():
    return _load_evaluation_model()


def _format_answers(answers: list[dict[str, str]]) -> str:
    lines = []
    for idx, ans in enumerate(answers, start=1):
        lines.append(f"Answer {idx} (Model: {ans['model_name']}):")
        lines.append(ans["response_text"])
        lines.append("")
    return "\n".join(lines)


def _extract_json(text: str) -> dict[str, Any]:
    """Extract the outermost JSON object from the model output.

    Uses a brace-counting approach to find the full top-level {…} block,
    rather than a simple non-greedy regex that would stop at the first
    closing brace and miss nested objects.
    """
    start = text.find("{")
    if start == -1:
        raise ValueError("No JSON object found in evaluator output.")

    depth = 0
    in_string = False
    escape_next = False

    for i, ch in enumerate(text[start:], start=start):
        if escape_next:
            escape_next = False
            continue
        if ch == "\\" and in_string:
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                candidate = text[start : i + 1]
                try:
                    return json.loads(candidate)
                except json.JSONDecodeError as exc:
                    raise ValueError(f"Invalid JSON in evaluator output: {exc}") from exc

    raise ValueError("No complete JSON object found in evaluator output.")


def evaluate_responses(
    question: str,
    retrieved_context: str,
    responses: list[dict[str, str]],
) -> dict[str, Any]:
    """Compare multiple model responses using Groq as the judge.

    Args:
        question: The original user question.
        retrieved_context: The retrieved context used for generation.
        responses: List of dicts with keys ``model_name`` and ``response_text``.

    Returns:
        Structured JSON with per-model scores, best model, and summary.
    """

    if not responses:
        raise ValueError("At least one response is required for evaluation.")

    answers_text = _format_answers(responses)

    # EVALUATION_PROMPT_TEMPLATE is a plain string using {variable} syntax,
    # compatible with LangChain's ChatPromptTemplate substitution.
    prompt = ChatPromptTemplate.from_template(EVALUATION_PROMPT_TEMPLATE)
    chain = prompt | _get_evaluator() | StrOutputParser()

    raw_output = chain.invoke(
        {
            "question": question,
            "context": retrieved_context or "(no context retrieved)",
            "answers": answers_text,
        }
    )

    logger.debug("Evaluator raw output: %s", raw_output)

    try:
        result = _extract_json(raw_output)
    except ValueError as parse_err:
        logger.warning("Failed to parse evaluator JSON: %s", parse_err)
        result = {
            "evaluations": [],
            "best_model": None,
            "summary": "Evaluation output could not be parsed.",
            "raw_output": raw_output,
        }

    return result
