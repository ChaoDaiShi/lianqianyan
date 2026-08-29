from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.time import utc_now
from app.domain.models import Base


class AccountPreference(Base):
    __tablename__ = "account_preferences"

    account_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    theme: Mapped[str] = mapped_column(String(12), default="system")
    selected_llm_profile_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    selected_tts_profile_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)


class ModelProfile(Base):
    __tablename__ = "model_profiles"
    __table_args__ = (
        UniqueConstraint("account_id", "name", name="uq_model_profile_account_name"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    account_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(80))
    kind: Mapped[str] = mapped_column(String(12), index=True)
    provider: Mapped[str] = mapped_column(String(32))
    base_url: Mapped[str] = mapped_column(String(500))
    model: Mapped[str | None] = mapped_column(String(160), nullable=True)
    voice: Mapped[str | None] = mapped_column(String(120), nullable=True)
    api_key_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)
