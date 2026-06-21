# src/database.py
"""
database.py — SQLite Database Setup

This file does THREE things:
1. Creates the database engine (the connection to the SQLite file)
2. Creates a session factory (opens/closes connections automatically)
3. Defines the base class that all tables inherit from

Think of it as: "Here's the building, here's the key to enter,
and here's the blueprint for all rooms."
"""

import os

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.sql import func

# Import settings from config.py — this is WHY we built config.py first
from src.config import settings

# ============================================================================
# PART 1: The Engine (The Database Connection)
# ============================================================================

# ✅ FIX: Determine persistent database path
# Render free tier: use /opt/render/project/src/ for persistence
# Local dev: use project root
RENDER_DISK_PATH = "/opt/render/project/src"
LOCAL_DB_NAME = "ledgerwatch.db"


def get_database_url():
    """
    Returns the correct SQLite database URL based on environment.

    Priority:
    1. settings.DATABASE_URL (from .env)
    2. Render persistent disk path
    3. Local project directory
    """
    # If explicit DATABASE_URL is set in env, use it
    env_url = os.environ.get("DATABASE_URL")
    if env_url:
        if env_url.startswith("postgres://"):
            env_url = env_url.replace("postgres://", "postgresql://", 1)
        return env_url

    # Check if we're on Render (persistent disk exists)
    if os.path.exists(RENDER_DISK_PATH):
        db_path = os.path.join(RENDER_DISK_PATH, LOCAL_DB_NAME)
        return f"sqlite:///{db_path}"

    # Fallback: local development
    return f"sqlite:///./{LOCAL_DB_NAME}"


DATABASE_URL = get_database_url()
print(f"Database URL: {DATABASE_URL}")  # Log for debugging

# SQLite needs a special setting for FastAPI later.
# SQLite is single-threaded by default, but FastAPI uses multiple threads.
# check_same_thread=False tells SQLite: "It's okay, we know what we're doing."
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,  # ✅ FIXED: Dynamic path based on environment
    connect_args=connect_args,  # The special SQLite setting above
    echo=False,  # Set to True to see raw SQL (for debugging)
)

# What happens here:
# - SQLAlchemy creates a file called "ledgerwatch.db" in your project folder
# - It opens a connection to that file
# - echo=False means it won't print every SQL command (keeps output clean)


# ============================================================================
# PART 2: The Session Factory (Automatic Connection Management)
# ============================================================================

SessionLocal = sessionmaker(
    autocommit=False,  # Don't save to disk automatically — we control when
    autoflush=False,  # Don't push changes to DB until we explicitly say so
    bind=engine,  # Use the engine we created above
)

# What this means:
# - autocommit=False: If your code crashes mid-way, NOTHING is saved.
#   This prevents half-written data. You must call session.commit() to save.
# - autoflush=False: Changes stay in memory until you decide to write them.
#   This is faster and gives you control.


# ============================================================================
# PART 3: The Base Class (Blueprint for All Tables)
# ============================================================================

Base = declarative_base()

# ============================================================================
# PART 3a: The User Table
# ============================================================================
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# ============================================================================
# PART 3b: The Transaction Table (The "Room Blueprint")
# ============================================================================


class Transaction(Base):
    """
    This Python class = one table in SQLite called 'transactions'.
    Each instance of this class = one row in that table.

    SQLAlchemy automatically converts this class into a SQL CREATE TABLE command.
    """

    __tablename__ = "transactions"  # The actual table name in the database

    # Primary key: unique ID for each row, auto-increments (1, 2, 3...)
    id = Column(Integer, primary_key=True, index=True)

    # PaySim columns — these map exactly to the CSV
    step = Column(Integer, nullable=False)
    type = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    nameOrig = Column(String, nullable=False)
    oldbalanceOrg = Column(Float, nullable=False)
    newbalanceOrig = Column(Float, nullable=False)
    nameDest = Column(String, nullable=False)
    oldbalanceDest = Column(Float, nullable=False)
    newbalanceDest = Column(Float, nullable=False)
    # Prediction results (added when transaction is processed)
    is_anomaly = Column(
        Boolean, default=False
    )  # 1 = anomaly, 0 = normal, None = not processed
    risk_band = Column(String, default="Low")  # Low, Medium, Elevated, High, Critical
    risk_score = Column(Integer, default=0)
    # Fraud labels — nullable because during real predictions, we won't know these
    isFraud = Column(Integer, nullable=True)
    isFlaggedFraud = Column(Integer, nullable=True)

    # Auto-generated timestamp when the row is inserted
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # ^ func.now() = SQLite automatically sets this to the current time
    # Feedback loop for retraining (NEW)
    feedback_correct = Column(
        Boolean, nullable=True
    )  # NULL = not reviewed, True = correct, False = false positive
    feedback_notes = Column(String, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(String, nullable=True)


def get_db():
    """
    Creates a database session, gives it to the caller, and cleans up afterward.

    This is called a "generator" — it yields (gives) a session, waits for
    the caller to finish, then closes the session automatically.

    FastAPI will use this as: db = Depends(get_db)
    """
    db = SessionLocal()  # Open a new connection
    try:
        yield db  # Hand it over to whoever asked for it
    finally:
        db.close()  # ALWAYS close, even if an error happened


# Why this pattern?
# - Every API request gets its OWN database session
# - Sessions are closed automatically, even if the route crashes
# - No connection leaks, no "database locked" errors
