#!/bin/bash
# start.command — Script de lancement macOS (double-clic depuis le Finder)
# Si macOS bloque l'exécution : clic droit → Ouvrir → Ouvrir quand même
# Ou dans Terminal : chmod +x start.command && ./start.command

# cd vers le dossier du script (nécessaire pour double-clic Finder)
cd "$(dirname "$0")"
SCRIPT_DIR="$(pwd)"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║          Snake AI - SAE4 UPJV            ║"
echo "║    Installation et lancement automatique ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Verification Python
echo "[Vérification] Python..."
if ! command -v python3 &>/dev/null; then
    echo " ERREUR : Python3 n'est pas installé."
    echo " Installez-le depuis https://www.python.org/downloads/"
    echo " Ou via Homebrew : brew install python3"
    echo ""
    echo "Appuyez sur Entrée pour fermer..."
    read
    exit 1
fi
echo " OK : $(python3 --version)"

# Verification Node.js
echo "[Vérification] Node.js..."
if ! command -v node &>/dev/null; then
    echo " ERREUR : Node.js n'est pas installé."
    echo " Installez-le depuis https://nodejs.org/"
    echo " Ou via Homebrew : brew install node"
    echo ""
    echo "Appuyez sur Entrée pour fermer..."
    read
    exit 1
fi
echo " OK : Node.js $(node --version)"

echo ""

# Installation dependances Python
echo "[1/4] Installation des dépendances Python..."
python3 -m pip install -r "$SCRIPT_DIR/backend/requirements.txt" --quiet
if [ $? -ne 0 ]; then
    echo " ERREUR : pip install a échoué."
    echo " Essayez manuellement : pip3 install -r backend/requirements.txt"
    echo ""
    echo "Appuyez sur Entrée pour fermer..."
    read
    exit 1
fi
echo " OK"

# Installation dependances Node.js
echo "[2/4] Installation des dépendances Node.js..."
if [ ! -d "$SCRIPT_DIR/frontend/node_modules" ]; then
    cd "$SCRIPT_DIR/frontend" && npm install --silent
    if [ $? -ne 0 ]; then
        echo " ERREUR : npm install a échoué."
        echo ""
        echo "Appuyez sur Entrée pour fermer..."
        read
        exit 1
    fi
    echo " OK : node_modules installé."
else
    echo " OK : node_modules déjà présent."
fi

echo ""

# Lancement backend
echo "[3/4] Démarrage du backend FastAPI (port 8000)..."
cd "$SCRIPT_DIR/backend"
python3 -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
sleep 4

# Lancement frontend
echo "[4/4] Démarrage du frontend Vite..."
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
echo "║   Snake AI est prêt !                    ║"
echo "║   http://localhost:5174                  ║"
echo "║                                          ║"
echo "║   Appuyez sur Ctrl+C pour stopper        ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Attente et nettoyage propre
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait
