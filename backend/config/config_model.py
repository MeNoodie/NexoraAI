"""Load model and RAG settings from one configuration file."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BACKEND_DIR.parent
CONFIG_PATH = Path(__file__).with_name("model.yaml")


@dataclass(frozen=True)
class ModelConfig:
    name: str
    label: str
    path: str | Path
    provider: str | None = None


@dataclass(frozen=True)
class Settings:
    model: ModelConfig
    rag: dict[str, Any]
    generation: dict[str, Any]


def load_settings(model_name: str | None = None) -> Settings:
    """Return validated settings, selecting DPO unless explicitly overridden."""
    with CONFIG_PATH.open(encoding="utf-8") as config_file:
        raw = yaml.safe_load(config_file) or {}

    models = raw.get("models", {})
    selected = (model_name or os.getenv("NEXORA_MODEL", raw.get("active_model", "dpo"))).lower()
    if selected not in models:
        available = ", ".join(sorted(models))
        raise ValueError(f"Unknown NEXORA_MODEL '{selected}'. Choose one of: {available}.")

    model_data = models[selected]
    provider = model_data.get("provider")
    model_path_value = model_data.get("path")
    if provider and provider.lower() == "groq":
        if not model_path_value:
            raise ValueError("Groq models must define a 'path' or model identifier in model.yaml.")
        model_path = model_path_value
    else:
        if not model_path_value:
            raise ValueError("Model entries must define a 'path' in model.yaml.")
        model_path = PROJECT_DIR / model_path_value

    return Settings(
        model=ModelConfig(
            name=selected,
            label=model_data.get("label", selected.upper()),
            path=model_path,
            provider=provider,
        ),
        rag=raw.get("rag", {}),
        generation=raw.get("generation", {}),
    )
 