import time
import pytest
from backend.app.models import TelemetryPoint, HealthStatus
from backend.app.agent1_asset import AssetHealthAgent


def test_nominal_telemetry_trend():
    now = time.time()
    # 20 samples around nominal 2.1 mm with tiny noise
    samples = [
        TelemetryPoint(
            timestamp=now - (20 - i),
            asset_id="TRACK-B2-GEO",
            metric_name="Track geometry deviation",
            value=2.1 + (0.02 if i % 2 == 0 else -0.02),
            unit="mm",
            status=HealthStatus.NORMAL,
        )
        for i in range(20)
    ]

    trend = AssetHealthAgent.calculate_trend(samples, critical_thresh=7.0, warning_thresh=4.0)
    assert abs(trend.slope) < 0.01
    assert trend.status == HealthStatus.NORMAL
    assert trend.risk_score < 30.0


def test_trend_extrapolation_math():
    now = time.time()
    # Linear ramp: 0.05 mm increase per second
    # After 30 seconds, reaches 3.5 mm from 2.0 mm
    samples = [
        TelemetryPoint(
            timestamp=now - (30 - i),
            asset_id="TRACK-B2-GEO",
            metric_name="Track geometry deviation",
            value=round(2.0 + 0.05 * i, 3),
            unit="mm",
            status=HealthStatus.NORMAL,
        )
        for i in range(30)
    ]

    trend = AssetHealthAgent.calculate_trend(samples, critical_thresh=7.0, warning_thresh=4.0)
    # Expected slope is ~0.05 mm/s
    assert pytest.approx(trend.slope, 0.005) == 0.05
    # Current value is 2.0 + 0.05 * 29 = 3.45 mm
    # Remaining to 7.0 mm is 3.55 mm -> time_to_threshold ~ 3.55 / 0.05 = 71 seconds
    assert trend.time_to_threshold_sec is not None
    assert 65.0 <= trend.time_to_threshold_sec <= 75.0


def test_alert_fires_before_critical_threshold():
    """
    Key demo differentiator:
    At ~5.2 mm (well below the 7.0 mm red line), Agent 1 must flip to WARNING
    and simultaneously emit a RiskSignal and MaintenanceTicket.
    """
    emitted_signals = []
    emitted_tickets = []

    agent = AssetHealthAgent(
        on_risk_signal=lambda sig: emitted_signals.append(sig),
        on_ticket_generated=lambda tkt: emitted_tickets.append(tkt),
    )

    now = time.time()
    # Telemetry climbing from 3.5 mm to 5.2 mm over 40 seconds (~0.0425 mm/s)
    history = [
        TelemetryPoint(
            timestamp=now - (40 - i),
            asset_id="TRACK-B2-GEO",
            metric_name="Track geometry deviation",
            value=round(3.5 + 0.0425 * i, 3),
            unit="mm",
            status=HealthStatus.NORMAL,
        )
        for i in range(41)
    ]

    last_val = history[-1].value
    assert 5.1 <= last_val <= 5.3  # Around 5.2 mm, below 7.0 mm Critical!

    trend, signal, ticket = agent.evaluate_telemetry("TRACK-B2-GEO", history)

    # 1. Verify WARNING state is triggered on trend BEFORE reaching 7.0 mm Critical
    assert trend.status in [HealthStatus.WARNING, HealthStatus.CRITICAL]
    assert trend.risk_score >= 50.0
    assert trend.time_to_threshold_sec is not None
    # Remaining to 7.0 mm: ~1.8 mm at 0.0425 mm/s is ~42-45 seconds
    assert 30.0 <= trend.time_to_threshold_sec <= 60.0

    # 2. Verify simultaneous emission of RiskSignal and MaintenanceTicket
    assert signal is not None
    assert ticket is not None
    assert signal.asset_id == "TRACK-B2-GEO"
    assert signal.block_id == "B2"
    assert signal.recommended_speed_restriction_kmph == 45.0
    assert signal.emitted_at_ns > 0

    assert ticket.asset_id == "TRACK-B2-GEO"
    assert ticket.block_id == "B2"
    assert "track tamp" in ticket.recommended_action.lower()

    # 3. Callbacks verified
    assert len(emitted_signals) == 1
    assert len(emitted_tickets) == 1

