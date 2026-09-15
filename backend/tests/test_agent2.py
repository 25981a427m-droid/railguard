import time
import pytest
from backend.app.simulator import Simulator
from backend.app.models import RiskSignal, AdvisoryType, AdvisoryStatus
from backend.app.agent2_traffic import TrafficCoordinationAgent


def test_branch_a_reroute_cascade():
    sim = Simulator()
    agent2 = TrafficCoordinationAgent(simulator_ref=sim)

    # Risk signal on B2
    signal = RiskSignal(
        signal_id="SIG-TEST1",
        asset_id="TRACK-B2-GEO",
        block_id="B2",
        risk_score=75.0,
        predicted_failure_in_sec=80.0,
        recommended_speed_restriction_kmph=45.0,
        emitted_at_ns=time.perf_counter_ns() - 2_000_000,  # 2ms ago
    )

    advisories = agent2.process_risk_signal(signal)
    assert len(advisories) >= 1

    primary_adv = next(a for a in advisories if a.train_id == "12628")
    assert primary_adv.type == AdvisoryType.REROUTE
    assert primary_adv.status == AdvisoryStatus.PENDING
    assert "NDL" in primary_adv.payload["via_station"]
    assert primary_adv.payload["added_distance_km"] == 50.0
    assert len(primary_adv.reasoning) >= 5

    # Check Follower Branch C advisory was also generated
    follower_adv = next((a for a in advisories if a.train_id == "12786"), None)
    assert follower_adv is not None
    assert follower_adv.type == AdvisoryType.SPEED_PROFILE
    assert follower_adv.status == AdvisoryStatus.PENDING
    assert follower_adv.payload["energy_saved_kwh"] > 0
    assert len(follower_adv.payload["profile_curve"]) > 5


def test_branch_b_loop_hold_cascade():
    sim = Simulator()
    sim.alternate_route_available = False
    sim.loop_lines["LOOP-DHN"].occupied = False  # Set loop free
    agent2 = TrafficCoordinationAgent(simulator_ref=sim)

    signal = RiskSignal(
        signal_id="SIG-TEST2",
        asset_id="OHE-B2",
        block_id="B2",
        risk_score=85.0,
        predicted_failure_in_sec=40.0,
        recommended_speed_restriction_kmph=25.0,
        emitted_at_ns=time.perf_counter_ns() - 1_500_000,
    )

    advisories = agent2.process_risk_signal(signal)
    primary_adv = next(a for a in advisories if a.train_id == "12628")
    assert primary_adv.type == AdvisoryType.LOOP_HOLD
    assert primary_adv.status == AdvisoryStatus.PENDING
    assert primary_adv.payload["loop_id"] == "LOOP-DHN"


def test_branch_b_no_option_escalation():
    sim = Simulator()
    sim.alternate_route_available = False
    sim.loop_lines["LOOP-DHN"].occupied = True  # Loop occupied by BOXN-8821
    agent2 = TrafficCoordinationAgent(simulator_ref=sim)

    signal = RiskSignal(
        signal_id="SIG-TEST3",
        asset_id="OHE-B2",
        block_id="B2",
        risk_score=90.0,
        predicted_failure_in_sec=30.0,
        recommended_speed_restriction_kmph=25.0,
        emitted_at_ns=time.perf_counter_ns() - 1_000_000,
    )

    advisories = agent2.process_risk_signal(signal)
    primary_adv = next(a for a in advisories if a.train_id == "12628")
    assert primary_adv.type == AdvisoryType.NO_OPTION
    assert primary_adv.status == AdvisoryStatus.PENDING
    assert "BOXN-8821" in primary_adv.payload["occupant"]


def test_safety_advisory_only_constraint():
    """
    CRITICAL REQUIREMENT:
    No advisory takes effect until explicitly approved by human controller.
    """
    sim = Simulator()
    agent2 = TrafficCoordinationAgent(simulator_ref=sim)

    initial_route = list(sim.trains["12628"].route)
    signal = RiskSignal(
        signal_id="SIG-SAFETY",
        asset_id="TRACK-B2-GEO",
        block_id="B2",
        risk_score=80.0,
        predicted_failure_in_sec=60.0,
        recommended_speed_restriction_kmph=45.0,
        emitted_at_ns=time.perf_counter_ns(),
    )

    advisories = agent2.process_risk_signal(signal)
    primary_adv = next(a for a in advisories if a.train_id == "12628")
    assert primary_adv.status == AdvisoryStatus.PENDING

    # Verify train route is UNCHANGED while in PENDING state
    assert sim.trains["12628"].route == initial_route
    assert sim.kpi.trains_protected_count == 0

    # Controller APPROVES advisory
    approved = agent2.approve_advisory(primary_adv.id, approver="Senior Controller Sharma")
    assert approved.status == AdvisoryStatus.APPROVED
    assert approved.approved_by == "Senior Controller Sharma"
    assert approved.decided_at is not None

    # Now verify train route IS updated
    assert sim.trains["12628"].route == primary_adv.payload["new_route"]
    assert sim.kpi.trains_protected_count == 1

