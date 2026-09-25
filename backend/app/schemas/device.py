from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.device import DeviceType, DeviceStatus

class DeviceBase(BaseModel):
    name: str
    host: str
    device_type: DeviceType
    port: Optional[int] = 8728
    username: Optional[str] = None
    snmp_community: Optional[str] = None
    snmp_version: Optional[str] = None
    poll_interval: Optional[int] = 30
    is_enabled: Optional[bool] = True
    group: Optional[str] = None
    location: Optional[str] = None

class DeviceCreate(DeviceBase):
    password: Optional[str] = None

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    snmp_community: Optional[str] = None
    snmp_version: Optional[str] = None
    poll_interval: Optional[int] = None
    is_enabled: Optional[bool] = None
    group: Optional[str] = None
    location: Optional[str] = None

class DeviceResponse(DeviceBase):
    id: int
    status: DeviceStatus
    last_seen: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class DeviceTestResult(BaseModel):
    success: bool
    message: str
    details: Optional[dict] = None
