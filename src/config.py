# src/config.py
"""
config.py — The Settings Brain of LedgerWatch AI

Every other file in this project imports 'settings' from here.
This means: ONE place to change paths, ONE place to change parameters.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


# ============================================================================
# STEP 1: Find where the project lives on your computer
# ============================================================================

def _get_project_root() -> Path:
    """
    This file is at:  ledgerwatch-ai/src/config.py
    We need to go UP one folder to reach:  ledgerwatch-ai/
    That's where .env lives.
    """
    # __file__ = "ledgerwatch-ai/src/config.py"
    # .resolve() makes it an absolute path (no "..")
    # .parent goes to "src/", .parent again goes to "ledgerwatch-ai/"
    return Path(__file__).resolve().parent.parent


# ============================================================================
# STEP 2: Define what settings exist and their types
# ============================================================================

class Settings(BaseSettings):
    """
    Think of this as a form with fields. Each field has:
    - a name (like DATABASE_URL)
    - a type (str, float, etc.)
    - a default value (fallback if .env doesn't mention it)
    """

    # Tell pydantic-settings: "Read these values from .env file"
    model_config = SettingsConfigDict(
        env_file=_get_project_root() / ".env",   # Path to .env file
        env_file_encoding="utf-8",               # Handle special characters
        extra="ignore",                          # Ignore unknown vars in .env
    )

    # --- Database ---
    DATABASE_URL: str = "sqlite:///./ledgerwatch.db"
    # ^ If .env has DATABASE_URL, use that. Otherwise, use this default.

    # --- Model file path ---
    MODEL_PATH: str = "saved_models/isolation_forest_v1.0.0.joblib"

    # --- Data file paths ---
    RAW_DATA_PATH: str = "data/raw/PS_20174392719_1491204439457_log.csv"
    PROCESSED_DATA_PATH: str = "data/processed/features.csv"

    # --- ML hyperparameter ---
    CONTAMINATION: float = 0.01
    # ^ Isolation Forest expects this % of data to be outliers.
    #   PaySim has ~0.13% fraud, but IF needs at least 0.01 to work well.

    # --- Logging ---
    LOG_LEVEL: str = "INFO"


# ============================================================================
# STEP 3: Create ONE shared instance that everyone imports
# ============================================================================

settings = Settings()
# ^ This line RUNS when config.py is imported.
# It reads .env, validates types, and creates the settings object.
# Every other file does:  from src.config import settings
