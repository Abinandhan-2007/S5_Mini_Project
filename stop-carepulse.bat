@echo off
setlocal EnableDelayedExpansion

:: ===================================================================
:: CarePulse - One-Click Multi-Service Stopper
:: Project Root: E:\S5_Mini_Project
:: Finds and terminates:
::   1. Ngrok tunnel process (ngrok.exe)
::   2. FastAPI Backend process (listening on port 5000)
::   3. Vite React Frontend process (listening on port 5173)
:: ===================================================================

title CarePulse Service Stopper

echo ===================================================================
echo                     CAREPULSE SERVICE STOPPER                      
echo ===================================================================
echo.

set "STOPPED_COUNT=0"

:: -------------------------------------------------------------------
:: 1. Stop Ngrok Tunnel
:: -------------------------------------------------------------------
echo [1/3] Checking and stopping ngrok.exe...
tasklist /fi "imagename eq ngrok.exe" | findstr /i "ngrok.exe" >nul 2>&1
if not errorlevel 1 (
    taskkill /f /im ngrok.exe >nul 2>&1
    echo       [OK] ngrok.exe process terminated.
    set /a STOPPED_COUNT+=1
) else (
    echo       [--] ngrok.exe was not running.
)

:: -------------------------------------------------------------------
:: 2. Stop Backend Process (Port 5000)
:: -------------------------------------------------------------------
echo.
echo [2/3] Checking and stopping Backend on Port 5000...
set "FOUND_5000=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":5000 .*LISTENING"') do (
    set "PID_5000=%%a"
    if not "!PID_5000!"=="0" (
        echo       [OK] Terminating backend process PID: !PID_5000!...
        taskkill /f /pid !PID_5000! >nul 2>&1
        set "FOUND_5000=1"
        set /a STOPPED_COUNT+=1
    )
)
if "!FOUND_5000!"=="0" (
    echo       [--] No service was active on port 5000.
)

:: -------------------------------------------------------------------
:: 3. Stop Frontend Dev Server (Port 5173)
:: -------------------------------------------------------------------
echo.
echo [3/3] Checking and stopping Frontend on Port 5173...
set "FOUND_5173=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":5173 .*LISTENING"') do (
    set "PID_5173=%%a"
    if not "!PID_5173!"=="0" (
        echo       [OK] Terminating frontend process PID: !PID_5173!...
        taskkill /f /pid !PID_5173! >nul 2>&1
        set "FOUND_5173=1"
        set /a STOPPED_COUNT+=1
    )
)
if "!FOUND_5173!"=="0" (
    echo       [--] No service was active on port 5173.
)

:: -------------------------------------------------------------------
:: Summary
:: -------------------------------------------------------------------
echo.
echo ===================================================================
echo                        SHUTDOWN COMPLETE                           
echo ===================================================================
echo All CarePulse background and foreground services are now stopped.
echo Stopped service instances: %STOPPED_COUNT%
echo ===================================================================
echo.
pause
