"""Handbook loading and page-aware text extraction."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from pathlib import Path
import fitz

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Document:
    text: str
    source: str
    page: int


def _clean_text(text: str) -> str:
    text = text.replace("\u00ad", "").replace("\u200b", "")
    text = re.sub(r"(\w)-\s*\n\s*(\w)", r"\1\2", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def load_pdf(path: str | Path) -> list[Document]:
    """Extract non-empty text for every handbook page, retaining page numbers."""
    pdf_path = Path(path)
    if not pdf_path.is_file():
        raise FileNotFoundError(f"RAG source document was not found: {pdf_path}")

    documents: list[Document] = []
    with fitz.open(pdf_path) as pdf:
        for page_number, page in enumerate(pdf, start=1):
            text = _clean_text(page.get_text("text"))
            if text:
                documents.append(Document(text=text, source=pdf_path.name, page=page_number))
    if not documents:
        raise ValueError(f"No readable text was found in {pdf_path}")
    logger.info("Loaded %d pages from %s", len(documents), pdf_path)
    return documents
