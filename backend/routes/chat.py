"""Thin FastAPI routes for the Nexora RAG backend."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.Rag.service import RagService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["rag"])

_service = RagService()


class AnswerRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    session_id: str
    inference_mode: str = Field(default="online", pattern="^(single|compare|local|online)$")
    models: list[str] = Field(default_factory=lambda: ["dpo"])


class AnswerResponse(BaseModel):
    conversation_id: str
    question: str
    retrieved_context: str
    retrieved_sources: list[str]
    responses: list[dict[str, str]]


class SessionCreateRequest(BaseModel):
    metadata: dict[str, Any] | None = None


class SessionResponse(BaseModel):
    id: str
    created_at: str
    metadata: dict[str, Any]


class RebuildIndexResponse(BaseModel):
    pages: int
    chunks: int
    inserted: int
    collection: str


@router.post("/answer", response_model=AnswerResponse)
def answer(req: AnswerRequest) -> AnswerResponse:
    try:
        result = _service.answer(
            question=req.question,
            session_id=req.session_id,
            inference_mode=req.inference_mode,
            models=req.models,
        )
        return AnswerResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Answer endpoint failed")
        raise HTTPException(status_code=500, detail="Internal server error") from exc


@router.post("/session", response_model=SessionResponse)
def create_session(req: SessionCreateRequest) -> SessionResponse:
    try:
        session = _service.create_session(metadata=req.metadata)
        return SessionResponse(id=session.id, created_at=session.created_at, metadata=session.metadata)
    except Exception as exc:
        logger.exception("Create session failed")
        raise HTTPException(status_code=500, detail="Internal server error") from exc


@router.delete("/session/{session_id}")
def delete_session(session_id: str) -> dict[str, bool]:
    deleted = _service.delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"deleted": True}


@router.get("/session/{session_id}")
def get_session(session_id: str) -> SessionResponse:
    session = _service.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionResponse(id=session.id, created_at=session.created_at, metadata=session.metadata)


class EvaluateResponse(BaseModel):
    conversation_id: str
    question: str
    evaluation: dict[str, Any]


@router.post("/session/{session_id}/evaluate", response_model=list[EvaluateResponse])
def evaluate_session(session_id: str) -> list[EvaluateResponse]:
    try:
        evaluations = _service.evaluate_session(session_id)
        return [EvaluateResponse(**ev) for ev in evaluations]
    except Exception as exc:
        logger.exception("Evaluate session failed")
        raise HTTPException(status_code=500, detail="Internal server error") from exc


@router.post("/rebuild-index", response_model=RebuildIndexResponse)
def rebuild_index() -> RebuildIndexResponse:
    try:
        result = _service.rebuild_index()
        return RebuildIndexResponse(**result)
    except Exception as exc:
        logger.exception("Rebuild index failed")
        raise HTTPException(status_code=500, detail="Internal server error") from exc
