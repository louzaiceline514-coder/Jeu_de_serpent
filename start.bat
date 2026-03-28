@echo off
chcp 65001 > nul 2>&1
title Snake AI - Lancement

echo.
echo ================================
echo    Snake AI - Lancement
echo ================================
echo.

REM Verifier Python
python --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Python non trouve. Installez Python 3.10+
    echo https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Verifier Node.js
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Node.js non trouve. Installez Node.js 18+
    echo https://nodejs.org/
    pause
    exit /b 1
)

REM Installer dependances Python
echo Installation dependances Python...
cd backend
pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo ERREUR: Installation Python echouee
    pause
    exit /b 1
)
cd ..

REM Installer dependances Node.js
echo Installation dependances Node.js...
cd frontend
if not exist "node_modules" (
    npm install --silent
    if %errorlevel% neq 0 (
        echo ERREUR: npm install echouee
        pause
        exit /b 1
    )
)
cd ..

REM Lancer Backend
echo.
echo Lancement Backend (port 8000)...
start "Snake AI - Backend" cmd /k "cd backend && python -m uvicorn main:app --reload --port 8000"
timeout /t 3 /nobreak > nul

REM Lancer Frontend
echo Lancement Frontend (port 5174)...
start "Snake AI - Frontend" cmd /k "cd frontend && npm run dev"
timeout /t 3 /nobreak > nul

REM Ouvrir navigateur
echo.
echo Ouverture du navigateur...
start http://localhost:5174

echo.
echo ================================
echo    Snake AI est pret!
echo    http://localhost:5174
echo ================================
echo.
pause
