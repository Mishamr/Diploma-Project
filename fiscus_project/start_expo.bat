@echo off
setlocal enabledelayedexpansion
title Fiscus Expo Server

set "ROOT=%~dp0"
set "FRONTEND=%ROOT%frontend"

echo.
echo  [*] Killing old Node processes...
taskkill /f /im node.exe >nul 2>&1
ping -n 3 127.0.0.1 >nul

cd /d "%ROOT%"
echo  [*] Detecting LAN IP...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /r "192\.168\.[0-9]*\.[0-9]*"') do (
    set "LAN_IP=%%a"
    goto :GOTIP
)
:GOTIP
set "LAN_IP=%LAN_IP: =%"
if "%LAN_IP%"=="" set "LAN_IP=localhost"

echo  [OK] IP = %LAN_IP%
set REACT_NATIVE_PACKAGER_HOSTNAME=%LAN_IP%

echo  [*] Updating .env...
echo EXPO_PUBLIC_API_URL=http://%LAN_IP%:8000/api/v1> "%FRONTEND%\.env"
echo EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=834873653875-j72tdq1h10780c4cl3l84f6b09l1h40i.apps.googleusercontent.com>> "%FRONTEND%\.env"

echo.
echo  ============================================
echo   Expo QR will be at: exp://%LAN_IP%:8081
echo   Make sure phone is on SAME Wi-Fi
echo  ============================================
echo.

cd /d "%FRONTEND%"
npx expo start --clear
