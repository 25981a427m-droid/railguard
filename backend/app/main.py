import asyncio
import json
import time
from contextlib import asynccontextmanager
from typing import List, Dict, Any, Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .models import (
    Train, Block, Station, LoopLine, TelemetryPoint,
    Advisory, MaintenanceTicket, KpiMetrics, LogEntry, HealthStatus,
    ScenarioPayload
)
from .simulator import Simulator
from .agent1_asset import AssetHealthAgent
from .agent2_traffic import TrafficCoordinationAgent
from .network import ASSET_CONFIG

# Instantiate core components
simulator = Simulator()
agent2 = TrafficCoordinationAgent(simulator_ref=simulator)


def on_ticket(ticket: MaintenanceTicket):
    simulator.tickets.insert(0, ticket)
    simulator.add_log(
        "[AGENT-1]",
        f"Generated Maintenance Ticket {ticket.ticket_id} for {ticket.asset_id}: {ticket.recommended_action}",
        "WARNING"
    )


def on_risk_signal(signal):
    simulator.add_log(
        "[AGENT-1]",
        f"Risk threshold breached for {signal.asset_id} on {signal.block_id}. Emitting RiskSignal (Risk Score: {signal.risk_score}). Pushing to Agent 2...",
        "WARNING"
    )
    agent2.process_risk_signal(signal)


agent1 = AssetHealthAgent(
    on_risk_signal=on_risk_signal,
    on_ticket_generated=on_ticket,
)


def telemetry_eval_callback(history_dict: Dict[str, List[TelemetryPoint]]):
    for asset_id, points in history_dict.items():
        if points:
            agent1.evaluate_telemetry(asset_id, points)


simulator.on_telemetry_tick = telemetry_eval_callback


# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: dict):
        dead_connections = set()
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.add(connection)
        for dead in dead_connections:
            self.active_connections.discard(dead)


ws_manager = ConnectionManager()
sim_task = None


def get_full_state_snapshot() -> Dict[str, Any]:
    return {
        "type": "STATE_UPDATE",
        "timestamp": time.time(),
        "stations": {k: v.model_dump() for k, v in simulator.stations.items()},
        "blocks": {k: v.model_dump() for k, v in simulator.blocks.items()},
        "loop_lines": {k: v.model_dump() for k, v in simulator.loop_lines.items()},
        "trains": {k: v.model_dump() for k, v in simulator.trains.items()},
        "telemetry": {
            "history": {
                k: [p.model_dump() for p in v] for k, v in simulator.telemetry_history.items()
            },
            "latest": {
                k: simulator.telemetry_history[k][-1].model_dump() if simulator.telemetry_history[k] else None
                for k in ASSET_CONFIG
            },
            "trends": {
                k: agent1.trend_analyses[k].model_dump() if k in agent1.trend_analyses else None
                for k in ASSET_CONFIG
            },
        },
        "advisories": [a.model_dump() for a in simulator.advisories],
        "tickets": [t.model_dump() for t in simulator.tickets],
        "logs": [l.model_dump() for l in reversed(simulator.logs[-60:])],
        "kpi": simulator.kpi.model_dump(),
        "sim_speed": simulator.sim_speed,
        "active_faults": simulator.active_faults,
        "alternate_route_available": simulator.alternate_route_available,
    }


async def simulation_loop():
    while True:
        try:
            simulator.tick(dt=1.0)
            if ws_manager.active_connections:
                snapshot = get_full_state_snapshot()
                await ws_manager.broadcast(snapshot)
        except Exception as e:
            print(f"Error in simulation loop: {e}")
        await asyncio.sleep(1.0 / max(1.0, min(5.0, simulator.sim_speed)))


@asynccontextmanager
async def lifespan(app: FastAPI):
    global sim_task
    sim_task = asyncio.create_task(simulation_loop())
    yield
    if sim_task:
        sim_task.cancel()


app = FastAPI(title="RailGuard Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def get_health():
    return {"status": "ok", "service": "RailGuard Automatic Block Planning API"}


@app.get("/api/state")
def get_state():
    return get_full_state_snapshot()


@app.get("/api/network")
def get_network():
    return {
        "stations": simulator.stations,
        "blocks": simulator.blocks,
        "loop_lines": simulator.loop_lines,
        "trains": simulator.trains,
        "active_faults": simulator.active_faults,
        "alternate_route_available": simulator.alternate_route_available,
    }


@app.get("/api/telemetry")
def get_telemetry():
    return {
        "history": simulator.telemetry_history,
        "latest": {
            asset_id: simulator.telemetry_history[asset_id][-1] if simulator.telemetry_history[asset_id] else None
            for asset_id in ASSET_CONFIG
        },
        "trends": agent1.trend_analyses,
    }


@app.get("/api/advisories")
def get_advisories():
    return simulator.advisories


@app.post("/api/advisories/{advisory_id}/approve")
def approve_advisory(advisory_id: str):
    res = agent2.approve_advisory(advisory_id, approver="Human Traffic Controller (Dashboard)")
    if not res:
        raise HTTPException(status_code=404, detail="Advisory not found or already decided")
    return res


@app.post("/api/advisories/{advisory_id}/reject")
def reject_advisory(advisory_id: str):
    res = agent2.reject_advisory(advisory_id, approver="Human Traffic Controller (Dashboard)")
    if not res:
        raise HTTPException(status_code=404, detail="Advisory not found or already decided")
    return res


@app.post("/api/scenario/inject")
def inject_fault(payload: ScenarioPayload):
    if not payload.fault_type:
        raise HTTPException(status_code=400, detail="fault_type required")
    simulator.inject_fault(payload.fault_type)
    return {"status": "injected", "fault_type": payload.fault_type}


@app.post("/api/scenario/toggle_loop")
def toggle_loop(payload: ScenarioPayload):
    simulator.toggle_loop(payload.loop_id or "LOOP-DHN")
    return {"status": "toggled", "loop": simulator.loop_lines.get(payload.loop_id or "LOOP-DHN")}


@app.post("/api/scenario/speed")
def set_speed(payload: ScenarioPayload):
    if payload.speed is not None:
        simulator.set_sim_speed(payload.speed)
    return {"status": "updated", "speed": simulator.sim_speed}


@app.post("/api/scenario/reset")
def reset_scenario():
    simulator.reset()
    agent1.asset_states = {k: HealthStatus.NORMAL for k in ASSET_CONFIG}
    agent1.last_signal_time = {k: 0.0 for k in ASSET_CONFIG}
    agent1.trend_analyses.clear()
    agent2.advisories.clear()
    return {"status": "reset_complete"}


@app.post("/api/scenario/demo")
def run_demo_scenario():
    simulator.reset()
    agent1.asset_states = {k: HealthStatus.NORMAL for k in ASSET_CONFIG}
    agent1.last_signal_time = {k: 0.0 for k in ASSET_CONFIG}
    agent1.trend_analyses.clear()
    agent2.advisories.clear()
    simulator.inject_fault("track_geo")
    simulator.add_log("[SYSTEM]", "Demo Scenario Initiated: Injected Track Geometry Fault on Section B2.", "WARNING")
    return {"status": "demo_started"}


@app.get("/api/metrics")
def get_metrics():
    return simulator.kpi


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send immediate initial snapshot
        await websocket.send_json(get_full_state_snapshot())
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                action = msg.get("action")
                if action == "approve_advisory":
                    agent2.approve_advisory(msg.get("advisory_id"), approver="Human Controller (WS)")
                elif action == "reject_advisory":
                    agent2.reject_advisory(msg.get("advisory_id"), approver="Human Controller (WS)")
                elif action == "inject_fault":
                    simulator.inject_fault(msg.get("fault_type"))
                elif action == "toggle_loop":
                    simulator.toggle_loop(msg.get("loop_id", "LOOP-DHN"))
                elif action == "set_speed":
                    simulator.set_sim_speed(float(msg.get("speed", 1.0)))
                elif action == "reset":
                    reset_scenario()
                elif action == "run_demo_scenario":
                    run_demo_scenario()

                # Broadcast immediate update after action
                await ws_manager.broadcast(get_full_state_snapshot())
            except Exception as e:
                print(f"Error handling WS message: {e}")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
