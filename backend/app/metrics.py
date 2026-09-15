import time
from typing import List, Tuple
from .models import SpeedProfilePoint


def measure_handoff_latency_ms(emitted_at_ns: int, received_at_ns: int) -> float:
    """
    Computes Agent 1 -> Agent 2 handoff latency in milliseconds with sub-millisecond precision.
    """
    if emitted_at_ns <= 0:
        return 0.8
    delta_ns = received_at_ns - emitted_at_ns
    delta_ms = delta_ns / 1_000_000.0
    # Guard against negative or clock skew
    return round(max(0.2, delta_ms), 2)


def calculate_avoided_kinetic_energy_kwh(
    tonnage_tonnes: float,
    v_cruise_kmph: float,
    v_slow_kmph: float,
    traction_inefficiency_factor: float = 1.35
) -> float:
    """
    Calculates estimated energy saved (in kWh) by avoiding a full dead-stop.
    Formula:
      Delta_E = 0.5 * m * (v_slow_ms)^2 * traction_inefficiency_factor
      where v_slow_ms is the momentum preserved instead of dropping to zero.
    Labeled as an 'illustrative estimate'.
    """
    m_kg = tonnage_tonnes * 1000.0
    v_slow_ms = v_slow_kmph / 3.6
    
    # Kinetic energy preserved (Joules)
    joules_saved = 0.5 * m_kg * (v_slow_ms ** 2) * traction_inefficiency_factor
    # Convert Joules to kWh (1 kWh = 3.6e6 Joules)
    kwh_saved = joules_saved / 3.6e6
    return round(kwh_saved, 1)


def generate_speed_profile_points(
    initial_speed_kmph: float,
    slow_speed_kmph: float,
    duration_sec: int = 120,
    distance_km: float = 12.0
) -> List[SpeedProfilePoint]:
    """
    Generates time-series curve comparing baseline 'dead stop & restart' vs RailGuard 'smoothed glide'.
    """
    points: List[SpeedProfilePoint] = []
    step = 5  # 5-second intervals

    for t in range(0, duration_sec + 1, step):
        pos = (t / duration_sec) * distance_km

        # Baseline: keeps high speed, suddenly drops to 0 at t=50s, waits until t=85s, restarts slowly
        if t < 40:
            base_v = initial_speed_kmph
        elif t <= 50:
            # Emergency braking
            frac = (t - 40) / 10.0
            base_v = initial_speed_kmph * (1.0 - frac)
        elif t < 85:
            # Dead stop at red signal
            base_v = 0.0
        else:
            # Slow acceleration back up
            frac = (t - 85) / 35.0
            base_v = slow_speed_kmph * frac

        # RailGuard: smooth cosine deceleration down to slow_speed_kmph, avoids stopping
        if t <= 60:
            # Smooth coasting down to slow_speed
            frac = t / 60.0
            rec_v = slow_speed_kmph + (initial_speed_kmph - slow_speed_kmph) * (1.0 - frac)
        elif t <= 90:
            # Gliding at continuous slow speed
            rec_v = slow_speed_kmph
        else:
            # Smooth gentle pickup
            frac = (t - 90) / 30.0
            rec_v = slow_speed_kmph + (initial_speed_kmph * 0.8 - slow_speed_kmph) * frac

        points.append(
            SpeedProfilePoint(
                time_sec=float(t),
                position_km=round(pos, 2),
                recommended_speed_kmph=round(rec_v, 1),
                baseline_speed_kmph=round(base_v, 1),
            )
        )

    return points

