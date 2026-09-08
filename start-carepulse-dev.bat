@echo off
setlocal EnableDelayedExpansion

:: ===================================================================
:: CarePulse - Local Full-Stack Development Launcher
:: Starts:
::   1. FastAPI Backend Server (Port 5000)
::   2. Vite Frontend Dev Server (Port 5173)
:: ===================================================================

title CarePulse Local Dev Launcher

set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

echo ===================================================================
echo               CAREPULSE LOCAL DEVELOPMENT LAUNCHER                 
echo ===================================================================
echo Project Directory: %PROJECT_DIR%
echo.

:: 1. Launch FastAPI Backend
echo [1/2] Starting FastAPI Backend on http://localhost:5000 ...
start "CarePulse - Backend (Port 5000)" cmd /k "cd /d %PROJECT_DIR% && echo ======================================== && echo  CAREPULSE FASTAPI BACKEND (PORT 5000) && echo ======================================== && python backend/main.py"

:: Delay 3 seconds
ping 127.0.0.1 -n 4 >nul

:: 2. Launch Vite Frontend Dev Server
echo [2/2] Starting Vite Frontend on http://localhost:5173 ...
start "CarePulse - Frontend (Port 5173)" cmd /k "cd /d %PROJECT_DIR% && echo ======================================== && echo  CAREPULSE VITE DEV SERVER (PORT 5173) && echo ======================================== && npm --prefix frontend run dev"

echo.
echo ===================================================================
echo                   SERVICES STARTED SUCCESSFULLY                    
echo ===================================================================
echo.
echo  Local URLs:
echo    - Frontend Web App:     http://localhost:5173
echo    - Backend API:          http://localhost:5000/api
echo    - Interactive API Docs: http://localhost:5000/docs
echo.
echo  To stop services, run: stop-carepulse.bat
echo ===================================================================
echo.
pause
