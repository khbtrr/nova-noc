from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Integer, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class AlertRule(Base):
    __tablename__ = "alert_rules"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    device_id: Mapped[int] = mapped_column(Integer, ForeignKey("devices.id"), nullable=True) # Null for global
    metric_name: Mapped[str] = mapped_column(String)
    condition: Mapped[str] = mapped_column(String) # gt, lt, eq
    warning_threshold: Mapped[float] = mapped_column(Float)
    critical_threshold: Mapped[float] = mapped_column(Float)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
