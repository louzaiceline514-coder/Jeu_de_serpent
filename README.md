# Snake AI – SAE4 · Licence 3 Informatique UPJV

Application web complète autour du jeu du serpent (Snake Game), comparant trois agents :
- **Humain** : contrôle au clavier
- **A\*** : pathfinding optimal avec heuristique de Manhattan
- **Q-Learning** : apprentissage par renforcement tabulaire

---

## Table des matières

1. [Architecture](#architecture)
2. [Installation](#installation)
3. [Lancement](#lancement)
4. [Manuel d'utilisation](#manuel-dutilisation)
   - [Mode Jeu](#mode-jeu)
   - [Mode A\* vs Q-Learning (Battle Arena)](#mode-a-vs-q-learning-battle-arena)
   - [Mode Entraînement](#mode-entraînement)
   - [Mode Statistiques](#mode-statistiques)
5. [Contrôles clavier](#contrôles-clavier)
6. [Lancement des tests](#lancement-des-tests)
7. [Description des algorithmes](#description-des-algorithmes)
8. [Structure du projet](#structure-du-projet)
9. [Base de données](#base-de-données)
10. [Dépannage](#dépannage)

---

## Architecture

```
Frontend (React 18 + Redux)  ←──WebSocket / REST──→  Backend (FastAPI + Python)
         │                                                      │
    Vite + Tailwind                               Moteur de jeu + IA (A*, QL)
    Redux (game/stats/ui/ws)                      SQLite (SQLAlchemy ORM)
```

- **Frontend** : Single Page Application React 18 avec Redux Toolkit pour l'état global.
- **Backend** : FastAPI avec support WebSocket natif (async/await).
- **IA** : Agent A* (min-heap, heuristique Manhattan) et Agent Q-Learning (Q-table JSON, 11 features NumPy).
- **Base de données** : SQLite via SQLAlchemy (5 tables : agents, games, game_events, agent_stats, rl_training).

---

## Installation

### Prérequis

- Python 3.10+ avec `pip`
- Node.js 18+ avec `npm`

### Cloner le dépôt

```bash
git clone https://github.com/louzaiceline514-coder/SnakeGAME_final.git
cd SnakeGAME_final
```

### Backend

```bash
cd backend
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend
npm install
```

---

## Lancement

Ouvrir **deux terminaux** :

**Terminal 1 – Backend :**
```bash
cd backend
uvicorn main:app --reload --port 8000
```

Le backend est disponible sur `http://localhost:8000`.
La base de données `snake.db` est créée automatiquement à la racine du projet.

**Terminal 2 – Frontend :**
```bash
cd frontend
npm run dev
```

L'application est accessible sur **`http://localhost:5173`**.

> Si vous avez déjà une base `snake.db` d'une version précédente, supprimez-la avant de relancer le backend afin que les nouvelles tables (game_events, rl_training) soient créées.

---

## Manuel d'utilisation

### Écran d'accueil

Au premier lancement, un écran de présentation s'affiche avec les trois modes disponibles.
Cliquez sur **Start** pour entrer dans l'application.

---

### Mode Jeu

Vue principale accessible via le bouton **Jeu** dans la barre de navigation.

**Panneau de contrôle (à droite) :**

| Élément | Description |
|---|---|
| **Sélecteur de mode** | Choisir entre Manuel, A* ou Q-Learning |
| **Bouton Start** | Démarre la partie (le jeu ne se lance pas seul) |
| **Bouton Pause/Resume** | Met en pause ou reprend la partie |
| **Bouton Reset** | Réinitialise la partie dans le mode courant |
| **Curseur de vitesse** | Ajuste la vitesse de tick (50 ms → rapide, 500 ms → lent) |

**Dashboard (en bas à droite) :**
Affiche en temps réel : score, nombre de steps, mode actif, état de la partie (En cours / Terminé).

**Grille de jeu :**
- Serpent en vert
- Nourriture en rouge
- Obstacles statiques en gris foncé
- Obstacles dynamiques en orange (ils apparaissent et disparaissent)

---

### Mode A\* vs Q-Learning (Battle Arena)

Accessible via le bouton **A\* vs Q-Learning**.

Ce mode lance **simultanément** trois serpents indépendants sur la même grille :
- Serpent bleu : **Humain** (contrôlable au clavier)
- Serpent vert : **Agent A\***
- Serpent orange : **Agent Q-Learning**

**Fonctionnement :**
1. Cliquez **Lancer la simulation** pour démarrer les trois agents.
2. Les graphiques en temps réel (BarChart, RadarChart) s'affichent à droite.
3. Les statistiques live (score, steps, temps d'inférence, epsilon pour RL) sont mises à jour à chaque tick.
4. En fin de simulation, un tableau comparatif résume les performances.

> Les trois agents jouent en mode **battle** : obstacles statiques et dynamiques activés.

---

### Mode Entraînement

Accessible via le bouton **Entrainement**.

Permet de lancer un entraînement RL ou un benchmark A* :

| Champ | Description |
|---|---|
| **Type d'agent** | RL (Q-Learning) ou A* (benchmark) |
| **Nombre d'épisodes** | Nombre de parties à jouer (max 100 par requête) |
| **Bouton Lancer** | Démarre l'entraînement/benchmark côté serveur |

**Résultats :**
- Courbe des scores par épisode (LineChart)
- Résumé : score moyen, meilleur score, taux de survie

Pour le RL, la Q-table est sauvegardée automatiquement dans `qtable.json` à la racine du projet et rechargée à chaque démarrage du backend.

Les données d'entraînement RL (épisode, score, epsilon, alpha) sont également persistées dans la table `rl_training` de la base de données.

---

### Mode Statistiques

Accessible via le bouton **Stats**.

Affiche la comparaison des performances entre A* et Q-Learning basée sur les parties réellement enregistrées en base de données :

- **Score moyen** par agent
- **Meilleur score** par agent
- **Taux de survie** (proportion de parties avec score > 0)
- **Nombre de parties jouées**
- **Historique des parties** (tableau des 200 dernières parties IA)

Les données sont récupérées depuis les routes `/api/stats/comparison` et `/api/stats/history`.

---

## Contrôles clavier

| Touche | Action |
|---|---|
| `↑` ou `Z` | Déplacer le serpent vers le haut |
| `↓` ou `S` | Déplacer le serpent vers le bas |
| `←` ou `Q` | Déplacer le serpent vers la gauche |
| `→` ou `D` | Déplacer le serpent vers la droite |

> Les contrôles clavier ne sont actifs qu'en **mode Manuel**.
> Un demi-tour immédiat (ex. gauche → droite) est automatiquement ignoré.

---

## Lancement des tests

### Tests backend (pytest)

```bash
cd backend
pytest ../tests/ -v
```

Couverture :
- `test_serpent.py` : déplacement, croissance, collisions, demi-tour
- `test_grille.py` : génération nourriture/obstacles, voisins, NumPy grid
- `test_moteur.py` : cycle de jeu, step, reset, cause_mort
- `test_astar.py` : chemin simple, obstacles, fallback survie, anti-demi-tour
- `test_rl.py` : encodage état (11 features), mise à jour Q-table, décroissance epsilon
- `test_api.py` : routes REST /game/start, /game/step, /api/health

### Tests frontend (Vitest)

```bash
cd frontend
npm test
```

Couverture :
- `gameSlice.test.js` : réducteurs Redux pour l'état du jeu
- `uiSlice.test.js` : réducteurs Redux pour l'interface (vitesse, audio, vue)
- `Dashboard.test.jsx` : rendu du composant Dashboard avec différents états

---

## Description des algorithmes

### Algorithme A\*

1. Maintient une file de priorité (min-heap) avec le coût `f = g + h`.
2. `g` = distance parcourue depuis la tête du serpent.
3. `h` = distance de Manhattan vers la nourriture.
4. Le corps du serpent et les obstacles sont des cases interdites.
5. **Stratégie de survie** : si aucun chemin vers la nourriture n'est sûr (l'état d'arrivée ne permet pas de rejoindre la queue), l'agent suit sa propre queue via un second appel A* pour temporiser.
6. Un flood fill (BFS) estime l'espace libre accessible pour éviter les culs-de-sac.

### Q-Learning (apprentissage par renforcement)

1. **État** : tuple binaire de 11 features calculé via une grille NumPy uint8 :
   - Danger devant / gauche / droite (relatif à la direction actuelle)
   - Direction actuelle (one-hot sur 4 bits)
   - Position relative de la nourriture (haut / bas / gauche / droite)
2. **Q-table** : dictionnaire Python associant chaque état à 4 Q-valeurs (une par direction).
3. **Politique** : epsilon-greedy (ε décroît de 1.0 → 0.01, ×0.995 par épisode).
4. **Mise à jour** : équation de Bellman — `Q(s,a) ← Q(s,a) + α [r + γ max Q(s',a') − Q(s,a)]`.
5. **Récompenses** : +10 (nourriture), −10 (mort), +1 (rapprochement), −1 (éloignement).
6. La Q-table est sauvegardée dans `qtable.json` et rechargée automatiquement.

---

## Structure du projet

```
SnakeGAME_final/
├── backend/
│   ├── agents/
│   │   ├── agent_astar.py      # Agent A* avec tail-chasing et flood fill
│   │   ├── agent_rl.py         # Agent Q-Learning avec encodage NumPy
│   │   └── base_agent.py       # Classe abstraite Agent
│   ├── game_engine/
│   │   ├── direction.py        # Enum Direction (HAUT/BAS/GAUCHE/DROITE)
│   │   ├── grille.py           # Grille + to_numpy_grid() NumPy
│   │   ├── moteur.py           # Moteur de jeu (step, reset, cause_mort)
│   │   └── serpent.py          # Logique du serpent
│   ├── models/
│   │   ├── agent.py            # Table agents
│   │   ├── game.py             # Table games (avec cause_mort, longueur_serpent…)
│   │   ├── game_event.py       # Table game_events
│   │   ├── rl_training.py      # Table rl_training
│   │   └── stats.py            # Table agent_stats
│   ├── routes/
│   │   ├── game_routes.py      # /api/game
│   │   ├── agents_routes.py    # /api/agents
│   │   ├── stats_routes.py     # /api/stats
│   │   └── training_routes.py  # /api/training
│   ├── training/
│   │   └── trainer.py          # Boucle d'entraînement RL + sauvegarde BDD
│   ├── config.py               # Paramètres globaux (grille, RL, obstacles)
│   ├── database.py             # Engine SQLite + SessionLocal
│   ├── main.py                 # Point d'entrée FastAPI
│   └── websocket_handler.py    # Boucle WebSocket temps réel
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── BattleArena.jsx     # Vue A* vs Q-Learning en temps réel
│       │   ├── ControlPanel.jsx    # Panneau Start/Pause/Reset/Mode/Vitesse
│       │   ├── Dashboard.jsx       # Dashboard score/steps/mode/état
│       │   ├── GameGrid.jsx        # Canvas de la grille de jeu
│       │   ├── StatsComparison.jsx # Comparaison statistiques A* vs RL
│       │   └── TrainingPanel.jsx   # Panneau d'entraînement
│       ├── store/
│       │   ├── gameSlice.js    # État du jeu (snake, food, score…)
│       │   ├── statsSlice.js   # Statistiques comparatives
│       │   ├── uiSlice.js      # UI (vitesse, audio, vue active)
│       │   └── wsSlice.js      # État de la connexion WebSocket
│       └── tests/
│           ├── setup.js
│           ├── gameSlice.test.js
│           ├── uiSlice.test.js
│           └── Dashboard.test.jsx
├── tests/                      # Tests backend pytest
│   ├── test_serpent.py
│   ├── test_grille.py
│   ├── test_moteur.py
│   ├── test_astar.py
│   ├── test_rl.py
│   └── test_api.py
├── qtable.json                 # Q-table sauvegardée (générée à l'entraînement)
├── training_results.csv        # Scores par épisode (généré à l'entraînement)
├── snake.db                    # Base SQLite (générée au premier lancement)
└── README.md
```

---

## Base de données

La base SQLite (`snake.db`) est créée automatiquement au démarrage du backend.
Elle contient 5 tables :

| Table | Contenu |
|---|---|
| `agents` | Types d'agents : humain, astar, rl |
| `games` | Parties jouées (score, durée, cause_mort, longueur_serpent, taille_grille…) |
| `game_events` | Événements détaillés par partie (move, food, collision) |
| `agent_stats` | Statistiques agrégées par agent (score moyen, meilleur score, taux de survie) |
| `rl_training` | Historique des épisodes d'entraînement RL (score, epsilon, alpha…) |

> Si vous avez une base existante sans les nouvelles tables, supprimez `snake.db` et relancez le backend.

---

## Dépannage

| Problème | Solution |
|---|---|
| `uvicorn: command not found` | `pip install uvicorn` dans l'environnement Python actif |
| Erreur CORS au lancement | Vérifier que le frontend tourne sur le port 5173 (ou ajouter le port dans `config.py`) |
| WebSocket déconnecté | Relancer le backend, puis rafraîchir le frontend |
| Q-table vide / mauvaises performances RL | Lancer un entraînement depuis le panneau Entraînement (au moins 50 épisodes) |
| `snake.db` avec tables manquantes | Supprimer `snake.db`, relancer `uvicorn main:app --reload --port 8000` |
| Tests frontend échouent | Lancer `npm install` dans `frontend/` pour installer Vitest et @testing-library |
| Tests backend échouent | Lancer depuis la racine avec `pytest tests/ -v` (pas depuis le dossier `backend/`) |
