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
    latency_ms: Optional[float] = None
    packet_loss: Optional[float] = None
    wan_latency_ms: Optional[float] = None
    wan_packet_loss: Optional[float] = None
    min_rtt_ms: Optional[float] = None
    max_rtt_ms: Optional[float] = None
    
    # Dual-WAN Telemetry
    jlm_latency_ms: Optional[float] = None
    jlm_packet_loss: Optional[float] = None
    jlm_rx_mbps: Optional[float] = None
    jlm_tx_mbps: Optional[float] = None
    jlm_status: Optional[str] = "UP"
    
    ion_latency_ms: Optional[float] = None
    ion_packet_loss: Optional[float] = None
    ion_rx_mbps: Optional[float] = None
    ion_tx_mbps: Optional[float] = None
    ion_status: Optional[str] = "UP"
    
class MetricsHistory(BaseModel):
    device_id: int
    timestamps: List[str]
    cpu: List[float]
    memory: List[float]
    rx: Optional[List[float]] = []
    tx: Optional[List[float]] = []
    latency: Optional[List[float]] = []
    packet_loss: Optional[List[float]] = []
    wan_latency: Optional[List[float]] = []
    wan_packet_loss: Optional[List[float]] = []
    jlm_latency: Optional[List[float]] = []
    jlm_packet_loss: Optional[List[float]] = []
    ion_latency: Optional[List[float]] = []
    ion_packet_loss: Optional[List[float]] = []
