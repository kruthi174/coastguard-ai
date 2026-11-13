@echo off
title COASTGUARD AI — Maritime Intelligence Platform
echo ======================================================================
echo  COASTGUARD AI: CROWDSOURCED COASTAL HAZARD CLUSTERING SYSTEM
echo  Smart India Hackathon Project
echo ======================================================================
echo.

set PYTHONPATH=%~dp0
set COASTGUARD_DB_PATH=%~dp0database\coastguard.db

echo [*] Launching CoastGuard AI Unified Server...
echo [*] Application URL: http://localhost:8000
echo [*] API Documentation: http://localhost:8000/api/docs
echo.

python "%~dp0backend\main.py"

pause
