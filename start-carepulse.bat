@echo off
setlocal EnableDelayedExpansion

:: ===================================================================
:: CarePulse - One-Click Multi-Service Launcher
:: Project Root: E:\S5_Mini_Project
:: Automatically initializes and opens 4 terminal windows for:
::   1. SQL Shell (psql) (Port 5432)
::   2. FastAPI Backend (Port 5000)
::   3. Ngrok Public Tunnel (Port 5000)
::   4. Vite React Frontend (Port 5173)
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
:: STEP 1: Check and Start PostgreSQL Database (Port 5432) & SQL Shell
:: -------------------------------------------------------------------
echo [1/4] Starting PostgreSQL Database (Port 5432)...
netstat -ano | findstr /R /C:":5432 .*LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo       [OK] Database is already running and listening on port 5432.
    goto :OPEN_SQL_SHELL
)

echo       Database is not active on port 5432. Attempting to start PostgreSQL...

REM Try starting Windows PostgreSQL service (postgresql-x64-18)
net start postgresql-x64-18 >nul 2>&1
if not errorlevel 1 goto :CHECK_DB_HEALTH

REM Try starting generic postgres service
powershell -NoProfile -Command "Get-Service *postgres* -ErrorAction SilentlyContinue | Start-Service -ErrorAction SilentlyContinue" >nul 2>&1

REM Try Docker Compose if Docker is available
where docker >nul 2>&1
if not errorlevel 1 (
    cd /d %PROJECT_DIR%
    docker-compose up -d >nul 2>&1
)

:CHECK_DB_HEALTH
ping 127.0.0.1 -n 4 >nul

netstat -ano | findstr /R /C:":5432 .*LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo       [OK] PostgreSQL Database started successfully on port 5432.
) else (
    echo       [NOTE] Port 5432 not active. Backend will use local JSON store if DB is offline.
)

:OPEN_SQL_SHELL
REM Launch Official PostgreSQL SQL Shell (psql)
echo       Opening SQL Shell (psql)...
if exist "C:\Program Files\PostgreSQL\18\scripts\runpsql.bat" (
    start "SQL Shell (psql)" "C:\Program Files\PostgreSQL\18\scripts\runpsql.bat"
) else (
    start "SQL Shell (psql)" cmd /k "cd /d %PROJECT_DIR% && set PATH=C:\Program Files\PostgreSQL\18\bin;%PATH% && psql -h localhost -U postgres -d postgres -p 5432"
)

:: -------------------------------------------------------------------
:: STEP 2: Launch FastAPI Backend in Window 2
:: -------------------------------------------------------------------
echo.
echo [2/4] Starting backend (python backend/main.py on port 5000)...
start "CarePulse - FastAPI Backend (Port 5000)" cmd /k "cd /d %PROJECT_DIR% && echo ======================================== && echo  CAREPULSE FASTAPI BACKEND (PORT 5000) && echo ======================================== && python backend/main.py"

:: Add a short delay (4 seconds) so backend binds to port 5000 before ngrok starts
echo       Waiting 4 seconds for backend to start listening on port 5000...
ping 127.0.0.1 -n 5 >nul

:: -------------------------------------------------------------------
:: STEP 3: Launch Ngrok Public Tunnel in Window 3
:: -------------------------------------------------------------------
echo.
echo [3/4] Starting ngrok tunnel (tunneling port 5000 to %NGROK_URL%)...
start "CarePulse - Ngrok Tunnel (Port 5000)" cmd /k "cd /d %PROJECT_DIR% && echo ======================================== && echo  CAREPULSE NGROK TUNNEL (PORT 5000) && echo ======================================== && ngrok.exe http --url=%NGROK_URL% 5000"

:: Short delay (2 seconds) before starting frontend
ping 127.0.0.1 -n 3 >nul

:: -------------------------------------------------------------------
:: STEP 4: Launch Vite React Frontend in Window 4
:: -------------------------------------------------------------------
echo.
echo [4/4] Starting frontend (npm run dev -- --host on port 5173)...
start "CarePulse - Vite Frontend (Port 5173)" cmd /k "cd /d %PROJECT_DIR%\frontend && echo ======================================== && echo  CAREPULSE VITE REACT FRONTEND && echo ======================================== && npm run dev -- --host"

:: -------------------------------------------------------------------
:: STEP 5: Summary Banner with Window Titles and URLs
:: -------------------------------------------------------------------
echo.
echo ===================================================================
echo                     CAREPULSE SERVICES STARTED                     
echo ===================================================================
echo.
echo  4 Independent Terminal Windows Opened:
echo    1. [SQL Shell (psql)]
echo    2. [CarePulse - FastAPI Backend (Port 5000)]
echo    3. [CarePulse - Ngrok Tunnel (Port 5000)]
echo    4. [CarePulse - Vite Frontend (Port 5173)]
echo.
echo  Quick Access Links:
echo    - Database Local:  localhost:5432 (carepulse_db)
echo    - Backend Local:   http://localhost:5000
echo    - Backend Swagger: http://localhost:5000/docs
echo    - Backend Public:  %NGROK_URL%
echo    - Frontend Local:  http://localhost:5173
echo.
echo  To shut down all services cleanly, run: stop-carepulse.bat
echo ===================================================================
echo.
pause
