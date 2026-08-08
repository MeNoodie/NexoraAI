"""Vector store factory for RAG retrieval and ingestion."""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

from langchain_astradb import AstraDBVectorStore

from backend.config.config_model import load_settings
from backend.Rag.embedding import get_embedding_model

logger = logging.getLogger(__name__)
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")

def get_vector_store() -> Any:
    """Return a configured AstraDB vector store instance.

    Requires ASTRA_DB_API_ENDPOINT and ASTRA_DB_APPLICATION_TOKEN environment variables.
    """

    settings = load_settings()
    rag = settings.rag
    embeddings = get_embedding_model()

    astra_endpoint = os.getenv("ASTRA_DB_API_ENDPOINT")
    astra_token = os.getenv("ASTRA_DB_APPLICATION_TOKEN")
    collection_name = rag.get("astradb", {}).get("collection_name", "Nexora_handbook")
    namespace = rag.get("astradb", {}).get("namespace") or os.getenv("ASTRA_DB_KEYSPACE")

    if not astra_endpoint or not astra_token:
        raise RuntimeError(
            "AstraDB is not configured. "
            "Set ASTRA_DB_API_ENDPOINT and ASTRA_DB_APPLICATION_TOKEN environment variables."
        )

    logger.info("Initializing AstraDBVectorStore with collection '%s'.", collection_name)
    return AstraDBVectorStore(
        collection_name=collection_name,
        api_endpoint=astra_endpoint,
        token=astra_token,
        embedding=embeddings,
        namespace=namespace,
    )
