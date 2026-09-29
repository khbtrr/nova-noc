from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class SyslogResponse(BaseModel):
    id: int
    device_id: Optional[int] = None
    device_name: Optional[str] = None
    host: str
    facility: str
    severity: str
    topic: Optional[str] = None
    message: str
    timestamp: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class SyslogStatsResponse(BaseModel):
    total: int = 0
    emergency: int = 0
    critical: int = 0
    error: int = 0
    warning: int = 0
    notice: int = 0
    info: int = 0
    debug: int = 0

class PaginatedSyslogResponse(BaseModel):
    items: List[SyslogResponse]
    total: int
    page: int
    limit: int
    pages: int
