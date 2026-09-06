@echo off
setlocal EnableDelayedExpansion

:: ===================================================================
:: CarePulse - Production Android Network Services Launcher
:: Project Root: E:\S5_Mini_Project
:: Starts the 2 terminal services required for the Android APK:
::   1. FastAPI Backend (Port 5000)
::   2. Ngrok Public Tunnel (Port 5000 -> Permanent Domain)
::
:: NOTE: The Android APK bundles the production frontend assets directly.
:: A live Vite dev server (npm run dev) is NOT needed for the mobile app.
:: ===================================================================

title CarePulse Launcher (Android Services)

:: Dynamically resolve current directory (handles any drive or path)
set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"
set "NGROK_DOMAIN=straggler-boss-unselect.ngrok-free.dev"
set "NGROK_URL=https://straggler-boss-unselect.ngrok-free.dev"

echo ===================================================================
echo               CAREPULSE ANDROID NETWORK LAUNCHER                   
echo ===================================================================
echo Project Directory: %PROJECT_DIR%
echo Public Ngrok URL:  %NGROK_URL%
echo.

:: -------------------------------------------------------------------
:: STEP 0: Check if Backend Port 5000 is already in use
:: -------------------------------------------------------------------
set "PORT_IN_USE=0"

netstat -ano | findstr /R /C:":5000 .*LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] Port 5000 is already in use (Backend may already be running^).
    set "PORT_IN_USE=1"
)

if "%PORT_IN_USE%"=="1" (
    echo.
    echo Port 5000 is currently occupied.
    echo (Tip: You can run stop-carepulse.bat first to close existing instances^).
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
echo [INFO] Starting CarePulse Services...
echo.

:: -------------------------------------------------------------------
:: STEP 1: Verify PostgreSQL Background Windows Service (Port 5432)
:: (PostgreSQL runs silently as a Windows service; no terminal required)
:: -------------------------------------------------------------------
echo [1/3] Checking PostgreSQL Database Service (Port 5432)...
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
echo [2/3] Starting backend in Terminal 1 (python backend/main.py on port 5000)...
start "CarePulse - FastAPI Backend (Port 5000)" cmd /k "cd /d %PROJECT_DIR% && echo ======================================== && echo  CAREPULSE FASTAPI BACKEND (PORT 5000) && echo ======================================== && python backend/main.py"

:: Add a short delay (4 seconds) so backend binds to port 5000 before ngrok starts
echo       Waiting 4 seconds for backend to start listening on port 5000...
ping 127.0.0.1 -n 5 >nul

:: -------------------------------------------------------------------
:: STEP 3: Launch Ngrok Public Tunnel in Terminal Window 2
:: -------------------------------------------------------------------
echo.
echo [3/3] Starting ngrok tunnel in Terminal 2 (tunneling port 5000 to %NGROK_DOMAIN%)...
start "CarePulse - Ngrok Tunnel (Port 5000)" cmd /k "cd /d %PROJECT_DIR% && echo ======================================== && echo  CAREPULSE NGROK TUNNEL (PORT 5000) && echo ======================================== && ngrok.exe http --url=%NGROK_DOMAIN% 5000"

:: -------------------------------------------------------------------
:: STEP 4: Frontend Dev Server (OMITTED FOR MOBILE APP DEPLOYMENT)
:: -------------------------------------------------------------------
:: REM The Android mobile app has the production UI bundled directly inside the APK.
:: REM A live Vite dev server (npm run dev) is not required for the app to work.
:: REM For local web browser development/testing, run start-carepulse-dev.bat instead.

:: -------------------------------------------------------------------
:: STEP 5: Final Summary Banner
:: -------------------------------------------------------------------
echo.
echo ===================================================================
echo                     CAREPULSE SERVICES STARTED                     
echo ===================================================================
echo.
echo  2 Active Terminal Windows Opened:
echo    1. [CarePulse - FastAPI Backend (Port 5000)]
echo    2. [CarePulse - Ngrok Tunnel (Port 5000)]
echo.
echo  Status & Endpoints:
echo    - Backend running locally:  http://localhost:5000
echo    - Backend API Docs:         http://localhost:5000/docs
echo    - Backend reachable from:   %NGROK_URL%
echo.
echo  Important Notes:
echo    * PostgreSQL runs as a background Windows service (Port 5432).
echo      No terminal is needed; it is set to Automatic startup so it
echo      is always ready before the backend starts.
echo    * The Android app works from ANY network as long as these 2
echo      terminals stay open and this machine is on and connected to internet.
echo.
echo  To shut down services cleanly, run: stop-carepulse.bat
echo ===================================================================
echo.
pause
