import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODELS = [m.strip() for m in os.getenv("GEMINI_MODELS", "gemini-2.5-flash").split(",") if m.strip()]

raw_db_url = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/estate_ai")
if raw_db_url.startswith("postgres://"):
    DATABASE_URL = raw_db_url.replace("postgres://", "postgresql+psycopg://", 1)
elif raw_db_url.startswith("postgresql://") and not raw_db_url.startswith("postgresql+psycopg://"):
    DATABASE_URL = raw_db_url.replace("postgresql://", "postgresql+psycopg://", 1)
else:
    DATABASE_URL = raw_db_url

POLICY = {"lender": "Apex Commercial Lending", "minDscr": 1.25, "maxLtv": 75}
