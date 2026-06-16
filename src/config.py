"""
src/config.py — LedgerWatch AI configuration

Pydantic-settings with .env loading. All paths validated at startup.
"""

import os
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from .env file."""

    # ─── Paths ────────────────────────────────────────────────────────────────
    MODEL_PATH: str = "saved_models/isolation_forest_v1.0.0.joblib"
    RISK_ENGINE_PATH: str = "saved_models/risk_engine_v1.0.0.joblib"
    
    # ✅ FIX: DATABASE_URL — no default, let database.py handle path logic
    # Or use env var if explicitly set
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "")
    
    DATA_DIR: str = "data"
    PROCESSED_DIR: str = "data/processed"

    # ─── Training Hyperparameters (used by src/train.py) ─────────────────────
    TEST_SIZE: float = 0.2
    RANDOM_STATE: int = 42
    N_ESTIMATORS: int = 200
    MAX_SAMPLES: str = "auto"
    MAX_FEATURES: float = 1.0
    BOOTSTRAP: bool = False
    N_JOBS: int = -1

    # ─── API Security ────────────────────────────────────────────────────────
    API_KEY: str = "demo-key-123"

    # ─── CORS ───────────────────────────────────────────────────────────────
    CORS_ORIGINS: str = "http://localhost:5173,https://ledgerwatch-ai.vercel.app"
    # ─── Logging ─────────────────────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"

    # ─── Data File Paths ─────────────────────────────────────────────────────
    RAW_DATA_PATH: str = "data/raw/PS_20174392719_1491204439457_log.csv"
    PROCESSED_DATA_PATH: str = "data/processed/features.csv"

    # ─── Model Hyperparameters ───────────────────────────────────────────────
    CONTAMINATION: float = 0.0013

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    # ─── Path Validation ────────────────────────────────────────────────────
    def validate_paths(self) -> None:
        """Ensure critical paths exist. Called at startup."""
        for path_str in [self.MODEL_PATH, self.RISK_ENGINE_PATH]:
            path = Path(path_str)
            if not path.exists():
                # Log warning but don't crash — models may be loaded later
                import logging

                logging.getLogger(__name__).warning(f"Path not found: {path}")


# Single global settings instance
settings = Settings()
