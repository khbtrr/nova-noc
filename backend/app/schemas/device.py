from pydantic import BaseModel, model_validator
from typing import Optional, Any
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
    device_type: Optional[DeviceType] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    snmp_community: Optional[str] = None
    snmp_version: Optional[str] = None
    poll_interval: Optional[int] = None
    is_enabled: Optional[bool] = None
    group: Optional[str] = None
    location: Optional[str] = None
    is_snoozed: Optional[bool] = None
    snooze_until: Optional[datetime] = None
    snooze_reason: Optional[str] = None

class DeviceSnoozeRequest(BaseModel):
    duration_minutes: Optional[int] = None
    until: Optional[datetime] = None
    reason: Optional[str] = None

class DeviceTestRequest(BaseModel):
    host: str
    port: Optional[int] = None
    device_type: Optional[DeviceType] = DeviceType.MIKROTIK
    snmp_community: Optional[str] = None
    snmp_version: Optional[str] = None

class DeviceResponse(BaseModel):
    id: int
    name: str
    host: str
    device_type: DeviceType
    port: Optional[int] = 8728
    username: Optional[str] = None
    snmp_version: Optional[str] = None
    has_snmp_community: bool = False
    has_password: bool = False
    poll_interval: Optional[int] = 30
    is_enabled: Optional[bool] = True
    group: Optional[str] = None
    location: Optional[str] = None
    status: DeviceStatus
    last_seen: Optional[datetime] = None
    is_snoozed: bool = False
    snooze_until: Optional[datetime] = None
    snooze_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def mask_credentials(cls, data: Any) -> Any:
        if hasattr(data, "__dict__"):
            return {
                "id": data.id,
                "name": data.name,
                "host": data.host,
                "device_type": data.device_type,
                "port": data.port,
                "username": data.username,
                "snmp_version": data.snmp_version,
                "has_snmp_community": bool(getattr(data, "snmp_community", None)),
                "has_password": bool(getattr(data, "password", None)),
                "poll_interval": data.poll_interval,
                "is_enabled": data.is_enabled,
                "group": data.group,
                "location": data.location,
                "status": data.status,
                "last_seen": data.last_seen,
                "is_snoozed": bool(getattr(data, "is_snoozed", False)),
                "snooze_until": getattr(data, "snooze_until", None),
                "snooze_reason": getattr(data, "snooze_reason", None),
                "created_at": data.created_at,
                "updated_at": data.updated_at,
            }
        return data

    class Config:
        from_attributes = True

class DeviceTestResult(BaseModel):
    success: bool
    message: str
    details: Optional[dict] = None
