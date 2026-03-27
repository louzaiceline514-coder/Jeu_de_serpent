# Manuel d'installation — Snake AI
## SAE4 — Licence Informatique 3e année — UPJV

---

## Prérequis

| Logiciel | Version minimale | Vérification |
|---|---|---|
| Python | 3.10+ | `python --version` (Windows) / `python3 --version` (Linux/macOS) |
| pip | Inclus avec Python 3.10+ | `pip --version` |
| Node.js | 18+ | `node --version` |
| npm | Inclus avec Node.js | `npm --version` |
| Git | Toute version récente | `git --version` |

> **Windows :** lors de l'installation Python, cochez impérativement **"Add Python to PATH"**.

---

## 1. Récupérer le projet

```bash
git clone https://github.com/louzaiceline514-coder/SnakeGAME_final.git
cd SnakeGAME_final
```

Ou décompresser l'archive ZIP fournie et se placer dans le dossier racine.

---

## 2. Lancement automatique (recommandé)

### Windows

Double-cliquez sur **`start.bat`** à la racine du projet.

Le script vérifie Python et Node.js, installe les dépendances si nécessaire,
démarre le backend et le frontend, et ouvre automatiquement le navigateur sur
**http://localhost:5174**.

### Linux

```bash
chmod +x start.sh
./start.sh
```

### macOS

Double-cliquez sur **`start.command`** depuis le Finder.

Si macOS bloque l'exécution (Gatekeeper) :
- Clic droit sur `start.command` → **Ouvrir** → **Ouvrir quand même**

Ou depuis le terminal :
```bash
chmod +x start.command
./start.command
```

---

## 3. Installation manuelle étape par étape

### 3.1 Backend (FastAPI + Python)

**Windows :**
```cmd
cd backend
pip install -r requirements.txt
```

**Linux / macOS :**
```bash
cd backend
pip3 install -r requirements.txt
```

**Dépendances installées :**

| Bibliothèque | Version | Rôle |
|---|---|---|
| fastapi | 0.115.0 | Framework web + WebSocket |
| uvicorn | 0.30.0 | Serveur ASGI |
| sqlalchemy | 2.0.36 | ORM SQLite |
| numpy | 2.1.2 | Encodage état Q-Learning |
| orjson | 3.10.7 | Sérialisation JSON rapide |
| websockets | 13.1 | Support WebSocket bas niveau |
| httpx | 0.27.2 | Client HTTP (tests) |
| pytest | 8.3.3 | Tests unitaires |

### 3.2 Frontend (React + Vite)

```bash
cd frontend
npm install
```

Ceci installe toutes les dépendances listées dans `package.json`, notamment :
- React 18, Redux Toolkit, Recharts, Tailwind CSS
- Vitest, @testing-library/react (tests)

---

## 4. Lancement manuel

Ouvrir **deux terminaux** séparés.

### Terminal 1 — Backend

**Windows :**
```cmd
cd backend
python -m uvicorn main:app --reload --port 8000
```

**Linux / macOS :**
```bash
cd backend
python3 -m uvicorn main:app --reload --port 8000
```

Le backend est disponible sur **http://localhost:8000**.

La documentation Swagger est accessible sur **http://localhost:8000/docs**.

La base de données `snake.db` est **créée automatiquement** à la racine du projet
lors du premier démarrage.

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

L'application est accessible sur **http://localhost:5174**.

---

## 5. Vérification de l'installation

1. Ouvrez **http://localhost:5174** dans votre navigateur.
2. L'indicateur en haut à droite de la navbar doit afficher un **point vert "OK"**
   (connexion WebSocket active).
3. Si le point est rouge, vérifiez que le backend est bien démarré sur le port 8000.

### Test de l'API (optionnel)

```bash
curl http://localhost:8000/api/health
# Réponse attendue : {"status": "ok"}
```

---

## 6. Lancer les tests

### Tests backend (pytest)

Depuis la **racine du projet** :

```bash
python -m pytest tests/ -v
```

**Ou** depuis le dossier `backend/` :

```bash
cd backend
python -m pytest tests/ -v
```

Résultat attendu : **107 tests passés** (aucun échec).

### Tests frontend (Vitest)

```bash
cd frontend
npm test
```

---

## 7. Structure des fichiers générés automatiquement

| Fichier | Généré par | Contenu |
|---|---|---|
| `snake.db` | Backend (premier démarrage) | Base SQLite avec 3 agents (humain, astar, rl) |
| `qtable.json` | Panneau Entraînement (après un entraînement RL) | Q-table 254 états × 4 valeurs |
| `training_results.csv` | Panneau Entraînement (après un benchmark/entraînement) | Scores par épisode |

> **Note :** Si vous avez une `snake.db` d'une ancienne version, supprimez-la
> et relancez le backend pour recréer les tables correctement.

---

## 8. Dépannage

| Problème | Cause probable | Solution |
|---|---|---|
| `uvicorn: command not found` | uvicorn non installé | `pip install uvicorn` dans l'environnement actif |
| `python: command not found` (Linux/macOS) | Python 3 accessible sous `python3` | Utiliser `python3` et `pip3` |
| Erreur CORS au lancement | Frontend sur un port différent de 5174 | Ajouter le port dans `CORS_ORIGINS` dans `backend/config.py` |
| Port 8000 déjà utilisé | Autre processus sur le port | `lsof -i :8000` (Linux/macOS) ou `netstat -ano | findstr 8000` (Windows) puis tuer le processus |
| Port 5174 déjà utilisé | Autre instance Vite active | Fermer l'autre instance ou changer le port dans `frontend/vite.config.js` |
| `snake.db` avec tables manquantes | Ancienne version de la BDD | Supprimer `snake.db`, relancer le backend |
| `npm install` échoue | Droits insuffisants ou npm obsolète | `npm install --legacy-peer-deps` ou mettre à jour npm : `npm install -g npm` |
| Tests frontend échouent (canvas) | Mock canvas absent | Vérifier que `frontend/src/tests/setup.js` existe et contient le mock `HTMLCanvasElement.prototype.getContext` |
| Tests frontend échouent (ResizeObserver) | Mock ResizeObserver absent | Vérifier que `setup.js` contient `global.ResizeObserver = class { ... }` |
| `ModuleNotFoundError: No module named 'fastapi'` | Dépendances Python non installées | `pip install -r backend/requirements.txt` |
