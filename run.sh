#!/usr/bin/env bash
echo "================================================================"
echo "  RailGuard: AI-Powered Automatic Block Planning for IR"
echo "  Advisory-Only Autonomous Decision Support System"
echo "================================================================"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PYTHONPATH="$ROOT_DIR"

echo "[1/2] Starting Backend on http://localhost:8000..."
(cd "$ROOT_DIR/backend" && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload) &
BACKEND_PID=$!

echo "[2/2] Starting Frontend on http://localhost:5173..."
(cd "$ROOT_DIR/frontend" && npm run dev) &
FRONTEND_PID=$!

echo "RailGuard running! Dashboard: http://localhost:5173"
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM EXIT
wait

