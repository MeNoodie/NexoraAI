from __future__ import annotations

import logging
import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_huggingface import HuggingFaceEndpointEmbeddings

from backend.config.config_model import load_settings

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_embedding_model():
    settings = load_settings()
    cfg = settings.rag["embedding"]

    hf_token = os.getenv("HUGGINGFACEHUB_API_TOKEN")
    gemini_key = os.getenv("GOOGLE_API_KEY")

    # Primary: Hugging Face
    if cfg["provider"] == "huggingface":
        try:
            if not hf_token:
                raise RuntimeError("HF token missing.")

            logger.info("Using Hugging Face embedding model.")

            return HuggingFaceEndpointEmbeddings(
                model=cfg["huggingface"]["model"],
                huggingfacehub_api_token=hf_token,
            )

        except Exception as e:
            logger.warning("HF embedding failed: %s", e)

    # Fallback: Gemini
    if cfg["fallback_provider"] == "gemini":
        if not gemini_key:
            raise RuntimeError("GOOGLE_API_KEY is missing.")

        logger.info("Falling back to Gemini embedding model.")

        return GoogleGenerativeAIEmbeddings(
            model=cfg["gemini"]["model"],
            google_api_key=gemini_key,
        )

    raise RuntimeError("No embedding provider available.")