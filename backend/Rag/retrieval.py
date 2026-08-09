import logging
import threading

from backend.config.config_model import load_settings
from backend.Rag.vector_store import get_vector_store

logger = logging.getLogger(__name__)
settings = load_settings()

_retriever = None
_lock = threading.Lock()


def _get_retriever():
    global _retriever
    if _retriever is None:
        with _lock:
            if _retriever is None:
                current_settings = load_settings()
                _retriever = get_vector_store().as_retriever(
                    search_type="mmr",
                    search_kwargs={
                        "k": current_settings.rag["top_k"],
                        "fetch_k": current_settings.rag["mmr_fetch_k"],
                        "lambda_mult": current_settings.rag["mmr_lambda"],
                    },
                )
    return _retriever


def retrieve(query: str):
    logger.info("Starting RAG retrieval for query: %s", query)
    try:
        docs = _get_retriever().invoke(query)
        logger.info("RAG retrieval completed: %d docs", len(docs) if docs is not None else 0)
        return docs
    except Exception as exc:
        logger.warning("RAG retrieval failed: %s", exc)
        return []
