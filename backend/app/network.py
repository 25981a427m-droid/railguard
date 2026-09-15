from typing import Dict, List
from .models import Station, Block, LoopLine, Train, TrainType, HealthStatus


def get_initial_stations() -> Dict[str, Station]:
    return {
        "KRN": Station(code="KRN", name="Kurnool City", x=90, y=140),
        "GTL": Station(code="GTL", name="Guntakal Jn", x=270, y=140),
        "DHN": Station(code="DHN", name="Dhone Jn", x=470, y=140),
        "TPT": Station(code="TPT", name="Tirupati", x=870, y=140),
        "NDL": Station(code="NDL", name="Nandyal Jn", x=580, y=280),
        "RJP": Station(code="RJP", name="Rajampet", x=740, y=280),
    }


def get_initial_blocks() -> Dict[str, Block]:
    return {
        # Main Line: KRN -> GTL -> DHN -> TPT
        "B1": Block(
            id="B1",
            name="KRN - GTL Section",
            from_station="KRN",
            to_station="GTL",
            length_km=50.0,
            max_speed_kmph=110.0,
            assets=["WHEEL-12045"],
            status=HealthStatus.NORMAL,
            is_alternate=False,
        ),
        "B2": Block(
            id="B2",
            name="GTL - DHN Section",
            from_station="GTL",
            to_station="DHN",
            length_km=45.0,
            max_speed_kmph=110.0,
            assets=["TRACK-B2-GEO", "OHE-B2"],
            status=HealthStatus.NORMAL,
            is_alternate=False,
        ),
        "B3": Block(
            id="B3",
            name="DHN - TPT Main Line",
            from_station="DHN",
            to_station="TPT",
            length_km=180.0,
            max_speed_kmph=120.0,
            assets=["SIG-DHN-A"],
            status=HealthStatus.NORMAL,
            is_alternate=False,
        ),
        # Alternate Route: DHN -> NDL -> RJP -> TPT
        "A1": Block(
            id="A1",
            name="DHN - NDL Chord",
            from_station="DHN",
            to_station="NDL",
            length_km=75.0,
            max_speed_kmph=80.0,
            assets=[],
            status=HealthStatus.NORMAL,
            is_alternate=True,
        ),
        "A2": Block(
            id="A2",
            name="NDL - RJP Line",
            from_station="NDL",
            to_station="RJP",
            length_km=110.0,
            max_speed_kmph=75.0,
            assets=[],
            status=HealthStatus.NORMAL,
            is_alternate=True,
        ),
        "A3": Block(
            id="A3",
            name="RJP - TPT Chord",
            from_station="RJP",
            to_station="TPT",
            length_km=45.0,
            max_speed_kmph=80.0,
            assets=[],
            status=HealthStatus.NORMAL,
            is_alternate=True,
        ),
    }


def get_initial_loop_lines() -> Dict[str, LoopLine]:
    return {
        "LOOP-GTL": LoopLine(
            id="LOOP-GTL",
            station_code="GTL",
            capacity=1,
            occupied=False,
            occupied_by=None,
        ),
        "LOOP-DHN": LoopLine(
            id="LOOP-DHN",
            station_code="DHN",
            capacity=1,
            # Per prompt spec: start occupied by stabled freight so loop-unavailable branch is reachable
            occupied=True,
            occupied_by="BOXN-8821",
        ),
    }


def get_initial_trains() -> Dict[str, Train]:
    return {
        "12628": Train(
            id="12628",
            name="12628 Karnataka Express",
            type=TrainType.EXPRESS,
            tonnage=820.0,
            current_block="B1",
            position_km=42.0,  # 8 km before GTL / approaching B2
            speed_kmph=105.0,
            max_speed_kmph=110.0,
            priority=1,
            route=["B1", "B2", "B3"],
            target_station="TPT",
            status_text="On Schedule — Approaching GTL",
            color="#22D3A7",
        ),
        "12786": Train(
            id="12786",
            name="12786 Kacheguda Express",
            type=TrainType.EXPRESS,
            tonnage=850.0,
            current_block="B1",
            position_km=16.0,  # Follower train on B1 behind 12628
            speed_kmph=95.0,
            max_speed_kmph=110.0,
            priority=2,
            route=["B1", "B2", "B3"],
            target_station="TPT",
            status_text="Nominal Run — Following 12628",
            color="#4F9CF9",
        ),
        "57425": Train(
            id="57425",
            name="57425 GTL-TPT Passenger",
            type=TrainType.MEMU,
            tonnage=420.0,
            current_block="B3",
            position_km=70.0,  # Downstream on B3
            speed_kmph=65.0,
            max_speed_kmph=75.0,
            priority=3,
            route=["B3"],
            target_station="TPT",
            status_text="On Time — Sector B3 Clear",
            color="#9BA8B7",
        ),
        "BOXN-8821": Train(
            id="BOXN-8821",
            name="BOXN-8821 Freight Coal",
            type=TrainType.FREIGHT,
            tonnage=5100.0,
            current_block="LOOP-DHN",
            position_km=0.0,
            speed_kmph=0.0,
            max_speed_kmph=60.0,
            priority=4,
            route=[],
            target_station="DHN",
            status_text="Stabled at Dhone Loop 1",
            color="#F2994A",
        ),
    }


# Asset to metric configuration
ASSET_CONFIG = {
    "TRACK-B2-GEO": {
        "metric_name": "Track geometry deviation",
        "unit": "mm",
        "block_id": "B2",
        "nominal": 2.1,
        "warning_threshold": 4.0,
        "critical_threshold": 7.0,
        "fault_step": 0.09,
        "noise_amp": 0.05,
    },
    "WHEEL-12045": {
        "metric_name": "Wheel vibration RMS",
        "unit": "g",
        "block_id": "B1",
        "nominal": 0.45,
        "warning_threshold": 0.8,
        "critical_threshold": 1.4,
        "fault_step": 0.02,
        "noise_amp": 0.02,
    },
    "OHE-B2": {
        "metric_name": "OHE contact voltage dip",
        "unit": "%",
        "block_id": "B2",
        "nominal": 3.2,
        "warning_threshold": 6.0,
        "critical_threshold": 10.0,
        "fault_step": 0.15,
        "noise_amp": 0.1,
    },
    "SIG-DHN-A": {
        "metric_name": "Signal relay response",
        "unit": "ms",
        "block_id": "B3",
        "nominal": 85.0,
        "warning_threshold": 120.0,
        "critical_threshold": 200.0,
        "fault_step": 2.5,
        "noise_amp": 1.5,
    },
}

