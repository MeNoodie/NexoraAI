"""Chunk handbook pages using LangChain's RecursiveCharacterTextSplitter."""

from __future__ import annotations

from dataclasses import dataclass

from langchain_core.documents import Document as LCDocument
from langchain_text_splitters import RecursiveCharacterTextSplitter

from .documents import Document


@dataclass(frozen=True)
class Chunk:
    id: str
    text: str
    source: str
    page: int


def chunk_documents(
    documents: list[Document],
    chunk_size: int,
    overlap: int,
) -> list[Chunk]:
    """Split documents into overlapping chunks while preserving metadata."""

    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than 0")

    if overlap < 0 or overlap >= chunk_size:
        raise ValueError(
            "chunk_overlap must be non-negative and smaller than chunk_size"
        )

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    langchain_docs = [
        LCDocument(
            page_content=doc.text,
            metadata={
                "source": doc.source,
                "page": doc.page,
            },
        )
        for doc in documents
    ]

    split_docs = splitter.split_documents(langchain_docs)

    if not split_docs:
        raise ValueError("Chunking produced 0 chunks.")

    chunks: list[Chunk] = []

    for index, doc in enumerate(split_docs):
        chunks.append(
            Chunk(
                id=f"chunk-{index}",
                text=doc.page_content,
                source=doc.metadata["source"],
                page=doc.metadata["page"],
            )
        )

    return chunks