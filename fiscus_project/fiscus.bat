@echo off
chcp 65001 >nul
title FISCUS - Unified Launcher
color 0A

:MENU
cls
echo.
echo  ╔═══════════════════════════════════════════════════════════╗
echo  ║                                                           ║
echo  ║     ███████╗██╗███████╗ ██████╗██╗   ██╗███████╗          ║
echo  ║     ██╔════╝██║██╔════╝██╔════╝██║   ██║██╔════╝          ║
echo  ║     █████╗  ██║███████╗██║     ██║   ██║███████╗          ║
echo  ║     ██╔══╝  ██║╚════██║██║     ██║   ██║╚════██║          ║
echo  ║     ██║     ██║███████║╚██████╗╚██████╔╝███████║          ║
echo  ║     ╚═╝     ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚══════╝          ║
echo  ║                                                           ║
echo  ║              Price Comparison Application                 ║
echo  ╚═══════════════════════════════════════════════════════════╝
echo.
echo  ┌───────────────────────────────────────────────────────────┐
echo  │  Choose an option:                                        │
echo  │                                                           │
echo  │    [1] Start Docker Backend (DB, Redis, Django, Celery)   │
echo  │    [2] Start Frontend (Expo Web)                          │
echo  │    [3] Start ALL Services (Docker + Frontend Web)         │
echo  │    [4] Stop All Docker Services                           │
echo  │    [5] View Docker Logs                                   │
echo  │    [6] Reinstall Frontend Dependencies                    │
echo  │    [7] Install ALL Dependencies (Python + Node.js)        │
echo  │    [8] Start Backend Locally (without Docker)             │
echo  │    [9] Run Product Scraper                                │
echo  │    [0] Exit                                               │
echo  │                                                           │
echo  └───────────────────────────────────────────────────────────┘
echo.

set /p choice="  Enter choice [0-9]: "

if "%choice%"=="1" goto DOCKER_START
if "%choice%"=="2" goto FRONTEND_START
if "%choice%"=="3" goto START_ALL
if "%choice%"=="4" goto DOCKER_STOP
if "%choice%"=="5" goto DOCKER_LOGS
if "%choice%"=="6" goto FRONTEND_REINSTALL
if "%choice%"=="7" goto INSTALL_ALL_DEPS
if "%choice%"=="8" goto LOCAL_BACKEND
if "%choice%"=="9" goto RUN_SCRAPER
if "%choice%"=="0" goto EXIT

echo.
echo  [!] Invalid choice. Press any key to try again...
pause >nul
goto MENU

:DOCKER_START
cls
echo.
echo  ════════════════════════════════════════════════════════════
echo    Starting Docker Backend Services...
echo  ════════════════════════════════════════════════════════════
echo.

cd /d "%~dp0"

echo  [1/5] Stopping old containers...
docker-compose down

echo.
echo  [2/5] Building images (includes pip install requirements.txt)...
docker-compose build

echo.
echo  [3/5] Starting services...
docker-compose up -d

echo.
echo  [4/5] Waiting for database to be ready...
timeout /t 10 /nobreak >nul

echo.
echo  [5/5] Running migrations...
docker-compose exec -T web python manage.py migrate

echo.
echo  ════════════════════════════════════════════════════════════
echo    ✓ Docker Backend is running!
echo  ════════════════════════════════════════════════════════════
echo.
echo    Services:
echo      • API:        http://localhost:8000
echo      • Admin:      http://localhost:8000/admin
echo      • Selenium:   http://localhost:4444
echo.
echo    Containers: PostgreSQL, Redis, Django, Celery, Selenium
echo.
echo  ────────────────────────────────────────────────────────────
echo.
pause
goto MENU

:FRONTEND_START
cls
echo.
echo  ════════════════════════════════════════════════════════════
echo    Starting Frontend (Expo Web)
echo  ════════════════════════════════════════════════════════════
echo.

cd /d "%~dp0frontend"

echo  [1/4] Cleaning Metro cache...
rmdir /s /q node_modules\.cache 2>nul
rmdir /s /q .expo 2>nul

echo.
echo  [2/4] Checking dependencies...
if not exist node_modules (
    echo.
    echo  [!] node_modules not found. Installing dependencies...
    echo      This may take a few minutes on first run...
    echo.
    call npm install
)

echo.
echo  [3/4] Verifying expo-cli...
call npm list expo >nul 2>&1
if errorlevel 1 (
    echo  [!] Installing missing Expo packages...
    call npm install
)

echo.
echo  [4/4] Starting Expo Web Server...
echo.
echo    ╔═════════════════════════════════════════════╗
echo    ║  Web app will open at: http://localhost:8081  ║
echo    ╚═════════════════════════════════════════════╝
echo.

call npx expo start --web --clear

pause
goto MENU

:START_ALL
cls
echo.
echo  ════════════════════════════════════════════════════════════
echo    Starting ALL Services (Docker + Frontend Web)
echo  ════════════════════════════════════════════════════════════
echo.

cd /d "%~dp0"

echo  [1/6] Stopping old containers...
docker-compose down

echo.
echo  [2/6] Building Docker images (includes pip install)...
docker-compose build

echo.
echo  [3/6] Starting Docker services...
docker-compose up -d

echo.
echo  [4/6] Waiting for database...
timeout /t 10 /nobreak >nul

echo  [5/6] Running migrations...
docker-compose exec -T web python manage.py migrate

echo.
echo  ════════════════════════════════════════════════════════════
echo    ✓ Docker Backend is running!
echo  ════════════════════════════════════════════════════════════
echo.
echo    • API:        http://localhost:8000
echo    • Admin:      http://localhost:8000/admin
echo.

echo  [6/6] Preparing Frontend...
cd /d "%~dp0frontend"

if not exist node_modules (
    echo.
    echo  [!] Installing frontend dependencies ^(first run^)...
    echo      This may take 2-5 minutes...
    echo.
    call npm install
)

echo.
echo  ════════════════════════════════════════════════════════════
echo    Starting Frontend in new window...
echo  ════════════════════════════════════════════════════════════
echo.

start "FISCUS Frontend" cmd /k "cd /d %~dp0frontend && echo Starting Expo Web... && npx expo start --web --clear"

echo.
echo    ╔═══════════════════════════════════════════════════════╗
echo    ║              ALL SERVICES STARTED!                    ║
echo    ╠═══════════════════════════════════════════════════════╣
echo    ║  Backend API:    http://localhost:8000                ║
echo    ║  Frontend Web:   http://localhost:8081                ║
echo    ║  Admin Panel:    http://localhost:8000/admin          ║
echo    ╚═══════════════════════════════════════════════════════╝
echo.
echo    Frontend is running in a separate window.
echo    Press Ctrl+C in that window to stop frontend.
echo.
pause
goto MENU

:DOCKER_STOP
cls
echo.
echo  ════════════════════════════════════════════════════════════
echo    Stopping All Docker Services...
echo  ════════════════════════════════════════════════════════════
echo.

cd /d "%~dp0"
docker-compose down

echo.
echo    ✓ All Docker services stopped
echo.
pause
goto MENU

:DOCKER_LOGS
cls
echo.
echo  ════════════════════════════════════════════════════════════
echo    Viewing Docker Logs (Press Ctrl+C to exit)
echo  ════════════════════════════════════════════════════════════
echo.

cd /d "%~dp0"
docker-compose logs -f

pause
goto MENU

:FRONTEND_REINSTALL
cls
echo.
echo  ════════════════════════════════════════════════════════════
echo    Reinstalling Frontend Dependencies
echo  ════════════════════════════════════════════════════════════
echo.

cd /d "%~dp0frontend"

echo  [1/5] Removing old node_modules...
if exist node_modules rmdir /s /q node_modules

echo  [2/5] Removing package-lock.json...
if exist package-lock.json del package-lock.json

echo  [3/5] Removing .expo cache...
if exist .expo rmdir /s /q .expo

echo.
echo  [4/5] Installing fresh dependencies (this may take a few minutes)...
call npm install

echo.
echo  [5/5] Starting Expo Web...
call npx expo start --web --clear

pause
goto MENU

:INSTALL_ALL_DEPS
cls
echo.
echo  ════════════════════════════════════════════════════════════
echo    Installing ALL Dependencies
echo  ════════════════════════════════════════════════════════════
echo.

echo  ┌─────────────────────────────────────────────────────────┐
echo  │  BACKEND (Python requirements.txt)                      │
echo  └─────────────────────────────────────────────────────────┘
echo.

cd /d "%~dp0backend"

echo  [1/4] Creating Python virtual environment...
if not exist venv (
    python -m venv venv
    echo       ✓ Virtual environment created
) else (
    echo       ✓ Virtual environment already exists
)

echo.
echo  [2/4] Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo  [3/4] Installing Python packages from requirements.txt...
pip install -r requirements.txt

echo.
echo  ┌─────────────────────────────────────────────────────────┐
echo  │  FRONTEND (npm packages)                                │
echo  └─────────────────────────────────────────────────────────┘
echo.

cd /d "%~dp0frontend"

echo  [4/4] Installing Node.js packages...
call npm install

echo.
echo  ════════════════════════════════════════════════════════════
echo    ✓ All dependencies installed!
echo  ════════════════════════════════════════════════════════════
echo.
echo    Backend:  venv created with all Python packages
echo    Frontend: node_modules installed
echo.
echo    You can now run:
echo      • Option [1] or [3] for Docker deployment
echo      • Option [8] for local backend development
echo.
pause
goto MENU

:LOCAL_BACKEND
cls
echo.
echo  ════════════════════════════════════════════════════════════
echo    Starting Backend Locally (without Docker)
echo  ════════════════════════════════════════════════════════════
echo.
echo    NOTE: This uses SQLite database locally.
echo          For PostgreSQL, use Docker (option 1 or 3).
echo.

cd /d "%~dp0backend"

echo  [1/4] Checking virtual environment...
if not exist venv (
    echo  [!] Virtual environment not found. Creating...
    python -m venv venv
)

echo.
echo  [2/4] Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo  [3/4] Installing/updating requirements...
pip install -r requirements.txt -q

echo.
echo  [4/4] Running migrations and starting server...
python manage.py migrate
echo.
echo    ╔═════════════════════════════════════════════╗
echo    ║  Backend running at: http://localhost:8000  ║
echo    ╚═════════════════════════════════════════════╝
echo.
python manage.py runserver

pause
goto MENU

:RUN_SCRAPER
cls
echo.
echo  ════════════════════════════════════════════════════════════
echo    Running Product Scraper
echo  ════════════════════════════════════════════════════════════
echo.
echo    Scraping products from Ukrainian grocery stores...
echo    ATB, Silpo, Novus, Varus, Auchan, Metro, Fozzy,
echo    MegaMarket, Eko, Fora
echo.

cd /d "%~dp0backend"

echo  [1/3] Checking virtual environment...
if not exist venv (
    echo  [!] Virtual environment not found. Creating...
    python -m venv venv
)

echo.
echo  [2/3] Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo  [3/3] Starting scraper...
echo.
echo    ╔═════════════════════════════════════════════╗
echo    ║  Scraper running — results → products.db    ║
echo    ╚═════════════════════════════════════════════╝
echo.

python -m apps.scraper.main

echo.
echo  ════════════════════════════════════════════════════════════
echo    ✓ Scraping complete! Data saved to backend\products.db
echo  ════════════════════════════════════════════════════════════
echo.
pause
goto MENU

:EXIT
cls
echo.
echo    Thank you for using FISCUS!
echo.
timeout /t 2 >nul
exit /b 0
