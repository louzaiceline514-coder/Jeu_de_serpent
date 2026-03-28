# Architecture du projet — Snake AI
## Comment le backend est connecté au frontend

---

## Vue d'ensemble de l'architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Machine locale                                   │
│                                                                          │
│  ┌─────────────────────────┐         ┌────────────────────────────────┐ │
│  │   FRONTEND              │         │   BACKEND                      │ │
│  │   React 18 + Redux      │         │   FastAPI + Python             │ │
│  │   Vite dev server       │         │   Uvicorn ASGI                 │ │
│  │   port 5174             │         │   port 8000                    │ │
│  └────────────┬────────────┘         └──────────────┬─────────────────┘ │
│               │                                      │                   │
│               │  /ws  (WebSocket)   ←────────────────┤                   │
│               │  /api (REST HTTP)   ←────────────────┘                   │
│               │                                                          │
│               └─── Vite proxy (/api → :8000, /ws → :8000)               │
└─────────────────────────────────────────────────────────────────────────┘
                          │
                    Navigateur
                 http://localhost:5174
```

---

## 1. Proxy Vite — comment les deux serveurs communiquent

Le frontend tourne sur le port **5174** et le backend sur le port **8000**.
Le fichier `frontend/vite.config.js` configure un **proxy transparent** :

```js
// frontend/vite.config.js
proxy: {
  "/api": {
    target: "http://127.0.0.1:8000",  // toutes les requêtes /api/* → backend
    changeOrigin: true
  },
  "/ws": {
    target: "ws://127.0.0.1:8000",    // connexion WebSocket /ws → backend
    ws: true,
    changeOrigin: true
  }
}
```

**Résultat :** le frontend utilise des URLs relatives sans port :
- `axios.get('/api/stats/comparison')` → redirigé vers `http://127.0.0.1:8000/api/stats/comparison`
- `new WebSocket('ws://localhost:5174/ws')` → redirigé vers `ws://127.0.0.1:8000/ws`

Le backend configure aussi **CORSMiddleware** (ports 5173-5176 autorisés) pour les accès directs.

---

## 2. Connexion WebSocket — flux complet

```
useWebSocket.js (hook React)
        │
        │ 1. Calcule l'URL WS :
        │    DEV  : ws://localhost:5174/ws  (passe par le proxy Vite → port 8000)
        │    PROD : ws://hostname:8000/ws   (direct)
        │
        ▼
WSService.connect(url, onOpen, onMessage, onClose)   [services/websocket.js]
        │
        │ 2. new WebSocket(url)
        │
        ▼
Backend FastAPI — endpoint @app.websocket("/ws")     [main.py]
        │
        ▼
GameWebSocketManager.handle(websocket)               [websocket_handler.py]
        │
        │ 3. Accepte la connexion
        │ 4. Attend les messages client
        │ 5. Lance la game loop si message "start"
        │
        ▼
Boucle de jeu (asyncio) :
  ┌─────────────────────────────────────────────────────────┐
  │  Toutes les TICK_INTERVAL_MS millisecondes (défaut 150) │
  │                                                          │
  │  1. agent.choisir_action(state)  →  direction           │
  │  2. moteur.step()                →  nouvel état         │
  │  3. Construire le message :                             │
  │     - 1er frame : {"type": "game_state", ...tout...}   │
  │     - suivants  : {"type": "game_delta", ...partiel...} │
  │  4. orjson.dumps(message)  →  bytes                    │
  │  5. websocket.send_bytes(bytes)  →  Frontend            │
  └─────────────────────────────────────────────────────────┘
        │
        ▼
WSService.ws.onmessage(event)                        [services/websocket.js]
        │
        │ 6. event.data est un Blob (binaire orjson)
        │    → event.data.text()  →  string JSON
        │    → JSON.parse(string)  →  objet JS
        │
        ▼
handleMessage(data) dans useWebSocket.js
        │
        │ 7. Si data.type === "game_state"  → dispatch(setGameState(data.payload))
        │    Si data.type === "game_delta"  → dispatch(applyDelta(data.payload))
        │
        ▼
Redux Store — gameSlice                              [store/gameSlice.js]
        │
        ▼
React re-render : Snake.jsx redessine le canvas entityCanvas
```

### Messages client → backend (WebSocket)

Le frontend envoie des commandes via `wsService.send(type, payload)` :

```
wsService.send("set_mode",   { mode: "astar" })      // changer de mode
wsService.send("start",      {})                      // démarrer la partie
wsService.send("set_paused", { paused: true })        // pause
wsService.send("reset",      {})                      // réinitialiser
wsService.send("set_speed",  { interval: 100 })       // changer la vitesse
wsService.send("direction",  { direction: "HAUT" })   // mode manuel
```

### Reconnexion automatique (backoff exponentiel)

En cas de déconnexion (backend redémarré) :
```
WSService.ws.onclose → délai = min(30000, 1000 × 2^retryCount) ms
retryCount 0 → 1s → retryCount 1 → 2s → ... → max 30s
→ wsService.connect(...) rappelé automatiquement
→ dispatch(wsDisconnected()) → indicateur rouge dans la navbar
→ dispatch(wsConnected())    → indicateur vert dès reconnexion
```

---

## 3. Requêtes REST — flux complet

Pour les opérations ponctuelles (Battle Arena, statistiques, entraînement) :

```
Composant React (BattleArena / TrainingPanel / StatsComparison)
        │
        │ import { api } from '../services/api'
        │
        ▼
api.js — instance axios                              [services/api.js]
  baseURL : '' (URLs relatives, proxy Vite gère le port)
        │
        │ api.post('/api/agent/step', { agent_type: 'astar', game_state: {...} })
        │
        ▼ (proxy Vite : /api → http://127.0.0.1:8000)
        │
        ▼
FastAPI — router monté dans main.py                  [backend/main.py]
  app.include_router(agent_router)   →  /api/agent/*
  app.include_router(agents_router)  →  /api/agents/*
  app.include_router(game_router)    →  /api/game/*
  app.include_router(stats_router)   →  /api/stats/*
  app.include_router(training_router)→  /api/training/*
        │
        ▼
Fonction de route FastAPI
  ex: POST /api/agent/step
        │
        ▼
  1. Instancie le bon agent (AgentAStar ou AgentQL)
  2. Appelle agent.choisir_action(game_state)
  3. Appelle moteur.step()
  4. Mesure le temps d'inférence (inference_ms)
  5. Retourne { payload: game_state, meta: { inference_ms } }
        │
        ▼
Composant React reçoit la réponse
  BattleArena.jsx met à jour son état local (astarGame, rlGame)
  → re-render des deux canvases + graphiques
```

---

## 4. Structure interne du backend

```
backend/main.py                    ← Point d'entrée FastAPI
    │
    ├── config.py                  ← Paramètres (GRID_SIZE, RL params, CORS, DB_PATH)
    ├── database.py                ← Engine SQLite, SessionLocal, seed 3 agents
    │
    ├── websocket_handler.py       ← Boucle jeu WebSocket (asyncio)
    │       └── utilise → game_engine/ + agents/
    │
    ├── routes/
    │   ├── game_routes.py         ← /api/game/* (reset, state, start, pause)
    │   ├── agent_routes.py        ← /api/agent/* (init, step, save) [Battle Arena]
    │   ├── agents_routes.py       ← /api/agents/* (CRUD agents en BDD)
    │   ├── stats_routes.py        ← /api/stats/* (comparison, history, replay)
    │   └── training_routes.py     ← /api/training/* (run, results)
    │           └── utilise → training/trainer.py
    │
    ├── game_engine/               ← Logique du jeu (indépendante du réseau)
    │   ├── moteur.py              ← MoteurJeu : step(), reset(), cause_mort
    │   ├── serpent.py             ← Serpent : corps, déplacement, croissance
    │   ├── grille.py              ← Grille 25x25 : food, obstacles, to_numpy_grid()
    │   ├── direction.py           ← Enum Direction avec dx/dy
    │   ├── nourriture.py          ← Classe Nourriture
    │   ├── obstacle.py            ← Classe Obstacle (statique/dynamique)
    │   ├── controleur_jeu.py      ← Façade ControleurJeu
    │   └── collecteur_statistiques.py  ← Agrégation stats parties
    │
    ├── agents/                    ← Algorithmes IA (indépendants du réseau)
    │   ├── base_agent.py          ← Classe abstraite Agent + AgentAleatoire
    │   ├── agent_astar.py         ← A* : heapq, Manhattan, flood fill, tail-chasing
    │   └── agent_rl.py            ← Q-Learning : Q-table dict, epsilon-greedy, Bellman
    │
    ├── models/                    ← ORM SQLAlchemy (5 tables)
    │   ├── agent.py               ← Table agents
    │   ├── game.py                ← Table games
    │   ├── game_event.py          ← Table game_events
    │   ├── stats.py               ← Table agent_stats
    │   └── rl_training.py         ← Table rl_training
    │
    └── training/
        └── trainer.py             ← Boucle d'entraînement RL + benchmark A*
```

**Règle d'import :** `game_engine` n'importe pas `routes`. `agents` n'importe pas
`websocket_handler`. Aucune dépendance circulaire.

---

## 5. Structure interne du frontend

```
frontend/src/
    │
    ├── main.jsx                   ← Point d'entrée React, monte <Provider store>
    │
    ├── components/
    │   ├── App.jsx                ← Routeur SPA (WelcomeScreen ou vues principales)
    │   │       └── appelle → useWebSocket() (connexion WS au montage)
    │   ├── GameGrid.jsx           ← Container avec ResizeObserver → passe taille à Snake
    │   ├── Snake.jsx              ← Deux canvas superposés (bgCanvas + entityCanvas)
    │   │       └── lit → useSelector(state.game) pour le rendu
    │   ├── ControlPanel.jsx       ← Start/Pause/Reset/Mode/Vitesse
    │   │       └── envoie → wsService.send(...)
    │   ├── Dashboard.jsx          ← Score/steps/mode (lit Redux game slice)
    │   ├── BattleArena.jsx        ← Deux grilles REST step-by-step + Recharts
    │   │       └── appelle → api.post('/api/agent/step', ...)
    │   ├── TrainingPanel.jsx      ← Entraînement RL/A* + toggle performance
    │   │       └── appelle → api.post('/api/training/run', ...)
    │   └── StatsComparison.jsx    ← Statistiques + export CSV/JSON
    │           └── appelle → api.get('/api/stats/comparison')
    │
    ├── hooks/
    │   ├── useWebSocket.js        ← Connexion WS, dispatch setGameState/applyDelta
    │   └── useKeyboard.js         ← Flèches + ZQSD → wsService.send("direction", ...)
    │
    ├── services/
    │   ├── api.js                 ← Axios instance (baseURL vide, proxy gère le port)
    │   └── websocket.js           ← WSService class (connect, send, disconnect, backoff)
    │
    └── store/
        ├── index.js               ← configureStore avec les 4 slices
        ├── gameSlice.js           ← snake, food, obstacles, score, mode, astarPath...
        │       actions : setGameState (1er frame), applyDelta (frames suivantes), setMode
        ├── statsSlice.js          ← rlTrainingScores, astarBenchmarkScores, loading
        │       thunk  : fetchTrainingResults (GET /api/training/results)
        ├── wsSlice.js             ← connected:bool, lastMessage:object
        └── uiSlice.js             ← speed:int, view:str
```

---

## 6. Rendu Canvas — comment Snake.jsx dessine

```
GameGrid.jsx
    │
    │ ResizeObserver sur son conteneur div
    │ → mesure (width, height) disponibles
    │ → setAvailableSize({ w, h })
    │
    ▼ passe props
Snake.jsx ({ availableWidth, availableHeight })
    │
    │ cellSize = Math.max(10, Math.floor(Math.min(w, h) / gridSize))
    │
    ├── bgCanvasRef    (canvas 1 — fond + grille + obstacles statiques)
    │   useEffect([gridSize, obstacles, mode, cellSize])
    │   → Redessiné SEULEMENT si ces dépendances changent
    │   → Dessine : dégradé fond, lignes de grille, obstacles statiques gris
    │
    └── entityCanvasRef  (canvas 2 — entités dynamiques)
        useEffect([snake, food, dynamicObstacles, astarPath, rlPath, ...])
        → Redessiné à CHAQUE tick de jeu
        → clearRect() d'abord
        → Dessine dans l'ordre :
          1. Overlay chemin A* (bleu semi-transparent) si mode === "astar"
          2. Overlay chemin RL (violet semi-transparent) si mode === "rl"
          3. Obstacles dynamiques (gris clair, roundRect)
          4. Nourriture (rouge, arc + tige verte)
          5. Serpent (tête vert vif avec yeux, corps vert dégradé, roundRect)
          6. Compteur FPS (coin haut droite, texte gris)
```

---

## 7. Base de données — connexion et initialisation

```
database.py
    │
    ├── BASE_DIR = racine du projet (2 niveaux au-dessus de database.py)
    ├── DB_PATH  = BASE_DIR / "snake.db"   ← fichier à la RACINE du projet
    ├── engine   = create_engine("sqlite:///...snake.db")
    ├── SessionLocal = sessionmaker(bind=engine)
    └── run_migrations() ← vérifie/ajoute colonnes manquantes si BDD ancienne
                            (ex: longueur_serpent, obstacles_actifs...)

main.py (démarrage)
    │
    ├── Base.metadata.create_all(bind=engine, checkfirst=True)
    │   → Crée les 5 tables si elles n'existent pas
    └── run_migrations()
        → Seed : insère les 3 agents par défaut si table agents est vide
          (Agent Humain / Agent A* / Agent Q-Learning)

Accès dans les routes :
    def get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    @router.get("/api/stats/comparison")
    def get_comparison(db: Session = Depends(get_db)):
        # utilise db pour les requêtes SQLAlchemy
```

---

## 8. Paramètres globaux (config.py)

Tous les paramètres modifiables sont centralisés dans `backend/config.py`.
Certains sont surchargeables par variable d'environnement :

| Paramètre | Défaut | Env var | Description |
|---|---|---|---|
| GRID_SIZE | 25 | GRID_SIZE | Taille de la grille (carrée) |
| TICK_INTERVAL_MS | 150 | TICK_INTERVAL_MS | Délai entre deux ticks (ms) |
| RL_ALPHA | 0.1 | RL_ALPHA | Learning rate Q-Learning |
| RL_GAMMA | 0.9 | RL_GAMMA | Discount factor Q-Learning |
| RL_EPSILON_START | 1.0 | RL_EPSILON_START | Epsilon initial |
| RL_EPSILON_MIN | 0.01 | RL_EPSILON_MIN | Epsilon minimum |
| RL_EPSILON_DECAY | 0.995 | RL_EPSILON_DECAY | Décroissance epsilon par épisode |

**OBSTACLE_SETTINGS** — nombre et fréquence des obstacles par mode :

| Mode | Statiques | Spawn interval | Max dynamiques |
|---|---|---|---|
| manual | 10 | 6 ticks | 5 |
| astar | 12 | 5 ticks | 6 |
| rl | 6 | 7 ticks | 4 |
| battle | 8 | 5 ticks | 5 |
| performance | 0 | 999 ticks | 0 |

---

## 9. Pipeline CI/CD

```
GitHub Push (main ou dev)
        │
        ▼
GitHub Actions (.github/workflows/)
        │
        ├── Job 1 : test-backend (parallèle)
        │   ubuntu-latest, Python 3.11
        │   → pip install -r backend/requirements.txt
        │   → python -m pytest tests/ -v
        │   → 107 tests doivent passer
        │
        └── Job 2 : test-frontend (parallèle)
            ubuntu-latest, Node 18
            → npm install (dans frontend/)
            → npm test
            → Vitest, tous les tests doivent passer
```

---

## 10. Démarrage complet — séquence

```
1. start.bat / start.sh / start.command
        │
        ├─ pip install -r backend/requirements.txt
        ├─ npm install (si node_modules absent)
        │
        ├─ [Terminal 1] uvicorn main:app --reload --port 8000
        │       │
        │       ├── create_all() → snake.db créé/vérifié
        │       ├── run_migrations() → seed 3 agents
        │       ├── FastAPI prêt sur :8000
        │       └── /ws endpoint disponible
        │
        ├─ sleep 4s (attendre que le backend soit prêt)
        │
        ├─ [Terminal 2] npm run dev
        │       │
        │       └── Vite sur :5174 avec proxy /api + /ws → :8000
        │
        ├─ sleep 5s (attendre que le frontend soit prêt)
        │
        └─ Ouvre le navigateur sur http://localhost:5174
                │
                └── App.jsx monte → useWebSocket() → new WebSocket('/ws')
                        → proxy Vite → backend :8000/ws
                        → connexion établie → indicateur VERT dans navbar
```
