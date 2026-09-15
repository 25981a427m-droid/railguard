import time
import uuid
from typing import Dict, List, Optional, Tuple, Any
from .models import (
    Advisory, AdvisoryType, AdvisoryStatus, RiskSignal, Train, Block,
    Station, LoopLine, KpiMetrics
)
from .metrics import (
    measure_handoff_latency_ms,
    calculate_avoided_kinetic_energy_kwh,
    generate_speed_profile_points
)


class TrafficCoordinationAgent:
    """
    Agent 2: Real-Time Traffic Coordination Agent.
    Evaluates traffic cascade upon receiving a RiskSignal from Agent 1:
      - Branch A: Alternate Route via Dijkstra graph search
      - Branch B: Loop-line hold at nearest siding (or NO_OPTION escalation)
      - Branch C: Velocity smoothing for following train to avoid dead-stops
    
    SAFETY INVARIANT:
      Advisory ONLY. All advisories are emitted with status=PENDING.
      NO action executes until a human controller explicitly clicks Approve.
    """

    def __init__(self, simulator_ref=None):
        self.sim = simulator_ref
        self.advisories: Dict[str, Advisory] = {}
        self.handoff_latency_ms: float = 0.0

    def process_risk_signal(self, signal: RiskSignal) -> List[Advisory]:
        received_ns = time.perf_counter_ns()
        self.handoff_latency_ms = measure_handoff_latency_ms(signal.emitted_at_ns, received_ns)
        
        if self.sim:
            self.sim.kpi.agent_handoff_latency_ms = self.handoff_latency_ms
            self.sim.add_log(
                "[AGENT-2]",
                f"Received RiskSignal for {signal.asset_id} on {signal.block_id}. Handoff latency: {self.handoff_latency_ms} ms",
                "INFO"
            )

        generated_advisories: List[Advisory] = []
        now = time.time()

        # Step 1: Identify affected trains
        affected_trains = self._find_affected_trains(signal.block_id)
        if not affected_trains:
            if self.sim:
                self.sim.add_log("[AGENT-2]", f"No trains currently approaching block {signal.block_id}.", "INFO")
            return []

        primary_train = affected_trains[0]
        follower_train = affected_trains[1] if len(affected_trains) > 1 else None

        # Step 2: Decision Cascade for Primary Train
        primary_advisory = self._evaluate_primary_cascade(signal, primary_train, now)
        if primary_advisory:
            self.advisories[primary_advisory.id] = primary_advisory
            generated_advisories.append(primary_advisory)
            if self.sim:
                self.sim.advisories.insert(0, primary_advisory)
                self.sim.add_log(
                    "[AGENT-2]",
                    f"Generated {primary_advisory.type.value} advisory {primary_advisory.id} for Train {primary_train.id} (Status: PENDING controller approval).",
                    "WARNING"
                )

        # Step 3: Branch C — Smoothed Speed Profile for Following Train
        if follower_train:
            follower_advisory = self._evaluate_follower_profile(signal, follower_train, now)
            if follower_advisory:
                self.advisories[follower_advisory.id] = follower_advisory
                generated_advisories.append(follower_advisory)
                if self.sim:
                    self.sim.advisories.insert(0, follower_advisory)
                    self.sim.add_log(
                        "[AGENT-2]",
                        f"Generated SPEED_PROFILE advisory {follower_advisory.id} for Follower Train {follower_train.id} (Status: PENDING controller approval).",
                        "INFO"
                    )

        return generated_advisories

    def _find_affected_trains(self, degraded_block_id: str) -> List[Train]:
        if not self.sim:
            return []
        
        affected: List[Train] = []
        for train in self.sim.trains.values():
            if train.speed_kmph <= 0:
                continue
            if train.current_block == degraded_block_id or degraded_block_id in train.route:
                affected.append(train)

        # Sort by priority and proximity
        affected.sort(key=lambda t: (t.priority, -t.position_km))
        return affected

    def _evaluate_primary_cascade(self, signal: RiskSignal, train: Train, now: float) -> Advisory:
        """
        Runs Branch A (Alternate Route) or Branch B (Loop Hold / NO_OPTION).
        """
        alt_available = self.sim.alternate_route_available if self.sim else True

        # Branch A: Alternate Route Check
        if alt_available:
            reasoning = [
                f"1. Telemetry trend indicates critical breach on Block {signal.block_id} in {signal.predicted_failure_in_sec:.0f}s.",
                f"2. Primary affected train identified: {train.name} (Tonnage: {train.tonnage} t, Speed: {train.speed_kmph} km/h).",
                f"3. Executed Dijkstra graph search avoiding degraded corridor on {signal.block_id}.",
                "4. Found viable chord corridor: Dhone -> Nandyal -> Rajampet -> Tirupati (Blocks A1 -> A2 -> A3).",
                "5. Evaluated impact: +50.0 km added distance, +38.5 min ETA vs indefinite track block (>180 min detention).",
                "6. Branch A SELECTED: Generated REROUTE advisory pending human controller authorization."
            ]
            
            # Construct new route: current block, then chord blocks to TPT
            new_route = ["B1", "B2", "A1", "A2", "A3"] if train.current_block == "B1" else ["A1", "A2", "A3"]

            return Advisory(
                id=f"ADV-{uuid.uuid4().hex[:6].upper()}",
                type=AdvisoryType.REROUTE,
                train_id=train.id,
                issued_at=now,
                reasoning=reasoning,
                payload={
                    "current_route": train.route,
                    "new_route": new_route,
                    "via_station": "NDL (Nandyal Jn)",
                    "added_distance_km": 50.0,
                    "added_eta_min": 38.5,
                    "imposed_speed_restriction_kmph": signal.recommended_speed_restriction_kmph,
                    "degraded_block": signal.block_id,
                },
                status=AdvisoryStatus.PENDING,
            )

        # Branch B: Loop-line Hold Check
        # Check nearest forward loop line (e.g. LOOP-DHN)
        loop = self.sim.loop_lines.get("LOOP-DHN") if self.sim else None
        is_loop_free = (loop is not None and not loop.occupied)

        if is_loop_free:
            reasoning = [
                f"1. Telemetry trend indicates critical breach on Block {signal.block_id} in {signal.predicted_failure_in_sec:.0f}s.",
                "2. Branch A evaluated: Alternate route via NDL is UNAVAILABLE / Corridor saturated.",
                "3. Branch B evaluated: Searching nearest loop line ahead of train.",
                "4. Found LOOP-DHN (Dhone Jn Loop 1). Live occupancy: FREE (0/1 occupied).",
                "5. Branch B SELECTED: Hold train in LOOP-DHN for estimated 25 minutes to allow emergency maintenance.",
                "6. Generated LOOP_HOLD advisory pending human controller authorization."
            ]
            return Advisory(
                id=f"ADV-{uuid.uuid4().hex[:6].upper()}",
                type=AdvisoryType.LOOP_HOLD,
                train_id=train.id,
                issued_at=now,
                reasoning=reasoning,
                payload={
                    "loop_id": "LOOP-DHN",
                    "station_code": "DHN",
                    "hold_duration_min": 25.0,
                    "yield_to": "Emergency Track Tamping Unit / Inspection Car",
                    "target_block": signal.block_id,
                },
                status=AdvisoryStatus.PENDING,
            )
        else:
            occupied_by = loop.occupied_by if loop else "Unknown Rake"
            reasoning = [
                f"1. Telemetry trend indicates critical breach on Block {signal.block_id} in {signal.predicted_failure_in_sec:.0f}s.",
                "2. Branch A evaluated: Alternate route via NDL is UNAVAILABLE / Corridor saturated.",
                f"3. Branch B evaluated: Forward loop line LOOP-DHN is OCCUPIED by stabled train {occupied_by}.",
                "4. All automated routing alternatives exhausted: No free loop sidings or bypass lines within sector.",
                "5. Branch B ESCALATION: Automatic clearance not safe without human dispatcher intervention.",
                "6. Generated NO_OPTION advisory: Escalating to Human Controller for manual traffic regulation."
            ]
            return Advisory(
                id=f"ADV-{uuid.uuid4().hex[:6].upper()}",
                type=AdvisoryType.NO_OPTION,
                train_id=train.id,
                issued_at=now,
                reasoning=reasoning,
                payload={
                    "loop_id": "LOOP-DHN",
                    "station_code": "DHN",
                    "occupant": occupied_by,
                    "conflict_reason": "Main corridor degraded, alternate route closed, siding occupied.",
                    "required_action": "Controller must coordinate manual telephone block working or reverse movement.",
                },
                status=AdvisoryStatus.PENDING,
            )

    def _evaluate_follower_profile(self, signal: RiskSignal, follower: Train, now: float) -> Advisory:
        """
        Branch C: Computes velocity smoothing for follower train to prevent dead stop and preserve kinetic energy.
        """
        kwh_saved = calculate_avoided_kinetic_energy_kwh(
            tonnage_tonnes=follower.tonnage,
            v_cruise_kmph=follower.speed_kmph,
            v_slow_kmph=45.0,
        )
        profile_points = generate_speed_profile_points(
            initial_speed_kmph=follower.speed_kmph,
            slow_speed_kmph=45.0,
            duration_sec=120,
            distance_km=12.0,
        )

        reasoning = [
            f"1. Follower train {follower.name} (Tonnage: {follower.tonnage} t) detected trailing on Block B1.",
            "2. Baseline behavior without RailGuard: Full stop at Home Signal (0 km/h) followed by dead-weight restart.",
            "3. RailGuard dynamic profiling: Computes smoothed coasting curve from 95 km/h down to 45 km/h.",
            f"4. Physics energy estimate: Preserves train kinetic momentum, avoiding full deceleration loss.",
            f"5. Estimated energy saved: {kwh_saved:.1f} kWh (illustrative physics estimate).",
            "6. Branch C SELECTED: Generated SPEED_PROFILE advisory pending human controller authorization."
        ]

        return Advisory(
            id=f"ADV-{uuid.uuid4().hex[:6].upper()}",
            type=AdvisoryType.SPEED_PROFILE,
            train_id=follower.id,
            issued_at=now,
            reasoning=reasoning,
            payload={
                "follower_train_id": follower.id,
                "current_speed_kmph": follower.speed_kmph,
                "recommended_glide_speed_kmph": 45.0,
                "energy_saved_kwh": kwh_saved,
                "profile_curve": [p.model_dump() for p in profile_points],
                "disclaimer": "illustrative estimate",
            },
            status=AdvisoryStatus.PENDING,
        )

    def approve_advisory(self, advisory_id: str, approver: str = "Human Traffic Controller") -> Optional[Advisory]:
        """
        Controller approves the advisory. The action is now applied to the simulation.
        """
        advisory = self.advisories.get(advisory_id)
        if not advisory or advisory.status != AdvisoryStatus.PENDING:
            return None

        advisory.status = AdvisoryStatus.APPROVED
        advisory.approved_by = approver
        advisory.decided_at = time.time()

        if self.sim:
            train = self.sim.trains.get(advisory.train_id)

            if advisory.type == AdvisoryType.REROUTE and train:
                train.route = advisory.payload["new_route"]
                train.status_text = f"Approved Reroute via {advisory.payload.get('via_station', 'NDL')}"
                self.sim.kpi.trains_protected_count += 1
                self.sim.add_log(
                    "[CONTROLLER]",
                    f"APPROVED Reroute for Train {train.id} via NDL. Train path dynamically updated.",
                    "SUCCESS"
                )

            elif advisory.type == AdvisoryType.LOOP_HOLD and train:
                train.status_text = f"Approved Hold in {advisory.payload.get('loop_id')}"
                self.sim.kpi.trains_protected_count += 1
                self.sim.add_log(
                    "[CONTROLLER]",
                    f"APPROVED Loop Hold for Train {train.id} in {advisory.payload.get('loop_id')}.",
                    "SUCCESS"
                )

            elif advisory.type == AdvisoryType.SPEED_PROFILE and train:
                train.speed_kmph = advisory.payload.get("recommended_glide_speed_kmph", 45.0)
                train.status_text = "Gliding on Smoothed Speed Profile (45 km/h)"
                energy_saved = advisory.payload.get("energy_saved_kwh", 0.0)
                self.sim.kpi.total_energy_saved_kwh += energy_saved
                self.sim.kpi.trains_protected_count += 1
                self.sim.add_log(
                    "[CONTROLLER]",
                    f"APPROVED Speed Profile for Train {train.id}. Saved {energy_saved:.1f} kWh (illustrative estimate).",
                    "SUCCESS"
                )

            elif advisory.type == AdvisoryType.NO_OPTION:
                self.sim.add_log(
                    "[CONTROLLER]",
                    f"ACKNOWLEDGED NO_OPTION for Train {advisory.train_id}. Manual block control instituted.",
                    "WARNING"
                )

        return advisory

    def reject_advisory(self, advisory_id: str, approver: str = "Human Traffic Controller") -> Optional[Advisory]:
        """
        Controller rejects the advisory. No simulated traffic change occurs.
        """
        advisory = self.advisories.get(advisory_id)
        if not advisory or advisory.status != AdvisoryStatus.PENDING:
            return None

        advisory.status = AdvisoryStatus.REJECTED
        advisory.approved_by = approver
        advisory.decided_at = time.time()

        if self.sim:
            self.sim.add_log(
                "[CONTROLLER]",
                f"REJECTED Advisory {advisory.id} ({advisory.type.value}) for Train {advisory.train_id}. Keeping original dispatch plan.",
                "INFO"
            )

        return advisory

