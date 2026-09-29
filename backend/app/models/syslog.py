from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class SyslogMessage(Base):
    __tablename__ = "syslog_messages"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    device_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("devices.id", ondelete="SET NULL"), nullable=True, index=True)
    host: Mapped[str] = mapped_column(String, index=True)
    facility: Mapped[str] = mapped_column(String, default="daemon")
    severity: Mapped[str] = mapped_column(String, index=True, default="INFO")
    topic: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    message: Mapped[str] = mapped_column(Text)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, default=lambda: datetime.now(timezone.utc))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
