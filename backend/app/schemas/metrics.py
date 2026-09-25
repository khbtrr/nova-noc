from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class InterfaceStats(BaseModel):
    name: str
    type: str
    rx_bytes: int
    tx_bytes: int
    running: bool
    disabled: bool

class DHCPLease(BaseModel):
    address: str
    mac_address: str
    host_name: Optional[str]
    status: str

class RouteEntry(BaseModel):
    dst_address: str
    gateway: str
    distance: int

class MetricsResponse(BaseModel):
    device_id: int
    cpu_load: float
    memory_usage: float
    uptime: str
    interfaces: List[InterfaceStats] = []
    
class MetricsHistory(BaseModel):
    device_id: int
    timestamps: List[str]
    cpu: List[float]
    memory: List[float]
