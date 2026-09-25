from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.alert import AlertSeverity

class AlertRuleCreate(BaseModel):
    device_id: Optional[int] = None
    metric_name: str
    condition: str
    warning_threshold: float
    critical_threshold: float
    is_enabled: Optional[bool] = True

class AlertRuleUpdate(BaseModel):
    metric_name: Optional[str] = None
    condition: Optional[str] = None
    warning_threshold: Optional[float] = None
    critical_threshold: Optional[float] = None
    is_enabled: Optional[bool] = None

class AlertRuleResponse(AlertRuleCreate):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class AlertResponse(BaseModel):
    id: int
    device_id: int
    alert_rule_id: Optional[int]
    severity: AlertSeverity
    metric_name: str
    metric_value: float
    threshold_value: Optional[float]
    message: str
    is_acknowledged: bool
    acknowledged_by: Optional[int]
    acknowledged_at: Optional[datetime]
    created_at: datetime
    resolved_at: Optional[datetime]
    
    class Config:
        from_attributes = True
