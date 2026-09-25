import enum
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class DeviceType(str, enum.Enum):
    MIKROTIK = "MIKROTIK"
    SNMP = "SNMP"

class DeviceStatus(str, enum.Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"

class Device(Base):
    __tablename__ = "devices"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, index=True)
    host: Mapped[str] = mapped_column(String)
    device_type: Mapped[DeviceType] = mapped_column()
    port: Mapped[int] = mapped_column(Integer, default=8728)
    username: Mapped[str] = mapped_column(String, nullable=True)
    password: Mapped[str] = mapped_column(String, nullable=True)
    snmp_community: Mapped[str] = mapped_column(String, nullable=True)
    snmp_version: Mapped[str] = mapped_column(String, nullable=True)
    poll_interval: Mapped[int] = mapped_column(Integer, default=30)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    group: Mapped[str] = mapped_column(String, nullable=True)
    location: Mapped[str] = mapped_column(String, nullable=True)
    status: Mapped[DeviceStatus] = mapped_column(default=DeviceStatus.OFFLINE)
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
