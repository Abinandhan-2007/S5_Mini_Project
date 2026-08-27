@echo off
setlocal EnableDelayedExpansion

:: ===================================================================
:: CarePulse - One-Click Multi-Service & Terminal Window Stopper
:: Project Root: E:\S5_Mini_Project
:: Finds and closes:
::   1. CarePulse Terminal Windows (SQL Shell, Backend, Ngrok, Frontend)
::   2. Ngrok tunnel process (ngrok.exe)
::   3. FastAPI Backend process (listening on port 5000)
::   4. Vite React Frontend process (listening on port 5173)
::   5. PostgreSQL Database (Docker container / Windows Service)
:: ===================================================================

title CarePulse Service Stopper

set "PROJECT_DIR=E:\S5_Mini_Project"

echo ===================================================================
echo                     CAREPULSE SERVICE STOPPER                      
echo ===================================================================
echo.

set "STOPPED_COUNT=0"

:: -------------------------------------------------------------------
:: 1. Close All CarePulse Terminal Windows (CMD & SQL Shell instances)
:: -------------------------------------------------------------------
echo [1/5] Closing CarePulse terminal windows...
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { ($_.Name -in @('cmd.exe','psql.exe')) -and ($_.CommandLine -like '*S5_Mini_Project*' -or $_.CommandLine -like '*CAREPULSE*' -or $_.CommandLine -like '*backend/main.py*' -or $_.CommandLine -like '*ngrok*' -or $_.CommandLine -like '*npm run dev*' -or $_.CommandLine -like '*runpsql*' -or $_.CommandLine -like '*psql.exe*') -and $_.CommandLine -notlike '*stop-carepulse*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; Write-Host '      [OK] Closed terminal window (PID:' $_.ProcessId ')' }"
if not errorlevel 1 (
    set /a STOPPED_COUNT+=1
)

:: -------------------------------------------------------------------
:: 2. Stop Ngrok Tunnel Process
:: -------------------------------------------------------------------
echo.
echo [2/5] Checking and stopping ngrok.exe...
tasklist /fi "imagename eq ngrok.exe" | findstr /i "ngrok.exe" >nul 2>&1
if not errorlevel 1 (
    taskkill /f /im ngrok.exe >nul 2>&1
    echo       [OK] ngrok.exe process terminated.
    set /a STOPPED_COUNT+=1
) else (
    echo       [--] ngrok.exe was not running.
)

:: -------------------------------------------------------------------
:: 3. Stop Backend Process (Port 5000)
:: -------------------------------------------------------------------
echo.
echo [3/5] Checking and stopping Backend on Port 5000...
set "FOUND_5000=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":5000 .*LISTENING"') do (
    set "PID_5000=%%a"
    if not "!PID_5000!"=="0" (
        echo       [OK] Terminating backend process PID: !PID_5000!...
        taskkill /f /t /pid !PID_5000! >nul 2>&1
        set "FOUND_5000=1"
        set /a STOPPED_COUNT+=1
    )
)
if "!FOUND_5000!"=="0" (
    echo       [--] No service was active on port 5000.
)

:: -------------------------------------------------------------------
:: 4. Stop Frontend Dev Server (Port 5173)
:: -------------------------------------------------------------------
echo.
echo [4/5] Checking and stopping Frontend on Port 5173...
set "FOUND_5173=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":5173 .*LISTENING"') do (
    set "PID_5173=%%a"
    if not "!PID_5173!"=="0" (
        echo       [OK] Terminating frontend process PID: !PID_5173!...
        taskkill /f /t /pid !PID_5173! >nul 2>&1
        set "FOUND_5173=1"
        set /a STOPPED_COUNT+=1
    )
)
if "!FOUND_5173!"=="0" (
    echo       [--] No service was active on port 5173.
)

:: -------------------------------------------------------------------
:: 5. Stop Database (Docker container / PostgreSQL Service)
:: -------------------------------------------------------------------
echo.
echo [5/5] Checking and stopping PostgreSQL Database...
set "DB_STOPPED=0"

REM Stop Docker container if Docker is running
where docker >nul 2>&1
if not errorlevel 1 (
    cd /d %PROJECT_DIR%
    docker-compose down >nul 2>&1
    if not errorlevel 1 (
        echo       [OK] Docker PostgreSQL container stopped.
        set "DB_STOPPED=1"
        set /a STOPPED_COUNT+=1
    )
)

REM Stop Windows PostgreSQL Service if running
sc query postgresql-x64-18 | findstr "STATE" | findstr "RUNNING" >nul 2>&1
if not errorlevel 1 (
    echo       Stopping Windows PostgreSQL service...
    net stop postgresql-x64-18 >nul 2>&1
    if not errorlevel 1 (
        echo       [OK] Windows PostgreSQL service stopped.
        set "DB_STOPPED=1"
        set /a STOPPED_COUNT+=1
    ) else (
        powershell -NoProfile -Command "Get-Service *postgres* -ErrorAction SilentlyContinue | Where-Object {$_.Status -eq 'Running'} | Stop-Service -ErrorAction SilentlyContinue" >nul 2>&1
        echo       [OK] Windows PostgreSQL service stop command sent.
        set "DB_STOPPED=1"
        set /a STOPPED_COUNT+=1
    )
)

if "!DB_STOPPED!"=="0" (
    netstat -ano | findstr /R /C:":5432 .*LISTENING" >nul 2>&1
    if errorlevel 1 (
        echo       [--] PostgreSQL database was not running.
    ) else (
        echo       [--] PostgreSQL database is active on port 5432.
    )
)

:: -------------------------------------------------------------------
:: Summary
:: -------------------------------------------------------------------
echo.
echo ===================================================================
echo                        SHUTDOWN COMPLETE                           
echo ===================================================================
echo All CarePulse terminal windows and background services are closed.
echo Stopped service instances: %STOPPED_COUNT%
echo ===================================================================
echo.
pause
