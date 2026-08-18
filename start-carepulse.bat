@echo off
setlocal EnableDelayedExpansion

:: ===================================================================
:: CarePulse - One-Click Multi-Service Launcher
:: Project Root: E:\S5_Mini_Project
:: Automatically opens 3 separate terminal windows for:
::   1. FastAPI Backend (Port 5000)
::   2. Ngrok Public Tunnel (Port 5000)
::   3. Vite React Frontend (Port 5173)
:: ===================================================================

title CarePulse Launcher

:: Define hardcoded project directory and ngrok URL
set "PROJECT_DIR=E:\S5_Mini_Project"
set "NGROK_URL=https://straggler-boss-unselect.ngrok-free.dev"

echo ===================================================================
echo                     CAREPULSE SYSTEM LAUNCHER                      
echo ===================================================================
echo Project Directory: %PROJECT_DIR%
echo.

:: -------------------------------------------------------------------
:: STEP 0: Check if Port 5000 or Port 5173 is already in use
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
    echo One or more CarePulse ports are currently occupied.
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
:: STEP 1: Launch FastAPI Backend in Window 1
:: -------------------------------------------------------------------
echo [1/3] Starting backend (python backend/main.py on port 5000)...
start "CarePulse - FastAPI Backend (Port 5000)" cmd /k "cd /d %PROJECT_DIR% && echo ======================================== && echo  CAREPULSE FASTAPI BACKEND (PORT 5000) && echo ======================================== && python backend/main.py"

:: Add a short delay (4 seconds) so backend binds to port 5000 before ngrok starts
echo       Waiting 4 seconds for backend to start listening on port 5000...
timeout /t 4 /nobreak >nul

:: -------------------------------------------------------------------
:: STEP 2: Launch Ngrok Public Tunnel in Window 2
:: -------------------------------------------------------------------
echo.
echo [2/3] Starting ngrok tunnel (tunneling port 5000 to %NGROK_URL%)...
start "CarePulse - Ngrok Tunnel (Port 5000)" cmd /k "cd /d %PROJECT_DIR% && echo ======================================== && echo  CAREPULSE NGROK TUNNEL (PORT 5000) && echo ======================================== && ngrok.exe http --url=%NGROK_URL% 5000"

:: Short delay (2 seconds) before starting frontend
timeout /t 2 /nobreak >nul

:: -------------------------------------------------------------------
:: STEP 3: Launch Vite React Frontend in Window 3
:: -------------------------------------------------------------------
echo.
echo [3/3] Starting frontend (npm run dev -- --host on port 5173)...
start "CarePulse - Vite Frontend (Port 5173)" cmd /k "cd /d %PROJECT_DIR% && echo ======================================== && echo  CAREPULSE VITE REACT FRONTEND && echo ======================================== && npm run dev -- --host"

:: -------------------------------------------------------------------
:: STEP 4: Summary Banner with Window Titles and URLs
:: -------------------------------------------------------------------
echo.
echo ===================================================================
echo                  CAREPULSE SERVICES STARTED!                       
echo ===================================================================
echo.
echo  3 Independent Terminal Windows Opened:
echo    1. [CarePulse - FastAPI Backend (Port 5000)]
echo    2. [CarePulse - Ngrok Tunnel (Port 5000)]
echo    3. [CarePulse - Vite Frontend (Port 5173)]
echo.
echo  Quick Access Links:
echo    - Backend Local:   http://localhost:5000
echo    - Backend Swagger: http://localhost:5000/docs
echo    - Backend Public:  %NGROK_URL%
echo    - Frontend Local:  http://localhost:5173
echo.
echo  To shut down all services cleanly, run: stop-carepulse.bat
echo ===================================================================
echo.
pause
