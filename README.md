# RailGuard — AI-Powered Automatic Block Planning for Indian Railways

> **Live Demo Prototype** • Zero External APIs • In-Memory Reactive Architecture • Advisory-Only Human-in-the-Loop Safety

RailGuard is a two-agent decision-support prototype engineered for Indian Railways traffic controllers. It predicts infrastructure and rolling-stock asset failures from real-time telemetry trends, instantly alerts a traffic coordination agent before raw parameters breach critical safety thresholds, and presents traffic mitigation options to the human controller as **advisories requiring explicit approval**.

---

## ⚡ 60-Second Quickstart

### Prerequisites
- Python 3.11+
- Node.js 18+ (LTS recommended)

### One-Command Start

#### Windows:
Double-click `run.bat` or run:
```cmd
run.bat
```

#### Linux / macOS:
```bash
chmod +x run.sh
./run.sh
```

### Manual Individual Commands

**Backend (Terminal 1):**
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

**Frontend (Terminal 2):**
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser. The backend API runs at **http://localhost:8000** (Interactive Swagger docs: `/docs`).

---

## 🛡️ Core Safety Invariant: Advisory Only

> [!IMPORTANT]
> **Advisory-Only Constraint:**
> RailGuard is strictly a decision-support copilot. It **never** issues commands directly to trains, never communicates directly with loco pilots, and never touches electronic interlocking or signalling hardware.
> Every recommendation is generated in a `PENDING` state and will **never take effect** until a certified human traffic controller reviews the reasoning trace and clicks **Approve** or **Reject**. This policy is surfaced permanently in the dashboard footer.

---

## 🏛️ System Architecture

```
                               ┌─────────────────────────────┐
                               │   Synthetic Sim Telemetry   │
                               │   (1 Hz Clock, 1x/5x/20x)   │
                               └──────────────┬──────────────┘
                                              │ (Track, Wheel, OHE, Signal)
                                              ▼
                             ┌───────────────────────────────────┐
                             │     AGENT 1: ASSET HEALTH         │
                             │  • Rolling 60-sample window       │
                             │  • Least-squares linear regression│
                             │  • Time-to-critical extrapolation │
                             └──────────────┬────────────────────┘
                                            │
               ┌────────────────────────────┴────────────────────────────┐
               │ Fires on TREND, BEFORE raw value reaches critical line   │
               ▼                                                         ▼
┌──────────────────────────────┐                         ┌──────────────────────────────┐
│      MaintenanceTicket       │                         │          RiskSignal          │
│ (Asset, Failure Window, TSR) │                         │ (Block, Risk, Handoff in ms) │
└──────────────┬───────────────┘                         └──────────────┬───────────────┘
               │                                                        │
               │ (Audit Stream)                                         ▼
               │                                         ┌──────────────────────────────┐
               │                                         │   AGENT 2: TRAFFIC COORD.    │
               │                                         │   Deterministic Cascade:     │
               │                                         │   ├─ Branch A: Detour        │
               │                                         │   ├─ Branch B: Siding Hold   │
               │                                         │   └─ Branch C: Speed Profile │
               │                                         └──────────────┬───────────────┘
               │                                                        │
               ▼                                                        ▼
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                           HUMAN TRAFFIC CONTROLLER DASHBOARD                          │
│                                                                                       │
│  [Top KPI Strip]     Manual: ~45–60 min  vs  RailGuard: 1.4s  •  Handoff: 1.2 ms     │
│  [Left 60%]          Inline SVG Network Map (KRN - GTL - DHN - TPT)                   │
│  [Right 40%]         Advisory Queue with Step-by-Step Reasoning Trace                 │
│  [Bottom Tabs]       Live Telemetry Trends • Follower Velocity Profile • Event Log    │
│                                                                                       │
│                 [ APPROVE ADVISORY ]          [ REJECT ADVISORY ]                     │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚦 Decision Cascade (Agent 2)

When Agent 1 detects an impending threshold breach, it dispatches an in-process `RiskSignal` to Agent 2. Agent 2 executes a 3-branch cascade:

1. **Affected Train Identification:** Scans all active trains to find services traversing the degraded block within the predicted failure window.
2. **Branch A — Alternate Route (Dijkstra Search):**
   - Evaluates whether the parallel chord corridor (Dhone → Nandyal → Rajampet → Tirupati) has capacity.
   - If available, generates a `REROUTE` advisory (+50 km added distance, +38.5 min ETA vs indefinite track block).
3. **Branch B — Loop-Line Regulation:**
   - If alternate route is blocked or unavailable, checks live occupancy of forward loop sidings (e.g., `LOOP-DHN`).
   - If free: Generates a `LOOP_HOLD` advisory with a 25-minute holding period.
   - If occupied (e.g., by stabled coal rake `BOXN-8821`): Generates a `NO_OPTION` advisory, escalating honestly to the controller for manual telephone block regulation.
4. **Branch C — Velocity Profile Smoothing (Follower Train):**
   - For trains following behind (Train 12786), calculates a smoothed coasting curve (95 km/h → 45 km/h) instead of dead-stopping at a red signal.
   - Preserves kinetic momentum, calculating energy savings:
     $$\Delta E = \frac{1}{2} m (v_1^2 - v_2^2) \times \eta_{\text{traction}}$$
     Labeled as an **"illustrative estimate"**.

---

## 🎬 5-Minute Live Demo Script

1. **Dashboard Baseline:**
   - Launch RailGuard via `run.bat` or `./run.sh`.
   - Observe 4 trains moving on the inline SVG network map: Express 12628, Follower 12786, Passenger 57425, and stabled freight BOXN-8821.
   - All blocks and telemetry indicators are green.

2. **Trigger Predictive Fault:**
   - Click `Inject: Track Geometry Fault (B2)` on the top-right control bar.
   - Switch to the bottom **Telemetry** tab to watch the raw track deviation climb.

3. **Observe Trend-Based Trigger:**
   - At **~5.2 mm** (well below the red 7.0 mm critical threshold), Agent 1 detects a steepening slope.
   - Extrapolated time-to-critical drops to ~70 seconds.
   - Agent 1 transitions to `WARNING` and dispatches `RiskSignal` and `MaintenanceTicket` in the same clock tick.
   - Note the measured **Agent 1 → Agent 2 handoff latency (~1.2 ms)** in the KPI strip.

4. **Review and Approve Reroute:**
   - A `REROUTE` advisory card appears in the Advisory Queue with status `PENDING`.
   - Expand the **Decision Reasoning Trace** to review the 6-step AI justification.
   - Click **Approve Advisory**:
     - Map updates immediately: the Nandyal alternate route animates in glowing green.
     - Train 12628 updates its route to divert via the chord line.
     - Trains protected counter increments.

5. **Smooth Follower Train Speed:**
   - Second advisory appears: `SPEED_PROFILE` for follower train 12786.
   - Switch to the **Follower Speed Profile** tab to view the avoided dead-stop trajectory.
   - Click **Approve Advisory**:
     - Follower smoothly coasts to 45 km/h.
     - KPI strip energy counter increments (e.g., +38.4 kWh).

6. **Demonstrate Honest Escalation (`NO_OPTION`):**
   - Click `Occupy LOOP-DHN` (ensuring the siding is occupied).
   - Click `Inject: OHE Fault — No Alternate Route`.
   - Watch Agent 2 evaluate Branch A (unavailable) and Branch B (siding blocked).
   - A `NO_OPTION` advisory appears, clearly stating all automated branches are exhausted and requesting manual telephone block regulation.

---

## ⚠️ Stated Prototype Limitations

1. **Simulated Loop Occupancy:** Loop-line occupancy uses in-memory simulated state; production deployment requires integration with IR live axle-counter/track-circuit data streams.
2. **Local Section Scope:** Optimization is localized to the monitored division/section (KRN-GTL-DHN-TPT); network-wide timetable rescheduling is NP-hard and outside this prototype's boundary.
3. **Synthetic Telemetry:** Telemetry feeds are synthetic; interfacing legacy wayside sensors and locomotive telemetry requires dedicated data-engineering pipelines.
4. **Illustrative Energy Figures:** Energy savings are physics-based kinetic momentum calculations ($0.5 \cdot m \cdot v^2$), not certified electrical utility measurements.

---

## 🧪 Automated Testing

Run the full pytest suite from the project root:
```bash
pytest backend/tests -v
```

Tests cover:
- Agent 1 linear regression slope extrapolation and pre-critical threshold alerting.
- Agent 2 Branch A (Dijkstra reroute), Branch B (Loop hold & No Option), and Branch C (Speed profile).
- Hard safety constraint: Verification that train route/speed cannot be mutated while advisory is in `PENDING` state.

