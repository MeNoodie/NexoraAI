"""FastAPI entry point for Nexora RAG."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routes.chat import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logging.getLogger("uvicorn").setLevel(logging.INFO)
logging.getLogger("backend").setLevel(logging.INFO)

app = FastAPI(title="Nexora RAG API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(router)

@app.get("/")
def root() -> dict:
    return {"message": "Welcome to the Nexora RAG API. Use /docs for API documentation."}

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "rag_model": "dpo (default; override with NEXORA_MODEL=sft)"}

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")