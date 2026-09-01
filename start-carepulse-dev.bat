@echo off
setlocal EnableDelayedExpansion

:: ===================================================================
:: CarePulse - Local Web Development Launcher (Full Stack)
:: Project Root: E:\S5_Mini_Project
:: Starts services with terminal windows for local browser development:
::   1. FastAPI Backend (Port 5000)
::   2. Ngrok Public Tunnel (Port 5000 -> Permanent Domain)
::   3. Vite React Frontend Dev Server (Port 5173)
::
:: USE CASE: Testing UI changes in a web browser before building a new APK.
:: NOTE: For running ONLY what the deployed Android app needs, use:
::       start-carepulse.bat (only 2 terminals: backend + ngrok)
:: ===================================================================

title CarePulse Dev Launcher (Web Dev Mode)

:: Dynamically resolve current directory
set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"
set "NGROK_DOMAIN=straggler-boss-unselect.ngrok-free.dev"
set "NGROK_URL=https://straggler-boss-unselect.ngrok-free.dev"

echo ===================================================================
echo               CAREPULSE LOCAL WEB DEV LAUNCHER                     
echo ===================================================================
echo Project Directory: %PROJECT_DIR%
echo Public Ngrok URL:  %NGROK_URL%
echo.

:: -------------------------------------------------------------------
:: STEP 0: Check if App Ports 5000 or 5173 are already in use
:: -------------------------------------------------------------------
set "PORT_IN_USE=0"

netstat -ano | findstr /R /C:":5000 .*LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] Port 5000 is already in use (Backend may already be running^).
    set "PORT_IN_USE=1"
)

netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] Port 5173 is already in use (Frontend may already be running^).
    set "PORT_IN_USE=1"
)

if "%PORT_IN_USE%"=="1" (
    echo.
    echo One or more CarePulse application ports are currently occupied.
    echo (Tip: You can run stop-carepulse-dev.bat first to close existing instances^).
    echo.
    choice /c YN /m "Do you want to continue and start services anyway? [Y/N]"
    if errorlevel 2 (
        echo.
        echo [INFO] Launch aborted by user.
        pause
        exit /b 0
    )
)

echo.
echo [INFO] Starting CarePulse Development Services...
echo.

:: -------------------------------------------------------------------
:: STEP 1: Verify PostgreSQL Background Windows Service (Port 5432)
:: -------------------------------------------------------------------
echo [1/4] Checking PostgreSQL Database Service (Port 5432)...
netstat -ano | findstr /R /C:":5432 .*LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo       [OK] Database is running and listening on port 5432.
    goto :POSTGRES_READY
)

echo       PostgreSQL is not active on port 5432. Starting Windows service...

REM Start Windows PostgreSQL service (postgresql-x64-18)
net start postgresql-x64-18 >nul 2>&1
if not errorlevel 1 goto :CHECK_DB_HEALTH

REM Fallback: generic postgres service start
powershell -NoProfile -Command "Get-Service *postgres* -ErrorAction SilentlyContinue | Start-Service -ErrorAction SilentlyContinue" >nul 2>&1

:CHECK_DB_HEALTH
ping 127.0.0.1 -n 4 >nul

netstat -ano | findstr /R /C:":5432 .*LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo       [OK] PostgreSQL service started successfully on port 5432.
) else (
    echo       [NOTE] Port 5432 not active. Backend will fall back to local JSON store if DB is offline.
)

:POSTGRES_READY

:: -------------------------------------------------------------------
:: STEP 2: Launch FastAPI Backend in Terminal Window 1
:: -------------------------------------------------------------------
echo.
echo [2/4] Starting backend in Terminal 1 (python backend/main.py on port 5000)...
start "CarePulse - FastAPI Backend (Port 5000)" cmd /k "cd /d %PROJECT_DIR% && echo ======================================== && echo  CAREPULSE FASTAPI BACKEND (PORT 5000) && echo ======================================== && python backend/main.py"

:: Add a short delay (4 seconds) so backend binds to port 5000 before ngrok starts
echo       Waiting 4 seconds for backend to start listening on port 5000...
ping 127.0.0.1 -n 5 >nul

:: -------------------------------------------------------------------
:: STEP 3: Launch Ngrok Public Tunnel in Terminal Window 2
:: -------------------------------------------------------------------
echo.
echo [3/4] Starting ngrok tunnel in Terminal 2 (tunneling port 5000 to %NGROK_DOMAIN%)...
start "CarePulse - Ngrok Tunnel (Port 5000)" cmd /k "cd /d %PROJECT_DIR% && echo ======================================== && echo  CAREPULSE NGROK TUNNEL (PORT 5000) && echo ======================================== && ngrok.exe http --url=%NGROK_DOMAIN% 5000"

:: Short delay (2 seconds) before starting frontend
ping 127.0.0.1 -n 3 >nul

:: -------------------------------------------------------------------
:: STEP 4: Launch Vite React Frontend in Terminal Window 3
:: -------------------------------------------------------------------
echo.
echo [4/4] Starting frontend in Terminal 3 (npm run dev -- --host on port 5173)...
start "CarePulse - Vite Frontend (Port 5173)" cmd /k "cd /d %PROJECT_DIR%\frontend && echo ======================================== && echo  CAREPULSE VITE REACT FRONTEND && echo ======================================== && npm run dev -- --host"

:: -------------------------------------------------------------------
:: STEP 5: Final Summary Banner
:: -------------------------------------------------------------------
echo.
echo ===================================================================
echo                 CAREPULSE DEV SERVICES STARTED                     
echo ===================================================================
echo.
echo  3 Terminal Windows Opened:
echo    1. [CarePulse - FastAPI Backend (Port 5000)]
echo    2. [CarePulse - Ngrok Tunnel (Port 5000)]
echo    3. [CarePulse - Vite Frontend (Port 5173)]
echo.
echo  Development Links:
echo    - Frontend Dev Server:   http://localhost:5173
echo    - Backend Local API:     http://localhost:5000
echo    - Backend Swagger Docs:  http://localhost:5000/docs
echo    - Backend Public Tunnel: %NGROK_URL%
echo.
echo  To shut down dev services, run: stop-carepulse-dev.bat
echo ===================================================================
echo.
pause
