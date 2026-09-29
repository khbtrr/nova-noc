from datetime import datetime, timezone
from typing import List, Dict, Any
from sqlalchemy import String, DateTime, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class TopologyLayout(Base):
    __tablename__ = "topology_layouts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), default="default", unique=True, index=True)
    nodes: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    edges: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
