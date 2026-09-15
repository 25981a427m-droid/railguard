import time
import math
import uuid
from typing import List, Dict, Optional, Tuple, Callable
from .models import (
    TelemetryPoint, TrendAnalysis, HealthStatus,
    MaintenanceTicket, RiskSignal
)
from .network import ASSET_CONFIG


class AssetHealthAgent:
    """
    Agent 1: Asset Health & Predictive Maintenance Agent.
    Maintains a rolling 60-sample window per asset, fits a linear regression trend,
    extrapolates time-to-threshold, and fires RiskSignal & MaintenanceTicket
    the moment the trend indicates an impending breach BEFORE reaching Critical.
    """

    def __init__(self, on_risk_signal: Optional[Callable[[RiskSignal], None]] = None,
                 on_ticket_generated: Optional[Callable[[MaintenanceTicket], None]] = None):
        self.on_risk_signal = on_risk_signal
        self.on_ticket_generated = on_ticket_generated
        
        # State tracking per asset
        self.asset_states: Dict[str, HealthStatus] = {
            asset_id: HealthStatus.NORMAL for asset_id in ASSET_CONFIG
        }
        self.last_signal_time: Dict[str, float] = {
            asset_id: 0.0 for asset_id in ASSET_CONFIG
        }
        self.trend_analyses: Dict[str, TrendAnalysis] = {}

    @staticmethod
    def calculate_trend(samples: List[TelemetryPoint], critical_thresh: float, warning_thresh: float) -> TrendAnalysis:
        """
        Calculates least-squares linear regression over the telemetry sample window.
        Returns TrendAnalysis with slope, time_to_threshold, variance, and risk_score.
        """
        n = len(samples)
        if n < 2:
            current_val = samples[-1].value if n == 1 else 0.0
            return TrendAnalysis(
                slope=0.0,
                projected_critical_time=None,
                time_to_threshold_sec=None,
                variance=0.0,
                risk_score=min(100.0, (current_val / critical_thresh) * 50.0),
                status=HealthStatus.NORMAL,
            )

        t0 = samples[0].timestamp
        t_vals = [s.timestamp - t0 for s in samples]
        y_vals = [s.value for s in samples]

        mean_t = sum(t_vals) / n
        mean_y = sum(y_vals) / n

        # Least squares regression: slope = Cov(t, y) / Var(t)
        numerator = sum((t_vals[i] - mean_t) * (y_vals[i] - mean_y) for i in range(n))
        denominator = sum((t_vals[i] - mean_t) ** 2 for i in range(n))

        slope = numerator / denominator if denominator > 1e-9 else 0.0
        variance = sum((y - mean_y) ** 2 for y in y_vals) / n

        current_val = y_vals[-1]
        now = samples[-1].timestamp

        # Time to threshold extrapolation
        time_to_threshold: Optional[float] = None
        projected_critical_time: Optional[float] = None

        if current_val >= critical_thresh:
            time_to_threshold = 0.0
            projected_critical_time = now
        elif slope > 0.0001:
            remaining_val = critical_thresh - current_val
            time_to_threshold = round(remaining_val / slope, 1)
            projected_critical_time = now + time_to_threshold

        # Risk score synthesis (0 to 100)
        # Value component (up to 50 pts)
        val_ratio = min(1.2, current_val / critical_thresh)
        val_score = val_ratio * 45.0

        # Trend/Slope component (up to 40 pts)
        # Reference slope: reaching critical from nominal in 100 sec
        ref_slope = (critical_thresh - warning_thresh) / 40.0
        slope_score = min(40.0, max(0.0, (slope / ref_slope) * 40.0)) if ref_slope > 0 else 0.0

        # Variance component (up to 15 pts)
        var_score = min(15.0, math.sqrt(variance) * 5.0)

        risk_score = min(100.0, round(val_score + slope_score + var_score, 1))

        # State evaluation
        # Alert fires on trend before touching the red line!
        status = HealthStatus.NORMAL
        if current_val >= critical_thresh or (time_to_threshold is not None and time_to_threshold <= 20):
            status = HealthStatus.CRITICAL
        elif current_val >= warning_thresh or (time_to_threshold is not None and time_to_threshold <= 120) or risk_score >= 55.0:
            status = HealthStatus.WARNING
        elif current_val >= warning_thresh * 0.75 or risk_score >= 30.0:
            status = HealthStatus.WATCH

        return TrendAnalysis(
            slope=round(slope, 5),
            projected_critical_time=projected_critical_time,
            time_to_threshold_sec=time_to_threshold,
            variance=round(variance, 4),
            risk_score=risk_score,
            status=status,
        )

    def evaluate_telemetry(self, asset_id: str, history: List[TelemetryPoint]) -> Tuple[TrendAnalysis, Optional[RiskSignal], Optional[MaintenanceTicket]]:
        """
        Evaluates the rolling history for an asset. If status transitions to WARNING or CRITICAL
        (or sustains a high risk alert), emits both a RiskSignal and a MaintenanceTicket in the same tick.
        """
        cfg = ASSET_CONFIG[asset_id]
        trend = self.calculate_trend(history, cfg["critical_threshold"], cfg["warning_threshold"])
        self.trend_analyses[asset_id] = trend

        old_state = self.asset_states[asset_id]
        new_state = trend.status
        self.asset_states[asset_id] = new_state

        risk_signal: Optional[RiskSignal] = None
        ticket: Optional[MaintenanceTicket] = None
        now = time.time()

        # Emit when entering WARNING or CRITICAL, or periodically every 15s if persisting in WARNING/CRITICAL
        should_emit = (
            (new_state in [HealthStatus.WARNING, HealthStatus.CRITICAL] and old_state not in [HealthStatus.WARNING, HealthStatus.CRITICAL])
            or (new_state in [HealthStatus.WARNING, HealthStatus.CRITICAL] and (now - self.last_signal_time[asset_id] >= 15.0))
        )

        if should_emit:
            self.last_signal_time[asset_id] = now
            failure_window = trend.time_to_threshold_sec if trend.time_to_threshold_sec is not None else 60.0

            # 1. Maintenance Ticket
            action_map = {
                "TRACK-B2-GEO": "Emergency track tamp & alignment on Block B2 (GTL-DHN). Dispatch track machine.",
                "WHEEL-12045": "Direct train to Guntakal Trip Shed for ultrasonic axle inspection & wheel profiling.",
                "OHE-B2": "Dispatch OHE tower wagon to Section B2. Inspect contact wire sag & dropper tension.",
                "SIG-DHN-A": "Replace QN1 relay at Dhone Interlocking Cabin A. Perform fail-safe continuity test.",
            }
            ticket = MaintenanceTicket(
                ticket_id=f"TKT-{uuid.uuid4().hex[:6].upper()}",
                asset_id=asset_id,
                block_id=cfg["block_id"],
                predicted_failure_window_sec=failure_window,
                recommended_action=action_map.get(asset_id, "Inspect and service asset immediately."),
                severity=new_state,
                created_at=now,
            )

            # 2. Risk Signal to Agent 2
            speed_restriction = 45.0 if new_state == HealthStatus.WARNING else 25.0
            risk_signal = RiskSignal(
                signal_id=f"SIG-{uuid.uuid4().hex[:6].upper()}",
                asset_id=asset_id,
                block_id=cfg["block_id"],
                risk_score=trend.risk_score,
                predicted_failure_in_sec=failure_window,
                recommended_speed_restriction_kmph=speed_restriction,
                timestamp=now,
                emitted_at_ns=time.perf_counter_ns(),
            )

            # Invoke callbacks if registered
            if self.on_ticket_generated and ticket:
                self.on_ticket_generated(ticket)
            if self.on_risk_signal and risk_signal:
                self.on_risk_signal(risk_signal)

        return trend, risk_signal, ticket

