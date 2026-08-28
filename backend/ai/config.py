"""
CarePulse AI Configuration Module.

TODO: Model paths, confidence thresholds, and AI provider API keys loaded from environment.
"""

import os
from pathlib import Path

# Base directories
AI_BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = AI_BASE_DIR / "models"

# AI Provider API Keys
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")

# Model Hyperparameters & Thresholds
DEFAULT_TRIAGE_MODEL: str = os.getenv("CAREPULSE_TRIAGE_MODEL", "gemini-1.5-flash")
EMERGENCY_CONFIDENCE_THRESHOLD: float = float(os.getenv("EMERGENCY_CONFIDENCE_THRESHOLD", "0.85"))
MAX_TRIAGE_SUGGESTIONS: int = int(os.getenv("MAX_TRIAGE_SUGGESTIONS", "3"))

# TODO: Add paths to local model artifacts (.onnx, .pt, or HuggingFace transformers cache)
