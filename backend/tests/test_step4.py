import pytest
from starlette.testclient import TestClient
from backend.app.main import app, simulator, agent1, agent2
from backend.app.models import AdvisoryStatus


def test_state_and_scenario_api():
    client = TestClient(app)
    
    # 1. State snapshot
    res = client.get("/api/state")
    assert res.status_code == 200
    data = res.json()
    assert data["type"] == "STATE_UPDATE"
    assert "trains" in data
    assert "telemetry" in data
    assert "kpi" in data

    # 2. Reset scenario
    res = client.post("/api/scenario/reset")
    assert res.status_code == 200
    assert res.json()["status"] == "reset_complete"

    # 3. Toggle loop
    res = client.post("/api/scenario/toggle_loop", json={"loop_id": "LOOP-DHN"})
    assert res.status_code == 200
    assert res.json()["loop"]["occupied"] is False

    # 4. Inject fault
    res = client.post("/api/scenario/inject", json={"fault_type": "track_geo"})
    assert res.status_code == 200
    assert simulator.active_faults["TRACK-B2-GEO"] is True

    # 5. Set speed
    res = client.post("/api/scenario/speed", json={"speed": 5.0})
    assert res.status_code == 200
    assert simulator.sim_speed == 5.0


def test_websocket_connection_and_flow():
    client = TestClient(app)
    with client.websocket_connect("/ws") as websocket:
        initial_msg = websocket.receive_json()
        assert initial_msg["type"] == "STATE_UPDATE"
        assert "12628" in initial_msg["trains"]

        # Send action via WS
        websocket.send_json({"action": "set_speed", "speed": 1.0})
        update_msg = websocket.receive_json()
        assert update_msg["sim_speed"] == 1.0

