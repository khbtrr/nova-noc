import enum
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class RemediationActionType(str, enum.Enum):
    FLUSH_DNS = "FLUSH_DNS"
    RESTART_INTERFACE = "RESTART_INTERFACE"
    RUN_DIAGNOSTICS = "RUN_DIAGNOSTICS"
    ACKNOWLEDGE = "ACKNOWLEDGE"

class RemediationChannel(str, enum.Enum):
    TELEGRAM = "TELEGRAM"
    DASHBOARD = "DASHBOARD"

class RemediationStatus(str, enum.Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    PENDING = "PENDING"

class RemediationLog(Base):
    __tablename__ = "remediation_logs"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    device_id: Mapped[int] = mapped_column(Integer, ForeignKey("devices.id"))
    action_type: Mapped[RemediationActionType] = mapped_column()
    target: Mapped[str] = mapped_column(String, default="global")
    trigger_channel: Mapped[RemediationChannel] = mapped_column()
    executed_by: Mapped[str] = mapped_column(String, default="system")
    status: Mapped[RemediationStatus] = mapped_column()
    output_details: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
