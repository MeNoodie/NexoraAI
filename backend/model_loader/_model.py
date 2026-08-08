"""Model loader for the Nexora backend.

Models are loaded sequentially — only ONE local GGUF model is held in memory
at a time. When a different model is requested the previous instance is evicted
before the new one is loaded.  This allows SFT and DPO to be used in
compare mode without requiring both to be resident simultaneously.

Groq-hosted models (used only for evaluation) are stateless HTTP clients and
are not cached.
"""

from __future__ import annotations

import logging
import os
from typing import Any

from langchain_groq import ChatGroq

from backend.config.settings import load_settings

logger = logging.getLogger(__name__)

# Single-slot model cache: only ONE local GGUF lives in memory at a time.
_cached_model_name: str | None = None
_cached_model_instance: Any = None


def _load_llama():
    from llama_cpp import Llama
    return Llama


def get_llm():
    """Return the default LLM (configured by active_model in model.yaml)."""
    settings = load_settings()
    return get_llm_for_model(settings.model.name)


def get_llm_for_model(model_name: str):
    """Return an LLM instance for the specified model name.

    Local GGUF models (sft, dpo):
        A single cache slot is used.  If the requested model is already loaded
        it is returned immediately.  If a different model is currently cached,
        it is evicted and the requested model is loaded fresh.  This means SFT
        and DPO are NEVER in memory at the same time — each is loaded, used,
        and then replaced by the next, matching the user's sequential workflow:

            Load SFT  → generate → store in session DB
            Load DPO  → generate → store in session DB
            Pull both answers from DB → return comparison response

    Groq models (groq, rag, evaluation):
        These are stateless HTTP clients; a new ChatGroq instance is created
        each call (cheap and thread-safe).

    Args:
        model_name: Key from the ``models`` section of model.yaml
                    (e.g. ``"sft"``, ``"dpo"``, ``"groq"``).
    """
    global _cached_model_name, _cached_model_instance

    settings = load_settings(model_name=model_name)

    # ── Groq / cloud models ───────────────────────────────────────────────────
    if settings.model.provider and settings.model.provider.lower() == "groq":
        logger.info(
            "Creating Groq LLM for model '%s' (model_id=%s).",
            model_name,
            settings.model.path,
        )
        return ChatGroq(
            model=str(settings.model.path),
            temperature=settings.generation.get("temperature", 0.2),
            api_key=os.getenv("GROQ_API_KEY"),
        )

    # ── Local GGUF model ──────────────────────────────────────────────────────
    if _cached_model_name == model_name and _cached_model_instance is not None:
        logger.info("Returning cached local model '%s'.", model_name)
        return _cached_model_instance

    # Evict previous model from memory before loading the new one so that SFT
    # and DPO are never resident simultaneously.
    if _cached_model_instance is not None and _cached_model_name != model_name:
        logger.info(
            "Evicting cached model '%s' to load '%s'.",
            _cached_model_name,
            model_name,
        )
        _cached_model_instance = None
        _cached_model_name = None

    model_path = str(settings.model.path)
    logger.info(
        "Loading local GGUF model '%s' from: %s",
        model_name,
        model_path,
    )

    Llama = _load_llama()
    instance = Llama(
        model_path=model_path,
        n_ctx=settings.generation.get("context_window", 4096),
        n_gpu_layers=settings.generation.get("n_gpu_layers", -1),
        verbose=False,
    )

    _cached_model_name = model_name
    _cached_model_instance = instance
    logger.info("Model '%s' loaded and cached. Path: %s", model_name, model_path)
    return instance