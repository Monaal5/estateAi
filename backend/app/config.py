import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODELS = [m.strip() for m in os.getenv("GEMINI_MODELS", "gemini-2.5-flash").split(",") if m.strip()]
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/estate_ai")
POLICY = {"lender": "Apex Commercial Lending", "minDscr": 1.25, "maxLtv": 75}
