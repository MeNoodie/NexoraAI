"""SQLite-backed session, conversation, and response storage."""

from __future__ import annotations

import json
import logging
import sqlite3
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_DB_PATH = Path(__file__).resolve().parents[1] / "storage" / "sessions.db"


@dataclass(frozen=True)
class Session:
    id: str
    created_at: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class Conversation:
    id: str
    session_id: str
    question: str
    retrieved_context: str
    retrieved_sources: list[str]
    timestamp: str


@dataclass(frozen=True)
class Response:
    id: str
    conversation_id: str
    model_name: str
    response_text: str
    evaluation: dict[str, Any] | None = None
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SessionStore:
    """CRUD storage for sessions, conversations, and model responses."""

    def __init__(self, db_path: str | Path | None = None) -> None:
        self._db_path = Path(db_path) if db_path else _DB_PATH
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self._db_path))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    def _initialize(self) -> None:
        with self._get_connection() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    metadata TEXT
                );

                CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    question TEXT NOT NULL,
                    retrieved_context TEXT NOT NULL,
                    retrieved_sources TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS responses (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    model_name TEXT NOT NULL,
                    response_text TEXT NOT NULL,
                    evaluation TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
                );
                """
            )
            conn.commit()
        logger.info("SessionStore initialized at %s", self._db_path)

    # Session CRUD
    def create_session(self, session_id: str | None = None, metadata: dict[str, Any] | None = None) -> Session:
        sid = session_id or str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            conn.execute(
                "INSERT INTO sessions (id, created_at, metadata) VALUES (?, ?, ?)",
                (sid, now, json.dumps(metadata or {})),
            )
            conn.commit()
        logger.debug("Created session %s", sid)
        return Session(id=sid, created_at=now, metadata=metadata or {})

    def get_session(self, session_id: str) -> Session | None:
        with self._get_connection() as conn:
            row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
        if row is None:
            return None
        return Session(
            id=row["id"],
            created_at=row["created_at"],
            metadata=json.loads(row["metadata"] or "{}"),
        )

    def delete_session(self, session_id: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
            conn.commit()
            deleted = cursor.rowcount > 0
        if deleted:
            logger.debug("Deleted session %s", session_id)
        return deleted

    def list_sessions(self) -> list[Session]:
        with self._get_connection() as conn:
            rows = conn.execute("SELECT * FROM sessions ORDER BY created_at DESC").fetchall()
        return [
            Session(
                id=row["id"],
                created_at=row["created_at"],
                metadata=json.loads(row["metadata"] or "{}"),
            )
            for row in rows
        ]

    # Conversation CRUD
    def create_conversation(
        self,
        session_id: str,
        question: str,
        retrieved_context: str,
        retrieved_sources: list[str],
        conversation_id: str | None = None,
    ) -> Conversation:
        cid = conversation_id or str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO conversations (id, session_id, question, retrieved_context, retrieved_sources, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (cid, session_id, question, retrieved_context, json.dumps(retrieved_sources), now),
            )
            conn.commit()
        logger.debug("Created conversation %s for session %s", cid, session_id)
        return Conversation(
            id=cid,
            session_id=session_id,
            question=question,
            retrieved_context=retrieved_context,
            retrieved_sources=retrieved_sources,
            timestamp=now,
        )

    def get_conversation(self, conversation_id: str) -> Conversation | None:
        with self._get_connection() as conn:
            row = conn.execute("SELECT * FROM conversations WHERE id = ?", (conversation_id,)).fetchone()
        if row is None:
            return None
        return Conversation(
            id=row["id"],
            session_id=row["session_id"],
            question=row["question"],
            retrieved_context=row["retrieved_context"],
            retrieved_sources=json.loads(row["retrieved_sources"] or "[]"),
            timestamp=row["timestamp"],
        )

    def list_conversations(self, session_id: str) -> list[Conversation]:
        with self._get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM conversations WHERE session_id = ? ORDER BY timestamp ASC",
                (session_id,),
            ).fetchall()
        return [
            Conversation(
                id=row["id"],
                session_id=row["session_id"],
                question=row["question"],
                retrieved_context=row["retrieved_context"],
                retrieved_sources=json.loads(row["retrieved_sources"] or "[]"),
                timestamp=row["timestamp"],
            )
            for row in rows
        ]

    # Response CRUD
    def create_response(
        self,
        conversation_id: str,
        model_name: str,
        response_text: str,
        evaluation: dict[str, Any] | None = None,
        response_id: str | None = None,
    ) -> Response:
        rid = response_id or str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO responses (id, conversation_id, model_name, response_text, evaluation, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (rid, conversation_id, model_name, response_text, json.dumps(evaluation) if evaluation else None, now),
            )
            conn.commit()
        logger.debug("Created response %s for conversation %s", rid, conversation_id)
        return Response(
            id=rid,
            conversation_id=conversation_id,
            model_name=model_name,
            response_text=response_text,
            evaluation=evaluation,
            created_at=now,
        )

    def get_response(self, response_id: str) -> Response | None:
        with self._get_connection() as conn:
            row = conn.execute("SELECT * FROM responses WHERE id = ?", (response_id,)).fetchone()
        if row is None:
            return None
        return Response(
            id=row["id"],
            conversation_id=row["conversation_id"],
            model_name=row["model_name"],
            response_text=row["response_text"],
            evaluation=json.loads(row["evaluation"]) if row["evaluation"] else None,
            created_at=row["created_at"],
        )

    def get_responses_for_conversation(self, conversation_id: str) -> list[Response]:
        with self._get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM responses WHERE conversation_id = ? ORDER BY created_at ASC",
                (conversation_id,),
            ).fetchall()
        return [
            Response(
                id=row["id"],
                conversation_id=row["conversation_id"],
                model_name=row["model_name"],
                response_text=row["response_text"],
                evaluation=json.loads(row["evaluation"]) if row["evaluation"] else None,
                created_at=row["created_at"],
            )
            for row in rows
        ]

    def update_response_evaluation(self, response_id: str, evaluation: dict[str, Any]) -> None:
        with self._get_connection() as conn:
            conn.execute(
                "UPDATE responses SET evaluation = ? WHERE id = ?",
                (json.dumps(evaluation), response_id),
            )
            conn.commit()
        logger.debug("Updated evaluation for response %s", response_id)
