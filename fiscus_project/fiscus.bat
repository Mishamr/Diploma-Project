@echo off
chcp 65001 >nul 2>&1
title Fiscus: Smart Price — Launcher
color 0A
setlocal enabledelayedexpansion

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"

:MENU
cls
echo.
echo   ============================================
echo        FISCUS: Smart Price  -  Launcher
echo   ============================================
echo.
echo     [1]  Start ALL (backend + frontend)
echo     [2]  Start Backend (Docker)
echo     [3]  Start Frontend (Expo)
echo     [4]  Install dependencies
    echo     [5]  Run scraper (ATB / Silpo)
echo     [6]  Django Shell
echo     [7]  Docker: Status / Logs
echo     [8]  Stop ALL
echo     [9]  Run Migrations
echo     [0]  Exit
echo.
echo   ============================================
echo.
set /p "CHOICE=  Select option: "

if "%CHOICE%"=="1" goto START_ALL
if "%CHOICE%"=="2" goto START_BACKEND
if "%CHOICE%"=="3" goto START_FRONTEND
if "%CHOICE%"=="4" goto INSTALL
if "%CHOICE%"=="5" goto SCRAPE
if "%CHOICE%"=="6" goto SHELL
if "%CHOICE%"=="7" goto STATUS
if "%CHOICE%"=="8" goto STOP_ALL
if "%CHOICE%"=="9" goto MIGRATE
if "%CHOICE%"=="0" goto EXIT

echo.
echo   [!] Unknown option: %CHOICE%
timeout /t 2 >nul
goto MENU

REM =============================================
:START_ALL
cls
echo.
echo   [*] Starting backend (Docker)...
echo.
pushd "%ROOT%"
docker compose up -d
popd
echo.
echo   [OK] Backend is running!
echo   [*] Backend: http://localhost:8000
echo   [*] API:     http://localhost:8000/api/v1/
echo.

echo   [*] Starting frontend (Expo)...
echo.
if not exist "%FRONTEND%\node_modules" (
    echo   [*] Installing dependencies...
    pushd "%FRONTEND%"
    call npm install
    popd
    echo.
)
pushd "%FRONTEND%"
echo   [*] Expo Dev Server starting...
echo   [*] Press Ctrl+C to stop
echo.
call npx expo start --web
popd
goto MENU

REM =============================================
:START_BACKEND
cls
echo.
echo   [*] Starting Docker services...
echo.
pushd "%ROOT%"
docker compose up -d
popd
echo.
echo   ============================================
echo   [OK] Backend is running!
echo.
echo   Backend:  http://localhost:8000
echo   API:      http://localhost:8000/api/v1/
echo   Admin:    http://localhost:8000/admin/
echo   ============================================
echo.
pause
goto MENU

REM =============================================
:START_FRONTEND
cls
echo.
echo   [*] Starting Frontend (Expo)...
echo.
if not exist "%FRONTEND%\node_modules" (
    echo   [*] Installing dependencies...
    pushd "%FRONTEND%"
    call npm install
    popd
    echo.
)
pushd "%FRONTEND%"
echo   ============================================
echo   Expo Dev Server
echo   Press Ctrl+C to stop
echo   ============================================
echo.
call npx expo start --web
popd
goto MENU

REM =============================================
:INSTALL
cls
echo.
echo   ============================================
echo     Installing dependencies
echo   ============================================
echo.

echo   [1/3] Docker...
where docker >nul 2>&1
if errorlevel 1 (
    echo   [!] Docker not found! https://www.docker.com/
) else (
    for /f "tokens=*" %%v in ('docker --version') do echo   [OK] %%v
)
echo.

echo   [2/3] Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo   [!] Node.js not found! https://nodejs.org/
) else (
    for /f "tokens=*" %%v in ('node --version') do echo   [OK] Node.js %%v
)
echo.

echo   [3/3] Frontend (npm install)...
if exist "%FRONTEND%\package.json" (
    pushd "%FRONTEND%"
    call npm install
    popd
    echo   [OK] Frontend dependencies installed!
) else (
    echo   [!] package.json not found!
)
echo.

echo   ============================================
echo   [*] Building Docker images...
echo   ============================================
echo.
pushd "%ROOT%"
docker compose build
popd
echo.
echo   [OK] Everything installed!
echo.
pause
goto MENU

REM =============================================
:SCRAPE
cls
echo.
echo   ============================================
echo     Run Scraper
echo   ============================================
echo.
    echo     [1] ATB
    echo     [2] Silpo
    echo     [3] Auchan
    echo     [0] All chains
    echo     [B] Back to main menu
    echo.
    set /p "SC=  Select chain: "

    if /i "%SC%"=="B" goto MENU

    set "CHAIN="
    if "%SC%"=="1" set "CHAIN=atb"
    if "%SC%"=="2" set "CHAIN=silpo"
    if "%SC%"=="3" set "CHAIN=auchan"

    pushd "%ROOT%"
    if "%SC%"=="0" (
        echo   [*] Scraping all chains...
        docker compose exec web python manage.py run_scraper --all
    ) else if "%CHAIN%"=="" (
        echo   [!] Unknown option
    ) else (
        echo   [*] Scraping %CHAIN%...
        docker compose exec web python manage.py run_scraper %CHAIN%
    )
    popd
echo.
echo   [OK] Scraping complete!
echo.
pause
goto MENU

REM =============================================
:SHELL
cls
echo.
echo   Django Shell (type exit() to quit)
echo.
pushd "%ROOT%"
docker compose exec web python manage.py shell
popd
goto MENU

REM =============================================
:STATUS
cls
echo.
echo   ============================================
echo     Docker Status
echo   ============================================
echo.
pushd "%ROOT%"
docker compose ps
popd
echo.
echo   [*] Show logs? (y/n)
set /p "LOGS="
if /i "%LOGS%"=="y" (
    pushd "%ROOT%"
    docker compose logs --tail=50 -f
    popd
)
goto MENU

REM =============================================
:STOP_ALL
cls
echo.
echo   [*] Stopping all services...
echo.
pushd "%ROOT%"
docker compose down
popd
echo.
echo   [OK] All services stopped!
echo.
pause
goto MENU

REM =============================================
:MIGRATE
cls
echo.
echo   ============================================
echo     Running Django Migrations
echo   ============================================
echo.
echo   [1/2] Making migrations...
echo.
pushd "%ROOT%"
docker compose exec web python manage.py makemigrations
echo.
echo   [2/2] Applying migrations...
echo.
docker compose exec web python manage.py migrate
popd
echo.
echo   [OK] Migrations complete!
echo.
pause
goto MENU

REM =============================================
:EXIT
cls
echo.
echo   Fiscus: Smart Price
echo   Goodbye!
echo.
timeout /t 2 >nul
exit /b 0
