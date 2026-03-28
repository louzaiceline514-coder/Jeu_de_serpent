#!/bin/bash

echo "================================"
echo "   Snake AI - Lancement Linux   "
echo "================================"
echo ""

# Verifier Python
if ! command -v python3 &> /dev/null; then
    echo "ERREUR: Python3 non trouve. Installez Python 3.10+"
    exit 1
fi

# Verifier Node.js
if ! command -v node &> /dev/null; then
    echo "ERREUR: Node.js non trouve. Installez Node.js 18+"
    exit 1
fi

# Installer dependances Python
echo "Installation dependances Python..."
cd backend
pip3 install -r requirements.txt --quiet
cd ..

# Installer dependances Node.js
echo "Installation dependances Node.js..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install --silent
fi
cd ..

# Lancer Backend en arriere-plan
echo ""
echo "Lancement Backend (port 8000)..."
cd backend
python3 -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Lancer Frontend en arriere-plan
echo "Lancement Frontend (port 5174)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Attendre un peu
sleep 3

# Ouvrir navigateur
echo ""
echo "Ouverture du navigateur..."
xdg-open http://localhost:5174 2>/dev/null || open http://localhost:5174 2>/dev/null || echo "Ouvrez manuellement: http://localhost:5174"

echo ""
echo "================================"
echo "  Snake AI est pret!"
echo "  http://localhost:5174"
echo ""
echo "Ctrl+C pour arreter"
echo "================================"

# Attendre les processus
wait
