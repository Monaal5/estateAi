from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from .config import DATABASE_URL

engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args={"connect_timeout": 5})
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
JsonType = JSON().with_variant(JSONB(), "postgresql")


def now():
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Deal(Base):
    """One AI-generated loan facility. `data` holds Gemini's fields; `metrics` is computed deterministically."""
    __tablename__ = "deals"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    data: Mapped[dict] = mapped_column(JsonType)
    metrics: Mapped[dict] = mapped_column(JsonType)
    model: Mapped[str] = mapped_column(String(64))
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class DealArtifact(Base):
    """Per-deal AI output: kind = 'underwriting' | 'memo'."""
    __tablename__ = "deal_artifacts"
    __table_args__ = (UniqueConstraint("deal_id", "kind"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    deal_id: Mapped[str] = mapped_column(ForeignKey("deals.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(32))
    data: Mapped[dict] = mapped_column(JsonType)
    model: Mapped[str] = mapped_column(String(64))
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class PortfolioArtifact(Base):
    """Portfolio-wide AI output: kind = 'audit' | 'syndication' | 'covenants'."""
    __tablename__ = "portfolio_artifacts"
    kind: Mapped[str] = mapped_column(String(32), primary_key=True)
    data: Mapped[dict] = mapped_column(JsonType)
    model: Mapped[str] = mapped_column(String(64))
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    deal_id: Mapped[str] = mapped_column(ForeignKey("deals.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(8))  # 'user' | 'ai'
    text: Mapped[str] = mapped_column(Text)
    citations: Mapped[list] = mapped_column(JsonType, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class AiCallLog(Base):
    """Audit log of every Gemini call (success or failure)."""
    __tablename__ = "ai_call_log"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    purpose: Mapped[str] = mapped_column(String(64))
    model: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ok: Mapped[bool]
    latency_ms: Mapped[int]
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class UploadedDocument(Base):
    """PDF or image document uploaded for a deal, processed by AI OCR/extraction."""
    __tablename__ = "uploaded_documents"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    deal_id: Mapped[str] = mapped_column(ForeignKey("deals.id", ondelete="CASCADE"), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    doc_type: Mapped[str] = mapped_column(String(64))  # Tax Return, Operating Statement, Rent Roll, Appraisal, etc.
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    page_count: Mapped[int] = mapped_column(Integer, default=1)
    extracted_text: Mapped[str] = mapped_column(Text)
    extracted_data: Mapped[dict] = mapped_column(JsonType, default=dict)
    model: Mapped[str | None] = mapped_column(String(64), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


def init_db():
    Base.metadata.create_all(engine)
