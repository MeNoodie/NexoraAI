import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from huggingface_hub import hf_hub_download
from llama_cpp import Llama
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    hf_repo: str = Field(alias="HF_REPO")
    gguf_file: str = Field(alias="GGUF_FILE")
    hf_token: str | None = Field(default=None, alias="HF_TOKEN")

    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()

llm = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global llm

    print("Downloading model...")

    model_path = hf_hub_download(
        repo_id=settings.hf_repo,
        filename=settings.gguf_file,
        token=settings.hf_token,
    )

    print("Loading GGUF...")

    llm = Llama(
        model_path=model_path,
        n_ctx=2048,
        n_threads=os.cpu_count(),
        verbose=False,
    )

    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    history: list[dict[str, str]] = []
    temperature: float = 0.7
    max_tokens: int = 512


@app.post("/api/chat")
async def chat(req: ChatRequest):
    messages = []
    for msg in req.history:
        messages.append(msg)
    messages.append({"role": "user", "content": req.message})

    output = llm.create_chat_completion(
        messages=messages,
        temperature=req.temperature,
        max_tokens=req.max_tokens,
    )

    return {
        "response": output["choices"][0]["message"]["content"]
    }


@app.get("/health")
async def health():
    return {"status": "ok"}