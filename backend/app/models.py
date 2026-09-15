from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import time


class HealthStatus(str, Enum):
    NORMAL = "NORMAL"
    WATCH = "WATCH"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class AdvisoryType(str, Enum):
    REROUTE = "REROUTE"
    LOOP_HOLD = "LOOP_HOLD"
    SPEED_PROFILE = "SPEED_PROFILE"
    NO_OPTION = "NO_OPTION"


class AdvisoryStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class TrainType(str, Enum):
    EXPRESS = "EXPRESS"
    FREIGHT = "FREIGHT"
    MEMU = "MEMU"


class TelemetryPoint(BaseModel):
    timestamp: float
    asset_id: str
    metric_name: str
    value: float
    unit: str
    status: HealthStatus = HealthStatus.NORMAL


class TrendAnalysis(BaseModel):
    slope: float
    projected_critical_time: Optional[float] = None
    time_to_threshold_sec: Optional[float] = None
    variance: float = 0.0
    risk_score: float = 0.0  # 0 to 100
    status: HealthStatus = HealthStatus.NORMAL


class MaintenanceTicket(BaseModel):
    ticket_id: str
    asset_id: str
    block_id: str
    predicted_failure_window_sec: float
    recommended_action: str
    severity: HealthStatus
    created_at: float = Field(default_factory=time.time)


class RiskSignal(BaseModel):
    signal_id: str
    asset_id: str
    block_id: str
    risk_score: float
    predicted_failure_in_sec: float
    recommended_speed_restriction_kmph: float
    timestamp: float = Field(default_factory=time.time)
    emitted_at_ns: int = 0


class SpeedProfilePoint(BaseModel):
    time_sec: float
    position_km: float
    recommended_speed_kmph: float
    baseline_speed_kmph: float


class Advisory(BaseModel):
    id: str
    type: AdvisoryType
    train_id: str
    issued_at: float = Field(default_factory=time.time)
    reasoning: List[str]
    payload: Dict[str, Any]
    status: AdvisoryStatus = AdvisoryStatus.PENDING
    approved_by: Optional[str] = None
    decided_at: Optional[float] = None


class Train(BaseModel):
    id: str
    name: str
    type: TrainType
    tonnage: float
    current_block: str
    position_km: float
    speed_kmph: float
    max_speed_kmph: float
    priority: int  # 1 is highest
    route: List[str]  # list of block IDs
    target_station: str
    status_text: str = "Nominal run"
    color: str = "#22D3A7"


class Block(BaseModel):
    id: str
    name: str
    from_station: str
    to_station: str
    length_km: float
    max_speed_kmph: float
    assets: List[str]
    status: HealthStatus = HealthStatus.NORMAL
    is_alternate: bool = False


class Station(BaseModel):
    code: str
    name: str
    x: float
    y: float


class LoopLine(BaseModel):
    id: str
    station_code: str
    capacity: int = 1
    occupied: bool = False
    occupied_by: Optional[str] = None


class KpiMetrics(BaseModel):
    manual_escalation_baseline_sec: float = 3300.0  # ~55 min
    railguard_response_time_sec: float = 1.4
    agent_handoff_latency_ms: float = 0.0
    total_energy_saved_kwh: float = 0.0
    trains_protected_count: int = 0


class LogEntry(BaseModel):
    timestamp: float = Field(default_factory=time.time)
    source: str  # [AGENT-1], [AGENT-2], [CONTROLLER], [SYSTEM]
    message: str
    level: str = "INFO"  # INFO, WARNING, CRITICAL, SUCCESS


class ScenarioPayload(BaseModel):
    fault_type: Optional[str] = None
    loop_id: Optional[str] = "LOOP-DHN"
    speed: Optional[float] = None


ScenarioPayload.model_rebuild()
Advisory.model_rebuild()
Train.model_rebuild()
Block.model_rebuild()
Station.model_rebuild()
LoopLine.model_rebuild()
KpiMetrics.model_rebuild()
TelemetryPoint.model_rebuild()
TrendAnalysis.model_rebuild()
MaintenanceTicket.model_rebuild()
RiskSignal.model_rebuild()
