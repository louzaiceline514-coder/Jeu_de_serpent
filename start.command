#!/bin/bash

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║          Snake AI - SAE4 UPJV            ║"
echo "║    Installation et lancement automatique ║"
echo "╚══════════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Verification Python
echo "[Verification] Python..."
if ! command -v python3 &>/dev/null; then
    echo " ERREUR : Python3 n'est pas installe."
    echo " Installez-le depuis https://www.python.org/downloads/"
    exit 1
fi
echo " OK : $(python3 --version)"

# Verification Node.js
echo "[Verification] Node.js..."
if ! command -v node &>/dev/null; then
    echo " ERREUR : Node.js n'est pas installe."
    echo " Installez-le depuis https://nodejs.org/"
    exit 1
fi
echo " OK : Node.js $(node --version)"

echo ""

# Installation dependances Python
echo "[1/4] Installation des dependances Python..."
python3 -m pip install -r "$SCRIPT_DIR/backend/requirements.txt" --quiet
echo " OK"

# Installation dependances Node.js
echo "[2/4] Installation des dependances Node.js..."
if [ ! -d "$SCRIPT_DIR/frontend/node_modules" ]; then
    cd "$SCRIPT_DIR/frontend" && npm install --silent
    echo " OK : node_modules installe."
else
    echo " OK : node_modules deja present."
fi

echo ""

# Lancement backend
echo "[3/4] Demarrage du backend FastAPI (port 8000)..."
cd "$SCRIPT_DIR/backend"
python3 -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
sleep 4

# Lancement frontend
echo "[4/4] Demarrage du frontend Vite..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
sleep 5

# Ouverture navigateur (macOS)
echo ""
echo " Ouverture du navigateur..."
open http://localhost:5174

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   Snake AI est pret !                    ║"
echo "║   http://localhost:5174                  ║"
echo "║                                          ║"
echo "║   Appuyez sur Ctrl+C pour stopper        ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Attente et nettoyage propre
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait
