import time
import random
from typing import Dict, List, Optional, Callable
from .models import (
    Station, Block, LoopLine, Train, TelemetryPoint, HealthStatus,
    Advisory, MaintenanceTicket, KpiMetrics, LogEntry
)
from .network import (
    get_initial_stations, get_initial_blocks, get_initial_loop_lines,
    get_initial_trains, ASSET_CONFIG
)


class Simulator:
    def __init__(self):
        self.stations: Dict[str, Station] = get_initial_stations()
        self.blocks: Dict[str, Block] = get_initial_blocks()
        self.loop_lines: Dict[str, LoopLine] = get_initial_loop_lines()
        self.trains: Dict[str, Train] = get_initial_trains()
        
        # Telemetry history: 60 rolling points per asset
        self.telemetry_history: Dict[str, List[TelemetryPoint]] = {
            asset_id: [] for asset_id in ASSET_CONFIG
        }
        
        # Current asset values
        self.asset_values: Dict[str, float] = {
            asset_id: cfg["nominal"] for asset_id, cfg in ASSET_CONFIG.items()
        }
        
        # Fault injection flags
        self.active_faults: Dict[str, bool] = {
            asset_id: False for asset_id in ASSET_CONFIG
        }
        self.alternate_route_available: bool = True
        
        # Advisories, tickets, logs, KPI
        self.advisories: List[Advisory] = []
        self.tickets: List[MaintenanceTicket] = []
        self.logs: List[LogEntry] = []
        self.kpi: KpiMetrics = KpiMetrics()
        
        # Simulation parameters
        self.sim_speed: float = 1.0  # 1x, 5x, 20x
        self.is_running: bool = True
        self.sim_time: float = 0.0
        
        # Hooks for agents
        self.on_telemetry_tick: Optional[Callable[[Dict[str, List[TelemetryPoint]]], None]] = None
        
        # Pre-populate history with 30 nominal samples so rolling window has baseline data
        self._seed_initial_telemetry()
        self.add_log("[SYSTEM]", "Simulator initialized with Kurnool-Guntakal-Dhone network.", "INFO")

    def _seed_initial_telemetry(self):
        base_time = time.time() - 30.0
        for i in range(30):
            t = base_time + i
            for asset_id, cfg in ASSET_CONFIG.items():
                noise = (random.random() - 0.5) * 2 * cfg["noise_amp"]
                val = max(0.01, cfg["nominal"] + noise)
                self.telemetry_history[asset_id].append(
                    TelemetryPoint(
                        timestamp=t,
                        asset_id=asset_id,
                        metric_name=cfg["metric_name"],
                        value=round(val, 3),
                        unit=cfg["unit"],
                        status=HealthStatus.NORMAL,
                    )
                )

    def add_log(self, source: str, message: str, level: str = "INFO"):
        entry = LogEntry(timestamp=time.time(), source=source, message=message, level=level)
        self.logs.append(entry)
        if len(self.logs) > 200:
            self.logs.pop(0)

    def set_sim_speed(self, speed: float):
        self.sim_speed = max(1.0, min(20.0, speed))
        self.add_log("[SYSTEM]", f"Simulation clock speed set to {int(self.sim_speed)}x", "INFO")

    def inject_fault(self, fault_type: str):
        if fault_type == "track_geo":
            self.active_faults["TRACK-B2-GEO"] = True
            self.add_log("[SYSTEM]", "Injected Track Geometry Fault on Block B2.", "WARNING")
        elif fault_type == "wheel_vib":
            self.active_faults["WHEEL-12045"] = True
            self.add_log("[SYSTEM]", "Injected Wheel Vibration Fault on Train 12045 / Block B1.", "WARNING")
        elif fault_type == "ohe_no_alt":
            self.active_faults["OHE-B2"] = True
            self.alternate_route_available = False
            self.add_log("[SYSTEM]", "Injected OHE Fault on B2 (Alternate route A1-A3 unavailable).", "WARNING")

    def toggle_loop(self, loop_id: str = "LOOP-DHN"):
        if loop_id in self.loop_lines:
            loop = self.loop_lines[loop_id]
            loop.occupied = not loop.occupied
            if loop.occupied:
                loop.occupied_by = "BOXN-8821"
                self.add_log("[SYSTEM]", f"{loop_id} set to OCCUPIED (Freight BOXN-8821 stabled).", "INFO")
            else:
                loop.occupied_by = None
                self.add_log("[SYSTEM]", f"{loop_id} set to FREE.", "SUCCESS")

    def reset(self):
        self.stations = get_initial_stations()
        self.blocks = get_initial_blocks()
        self.loop_lines = get_initial_loop_lines()
        self.trains = get_initial_trains()
        self.active_faults = {asset_id: False for asset_id in ASSET_CONFIG}
        self.asset_values = {asset_id: cfg["nominal"] for asset_id, cfg in ASSET_CONFIG.items()}
        self.alternate_route_available = True
        self.advisories.clear()
        self.tickets.clear()
        self.kpi = KpiMetrics()
        self.telemetry_history = {asset_id: [] for asset_id in ASSET_CONFIG}
        self._seed_initial_telemetry()
        self.add_log("[SYSTEM]", "Simulation reset to pristine initial state.", "INFO")

    def tick(self, dt: float = 1.0):
        effective_dt = dt * self.sim_speed
        now = time.time()

        # 1. Update Asset Telemetry
        for asset_id, cfg in ASSET_CONFIG.items():
            if self.active_faults[asset_id]:
                # Degrade continuously
                step = cfg["fault_step"] * self.sim_speed
                noise = (random.random() - 0.5) * cfg["noise_amp"]
                self.asset_values[asset_id] += step + noise
            else:
                # Nominal fluctuation
                noise = (random.random() - 0.5) * 2 * cfg["noise_amp"]
                self.asset_values[asset_id] = max(0.05, cfg["nominal"] + noise)

            val = round(self.asset_values[asset_id], 3)
            
            # Determine health status
            status = HealthStatus.NORMAL
            if val >= cfg["critical_threshold"]:
                status = HealthStatus.CRITICAL
            elif val >= cfg["warning_threshold"]:
                status = HealthStatus.WARNING
            elif val >= cfg["warning_threshold"] * 0.75:
                status = HealthStatus.WATCH

            point = TelemetryPoint(
                timestamp=now,
                asset_id=asset_id,
                metric_name=cfg["metric_name"],
                value=val,
                unit=cfg["unit"],
                status=status,
            )
            history = self.telemetry_history[asset_id]
            history.append(point)
            if len(history) > 60:
                history.pop(0)

            # Update associated block health
            block_id = cfg["block_id"]
            if block_id in self.blocks:
                # Set block status to worst of its assets
                if status == HealthStatus.CRITICAL:
                    self.blocks[block_id].status = HealthStatus.CRITICAL
                elif status == HealthStatus.WARNING and self.blocks[block_id].status != HealthStatus.CRITICAL:
                    self.blocks[block_id].status = HealthStatus.WARNING
                elif status == HealthStatus.NORMAL and not self.active_faults[asset_id]:
                    self.blocks[block_id].status = HealthStatus.NORMAL

        # 2. Update Moving Trains
        for train_id, train in self.trains.items():
            if train.speed_kmph <= 0:
                continue

            current_block_id = train.current_block
            if current_block_id not in self.blocks:
                continue

            current_block = self.blocks[current_block_id]
            distance_travelled = (train.speed_kmph / 3600.0) * effective_dt
            train.position_km += distance_travelled

            # Check block transition
            if train.position_km >= current_block.length_km:
                try:
                    curr_idx = train.route.index(current_block_id)
                    if curr_idx + 1 < len(train.route):
                        next_block_id = train.route[curr_idx + 1]
                        train.current_block = next_block_id
                        train.position_km = 0.0
                        train.status_text = f"Entered {next_block_id} ({self.blocks[next_block_id].name})"
                    else:
                        # Reached destination, loop back to start of route for demo continuity
                        train.current_block = train.route[0]
                        train.position_km = 0.0
                        train.status_text = f"Turnaround at {train.target_station} — Restarting {train.route[0]}"
                except ValueError:
                    # Current block not in route, wrap around
                    train.position_km = 0.0

        # 3. Call Agent 1 callback if registered
        if self.on_telemetry_tick:
            self.on_telemetry_tick(self.telemetry_history)

