@echo off
title RailGuard - AI-Powered Automatic Block Planning
echo ================================================================
echo   RailGuard: AI-Powered Automatic Block Planning for IR
echo   Advisory-Only Autonomous Decision Support System
echo ================================================================
echo.

set PATH=C:\Program Files\nodejs;C:\Users\guru maneesh kumar\AppData\Local\Python\pythoncore-3.14-64\Scripts;C:\Users\guru maneesh kumar\AppData\Local\Python\pythoncore-3.14-64;%PATH%
set PYTHONPATH=%~dp0

echo [1/2] Launching Backend on http://localhost:8000...
start "RailGuard Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Launching Frontend on http://localhost:5173...
start "RailGuard Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ================================================================
echo   RailGuard is starting up!
echo   Dashboard: http://localhost:5173
echo   API Docs:  http://localhost:8000/docs
echo ================================================================
echo.
pause

