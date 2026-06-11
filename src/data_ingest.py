# src/data_ingest.py
"""
data_ingest.py — The ETL Pipeline (Extract, Transform, Load)

This is the bridge between the raw PaySim CSV and your SQLite database.
It ensures only clean, validated data enters your system.
"""

import logging
from pathlib import Path
from typing import Optional

import pandas as pd
from sqlalchemy.orm import Session

from src.config import settings
from src.database import Base, SessionLocal, Transaction, engine
from src.schemas import TransactionCreate

# ============================================================================
# SETUP: Configure logging so we can see what's happening
# ============================================================================

logging.basicConfig(
    level=settings.LOG_LEVEL,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ============================================================================
# STEP 0: Initialize the Database Table
# ============================================================================


def init_database() -> None:
    """
    Creates the 'transactions' table in SQLite if it doesn't exist yet.

    Base.metadata.create_all() looks at ALL classes that inherit from Base
    (like our Transaction class) and creates their tables.

    Safe to call multiple times — won't break if the table already exists.
    """
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized. 'transactions' table is ready.")


# ============================================================================
# STEP 1: EXTRACT — Read the CSV
# ============================================================================


def load_raw_csv(file_path: str | Path) -> pd.DataFrame:
    """
    Reads the PaySim CSV into a pandas DataFrame.

    A DataFrame is like an Excel spreadsheet in Python — rows and columns
    that you can manipulate with code.

    Args:
        file_path: Path to the PaySim CSV file

    Returns:
        DataFrame containing the raw data
    """
    file_path = Path(file_path)

    if not file_path.exists():
        raise FileNotFoundError(
            f"CSV file not found: {file_path}\n"
            f"Please download PaySim from Kaggle and place it at: {settings.RAW_DATA_PATH}"
        )

    logger.info(f"Loading CSV from {file_path}")

    # Read the CSV. pandas automatically figures out column names from the header row.
    df = pd.read_csv(file_path)

    logger.info(f"Loaded {len(df):,} rows and {len(df.columns)} columns")
    return df


# ============================================================================
# STEP 2a: VALIDATE — Check Required Columns
# ============================================================================


def validate_schema(df: pd.DataFrame) -> bool:
    """
    Checks that the CSV has all the columns LedgerWatch AI expects.

    If columns are missing, we raise an error immediately — we don't want
    to discover this halfway through processing.

    Args:
        df: The DataFrame loaded from CSV

    Returns:
        True if valid (raises ValueError if not)
    """
    required_columns = [
        "step",
        "type",
        "amount",
        "nameOrig",
        "oldbalanceOrg",
        "newbalanceOrig",
        "nameDest",
        "oldbalanceDest",
        "newbalanceDest",
        "isFraud",
        "isFlaggedFraud",
    ]

    # Find any columns that are in 'required' but not in the DataFrame
    missing = [col for col in required_columns if col not in df.columns]

    if missing:
        raise ValueError(
            f"CSV is missing required columns: {missing}\n"
            f"Found columns: {list(df.columns)}"
        )

    logger.info("Schema validation passed. All required columns present.")
    return True


# ============================================================================
# STEP 2b: CLEAN — Fix Data Issues
# ============================================================================


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Fixes common data quality issues before writing to the database.

    What we clean:
    1. Remove duplicate rows (exact copies)
    2. Ensure numeric columns are actually numbers
    3. Remove rows with missing critical data
    4. Fix fraud label types

    Args:
        df: Raw DataFrame from CSV

    Returns:
        Cleaned DataFrame
    """
    # Make a copy so we don't accidentally modify the original data
    df = df.copy()

    # --- 1. Remove duplicates ---
    rows_before = len(df)
    df = df.drop_duplicates()
    rows_after = len(df)
    if rows_before != rows_after:
        logger.info(f"Removed {rows_before - rows_after:,} duplicate rows")

    # --- 2. Ensure numeric columns are numbers ---
    numeric_columns = [
        "amount",
        "oldbalanceOrg",
        "newbalanceOrig",
        "oldbalanceDest",
        "newbalanceDest",
    ]

    for col in numeric_columns:
        # pd.to_numeric converts text to numbers. errors="coerce" means:
        # "If you can't convert it (e.g., text 'abc'), set it to NaN (missing)"
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # --- 3. Remove rows where critical numeric data is missing ---
    # We can't train a model on transactions with no amount!
    df = df.dropna(subset=numeric_columns)

    # --- 4. Fix fraud label columns ---
    # These should be integers (0 or 1), but CSVs sometimes read them as floats (0.0, 1.0)
    for col in ["isFraud", "isFlaggedFraud"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
        # "Int64" (capital I) is pandas' special nullable integer type
        # It can hold integers AND missing values (None/NaN)
        df[col] = df[col].astype("Int64")

    logger.info(f"Cleaned data: {len(df):,} rows remaining")
    return df


# ============================================================================
# STEP 3: LOAD — Write to SQLite
# ============================================================================


def write_to_database(df: pd.DataFrame) -> int:
    """
    Writes the cleaned DataFrame to the SQLite 'transactions' table.

    We validate EVERY row against our Pydantic schema before inserting.
    This is our final safety net — if bad data somehow got through cleaning,
    Pydantic catches it here.

    Args:
        df: Cleaned DataFrame

    Returns:
        Number of rows successfully inserted
    """
    # Convert DataFrame to a list of dictionaries (one dictionary = one row)
    records = df.to_dict(orient="records")

    # Validate each row using our Pydantic schema
    valid_records = []
    for i, record in enumerate(records):
        try:
            # Replace pandas NaN with Python None (Pydantic expects None, not NaN)
            clean_record = {k: (None if pd.isna(v) else v) for k, v in record.items()}

            # TransactionCreate validates: amount > 0? balances >= 0? etc.
            validated = TransactionCreate(**clean_record)

            # Convert Pydantic model to plain dictionary for database insertion
            valid_records.append(validated.model_dump())

        except Exception as e:
            # Log the bad row but DON'T crash the entire pipeline
            logger.warning(f"Row {i} failed validation: {e}")
            continue

    if not valid_records:
        logger.warning("No valid records to insert!")
        return 0

    # Bulk insert for speed — much faster than inserting one row at a time
    insert_df = pd.DataFrame(valid_records)
    insert_df.to_sql(
        "transactions",  # Table name
        con=engine,  # Database connection
        if_exists="append",  # Add to existing data (don't delete old rows)
        index=False,  # Don't write the DataFrame index as a column
    )

    logger.info(f"Inserted {len(valid_records):,} rows into database")
    return len(valid_records)


# ============================================================================
# ORCHESTRATOR: Run the Full Pipeline
# ============================================================================


def ingest_pipeline(
    raw_path: Optional[str | Path] = None, max_rows: Optional[int] = None
) -> dict:
    """
    Runs the complete ETL pipeline: Extract → Validate → Clean → Load.

    This is the function you call to load PaySim data into your database.

    Args:
        raw_path: Path to CSV (defaults to settings.RAW_DATA_PATH from .env)
        max_rows: Optional limit for quick testing (e.g., 1000 for a smoke test)

    Returns:
        Dictionary with statistics about the ingestion
    """
    # Use the path from .env if none provided
    raw_path = raw_path or settings.RAW_DATA_PATH

    # Step 0: Make sure the database table exists
    init_database()

    # Step 1: Extract
    df = load_raw_csv(raw_path)

    # Optional: limit rows for quick testing
    if max_rows:
        df = df.head(max_rows)
        logger.info(f"Limited to first {max_rows:,} rows for testing")

    # Step 2: Transform (Validate + Clean)
    validate_schema(df)
    df = clean_data(df)

    # Step 3: Load
    # We wrap the database write in a session so we can rollback on error
    db = SessionLocal()
    try:
        count = write_to_database(df)
        db.commit()  # Permanently save to disk
        logger.info("Ingestion committed successfully.")

        return {
            "status": "success",
            "rows_loaded": len(df),
            "rows_inserted": count,
            "file": str(raw_path),
        }

    except Exception as e:
        db.rollback()  # Undo everything if something went wrong
        logger.error(f"Ingestion failed. All changes rolled back. Error: {e}")
        raise

    finally:
        db.close()  # ALWAYS close the connection, even if there was an error


# ============================================================================
# RUN DIRECTLY: For manual testing
# ============================================================================

if __name__ == "__main__":
    """
    When you run:  python src/data_ingest.py
    This block executes. It runs the pipeline with default settings.

    Use max_rows=1000 for a quick test before processing all 6.3M rows.
    """
    result = ingest_pipeline(max_rows=1000)
    print(f"\n{'='*50}")
    print(f"INGESTION COMPLETE")
    print(f"{'='*50}")
    for key, value in result.items():
        print(f"  {key}: {value}")
