export type HealthStatus = 'NORMAL' | 'WATCH' | 'WARNING' | 'CRITICAL';
export type AdvisoryType = 'REROUTE' | 'LOOP_HOLD' | 'SPEED_PROFILE' | 'NO_OPTION';
export type AdvisoryStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type TrainType = 'EXPRESS' | 'FREIGHT' | 'MEMU';

export interface TelemetryPoint {
  timestamp: number;
  asset_id: string;
  metric_name: string;
  value: number;
  unit: string;
  status: HealthStatus;
}

export interface TrendAnalysis {
  slope: number;
  projected_critical_time: number | null;
  time_to_threshold_sec: number | null;
  variance: number;
  risk_score: number;
  status: HealthStatus;
}

export interface MaintenanceTicket {
  ticket_id: string;
  asset_id: string;
  block_id: string;
  predicted_failure_window_sec: number;
  recommended_action: string;
  severity: HealthStatus;
  created_at: number;
}

export interface RiskSignal {
  signal_id: string;
  asset_id: string;
  block_id: string;
  risk_score: number;
  predicted_failure_in_sec: number;
  recommended_speed_restriction_kmph: number;
  timestamp: number;
  emitted_at_ns: number;
}

export interface SpeedProfilePoint {
  time_sec: number;
  position_km: number;
  recommended_speed_kmph: number;
  baseline_speed_kmph: number;
}

export interface Advisory {
  id: string;
  type: AdvisoryType;
  train_id: string;
  issued_at: number;
  reasoning: string[];
  payload: Record<string, any>;
  status: AdvisoryStatus;
  approved_by?: string | null;
  decided_at?: number | null;
}

export interface Train {
  id: string;
  name: string;
  type: TrainType;
  tonnage: number;
  current_block: string;
  position_km: number;
  speed_kmph: number;
  max_speed_kmph: number;
  priority: number;
  route: string[];
  target_station: string;
  status_text: string;
  color: string;
}

export interface Block {
  id: string;
  name: string;
  from_station: string;
  to_station: string;
  length_km: number;
  max_speed_kmph: number;
  assets: string[];
  status: HealthStatus;
  is_alternate: boolean;
}

export interface Station {
  code: string;
  name: string;
  x: number;
  y: number;
}

export interface LoopLine {
  id: string;
  station_code: string;
  capacity: number;
  occupied: boolean;
  occupied_by?: string | null;
}

export interface KpiMetrics {
  manual_escalation_baseline_sec: number;
  railguard_response_time_sec: number;
  agent_handoff_latency_ms: number;
  total_energy_saved_kwh: number;
  trains_protected_count: number;
}

export interface LogEntry {
  timestamp: number;
  source: string;
  message: string;
  level: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
}

export interface SystemState {
  type: string;
  timestamp: number;
  stations: Record<string, Station>;
  blocks: Record<string, Block>;
  loop_lines: Record<string, LoopLine>;
  trains: Record<string, Train>;
  telemetry: {
    history: Record<string, TelemetryPoint[]>;
    latest: Record<string, TelemetryPoint | null>;
    trends: Record<string, TrendAnalysis | null>;
  };
  advisories: Advisory[];
  tickets: MaintenanceTicket[];
  logs: LogEntry[];
  kpi: KpiMetrics;
  sim_speed: number;
  active_faults: Record<string, boolean>;
  alternate_route_available: boolean;
}

