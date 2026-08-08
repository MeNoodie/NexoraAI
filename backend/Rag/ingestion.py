"""Document ingestion pipeline."""

from __future__ import annotations

import logging

from langchain_core.documents import Document as LangChainDocument

from backend.config.config_model import load_settings
from backend.Rag.documents import load_pdf
from backend.Rag.chunking import chunk_documents
from backend.Rag.vector_store import get_vector_store
logger = logging.getLogger(__name__)


def ingest_documents(batch_size: int = 64) -> dict:
    """
    Build the vector index from the configured handbook.

    Steps:
        1. Load PDF
        2. Chunk documents
        3. Convert to LangChain Documents
        4. Store in AstraDB
    """

    settings = load_settings()

    rag = settings.rag

    logger.info("Loading handbook...")

    documents = load_pdf(rag["source_document"])

    logger.info("Chunking handbook...")

    chunks = chunk_documents(
        documents=documents,
        chunk_size=rag["chunk_size"],
        overlap=rag["chunk_overlap"],
    )

    logger.info("Connecting to vector store...")

    vector_store = get_vector_store()

    langchain_docs: list[LangChainDocument] = []
    ids: list[str] = []

    for index, chunk in enumerate(chunks):
        langchain_docs.append(
            LangChainDocument(
                page_content=chunk.text,
                metadata={
                    "source": chunk.source,
                    "page": chunk.page,
                },
            )
        )

        ids.append(
            f"{chunk.source}:p{chunk.page}:c{index}"
        )

    inserted = 0

    logger.info("Uploading %d chunks...", len(langchain_docs))

    for start in range(0, len(langchain_docs), batch_size):

        end = start + batch_size
        try:
            result = vector_store.add_documents(
                documents=langchain_docs[start:end],
                ids=ids[start:end],
            )

            # If the vector store returns inserted ids, count those; otherwise
            # assume the batch was inserted and use batch size.
            if isinstance(result, list):
                inserted += len(result)
            else:
                inserted += len(langchain_docs[start:end])

        except Exception as exc:
            logger.exception("Failed to insert batch %d-%d: %s", start, end, exc)

        logger.info(
            "Inserted %d/%d chunks",
            inserted,
            len(langchain_docs),
        )

    logger.info("Vector store ingestion completed.")

    return {
        "pages": len(documents),
        "chunks": len(chunks),
        "inserted": inserted,
        "collection": rag["astradb"]["collection_name"],
    }