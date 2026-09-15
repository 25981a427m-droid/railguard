import pytest
from starlette.testclient import TestClient
from backend.app.main import app, simulator
from backend.app.network import ASSET_CONFIG


def test_network_structure():
    assert "KRN" in simulator.stations
    assert "GTL" in simulator.stations
    assert "DHN" in simulator.stations
    assert "TPT" in simulator.stations
    assert "NDL" in simulator.stations
    assert "RJP" in simulator.stations

    assert "B1" in simulator.blocks
    assert "B2" in simulator.blocks
    assert "B3" in simulator.blocks
    assert "A1" in simulator.blocks
    assert "A2" in simulator.blocks
    assert "A3" in simulator.blocks

    # Loop lines
    assert "LOOP-GTL" in simulator.loop_lines
    assert "LOOP-DHN" in simulator.loop_lines
    assert simulator.loop_lines["LOOP-DHN"].occupied is True

    # 4 trains
    assert len(simulator.trains) == 4
    assert "12628" in simulator.trains
    assert "12786" in simulator.trains
    assert "57425" in simulator.trains
    assert "BOXN-8821" in simulator.trains


def test_rest_endpoints():
    client = TestClient(app)
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    res = client.get("/api/network")
    assert res.status_code == 200
    data = res.json()
    assert "stations" in data
    assert "blocks" in data
    assert "trains" in data
    assert "loop_lines" in data

    res = client.get("/api/telemetry")
    assert res.status_code == 200
    data = res.json()
    assert "history" in data
    for asset_id in ASSET_CONFIG:
        assert asset_id in data["history"]
        assert len(data["history"][asset_id]) > 0


def test_simulator_tick_and_train_movement():
    initial_pos = simulator.trains["12628"].position_km
    simulator.tick(dt=2.0)
    new_pos = simulator.trains["12628"].position_km
    assert new_pos > initial_pos

