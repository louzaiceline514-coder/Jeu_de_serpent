@echo off
chcp 65001 > nul
title Snake AI - Installation et lancement

echo.
echo ╔══════════════════════════════════════════╗
echo ║          Snake AI - SAE4 UPJV            ║
echo ║    Installation et lancement automatique ║
echo ╚══════════════════════════════════════════╝
echo.

REM ─────────────────────────────────────────────
REM  Verification de Python
REM ─────────────────────────────────────────────
echo [Verification] Python...
python --version > nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ERREUR : Python n'est pas installe ou pas dans le PATH.
    echo  Installez Python 3.10+ depuis https://www.python.org/downloads/
    echo  Cochez bien "Add Python to PATH" lors de l'installation.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo  OK : %%i

REM ─────────────────────────────────────────────
REM  Verification de Node.js
REM ─────────────────────────────────────────────
echo [Verification] Node.js...
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ERREUR : Node.js n'est pas installe ou pas dans le PATH.
    echo  Installez Node.js 18+ depuis https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version 2^>^&1') do echo  OK : Node.js %%i

echo.

REM ─────────────────────────────────────────────
REM  Installation des dependances Python
REM ─────────────────────────────────────────────
echo [1/4] Installation des dependances Python (pip)...
python -m pip install -r "%~dp0requirements.txt" --quiet --disable-pip-version-check
if %errorlevel% neq 0 (
    echo  ERREUR : L'installation pip a echoue.
    echo  Essayez manuellement : pip install -r requirements.txt
    pause
    exit /b 1
)
echo  OK : dependances Python installees.

REM ─────────────────────────────────────────────
REM  Installation des dependances Node.js
REM ─────────────────────────────────────────────
echo [2/4] Installation des dependances Node.js (npm)...
if not exist "%~dp0frontend\node_modules" (
    cd /d "%~dp0frontend"
    npm install --silent
    if %errorlevel% neq 0 (
        echo  ERREUR : npm install a echoue.
        pause
        exit /b 1
    )
    echo  OK : node_modules installe.
) else (
    echo  OK : node_modules deja present, installation ignoree.
)

echo.

REM ─────────────────────────────────────────────
REM  Lancement du backend
REM ─────────────────────────────────────────────
echo [3/4] Demarrage du backend FastAPI (port 8000)...
start "Snake AI - Backend" cmd /k "title Backend FastAPI && cd /d %~dp0backend && python -m uvicorn main:app --reload --port 8000"
timeout /t 4 /nobreak > nul

REM ─────────────────────────────────────────────
REM  Lancement du frontend
REM ─────────────────────────────────────────────
echo [4/4] Demarrage du frontend Vite...
start "Snake AI - Frontend" cmd /k "title Frontend Vite && cd /d %~dp0frontend && npm run dev"
timeout /t 5 /nobreak > nul

REM ─────────────────────────────────────────────
REM  Ouverture du navigateur
REM ─────────────────────────────────────────────
echo.
echo  Ouverture du navigateur...
start http://localhost:5174

echo.
echo ╔══════════════════════════════════════════╗
echo ║   Snake AI est pret !                    ║
echo ║   http://localhost:5174                  ║
echo ║                                          ║
echo ║   Fermez les deux fenetres pour stopper  ║
echo ╚══════════════════════════════════════════╝
echo.
