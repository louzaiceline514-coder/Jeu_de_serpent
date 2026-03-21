@echo off
echo ================================
echo    Lancement Snake AI
echo ================================

echo [1/3] Demarrage du backend...
start "Backend - FastAPI" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --reload --port 8000"

timeout /t 3 /nobreak > nul

echo [2/3] Demarrage du frontend...
start "Frontend - Vite" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 4 /nobreak > nul

echo [3/3] Ouverture du navigateur...
start http://localhost:5173

echo Snake AI est pret !
