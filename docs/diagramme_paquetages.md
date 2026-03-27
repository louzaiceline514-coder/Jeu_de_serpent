# Diagramme de Paquetages - Snake AI
## SAE4 - Licence Informatique 3e annee - UPJV

---

## Vue d'ensemble

Le projet est decoupe en deux paquetages principaux (backend / frontend)
communiquant via WebSocket et REST HTTP.

```
+=========================================================+
|                     SnakeAI (racine)                    |
|                                                         |
|  +====================+   +========================+   |
|  |      backend/      |   |       frontend/        |   |
|  |  (Python/FastAPI)  |   |    (React/Redux/Vite)  |   |
|  +====================+   +========================+   |
|         ^    |                    |    ^               |
|         |    +----WebSocket /ws---+    |               |
|         |    +----REST /api/------+    |               |
+=========================================================+
```

---

## Paquetage backend/

```
backend/
|
+-- main.py                    (point d'entree FastAPI, montage des routes)
|
+-- config.py                  (constantes : GRID_SIZE, OBSTACLE_SETTINGS, ...)
|
+-- database.py                (moteur SQLite, session SQLAlchemy)
|
+-- websocket_handler.py       (gestionnaire WebSocket : game loop, replay)
|
+==[ game_engine/ ]=============================================================+
|   Responsabilite : logique du jeu, independante du reseau                     |
|                                                                                |
|   moteur.py           MoteurJeu -- orchestre serpent, grille, obstacles        |
|   serpent.py          Serpent   -- deplacement, croissance, collisions         |
|   grille.py           Grille    -- generation nourriture, obstacles, numpy     |
|   direction.py        Direction -- enum (HAUT/BAS/GAUCHE/DROITE)              |
|   nourriture.py       Nourriture-- position et etat de la nourriture          |
|   obstacle.py         Obstacle  -- obstacle statique ou dynamique, age        |
|   controleur_jeu.py   ControleurJeu -- facade assemblee les composants        |
|   collecteur_statistiques.py  CollecteurStatistiques -- agregation stats      |
+================================================================================+
|
+==[ agents/ ]===================================================================+
|   Responsabilite : algorithmes IA, independants du moteur de jeu               |
|                                                                                |
|   base_agent.py       Agent (classe abstraite)                                 |
|   agent_astar.py      AgentAStar  -- A*, heapq, Manhattan, flood fill         |
|   agent_rl.py         AgentQL     -- Q-table, epsilon-greedy, 11 features     |
|   joueur_humain.py    JoueurHumain-- passe-plat pour la direction manuelle    |
+================================================================================+
|
+==[ routes/ ]===================================================================+
|   Responsabilite : endpoints REST FastAPI                                      |
|                                                                                |
|   game_routes.py      /api/game/*   -- init, reset, info partie               |
|   agent_routes.py     /api/agent/*  -- step, direction manuelle               |
|   stats_routes.py     /api/stats/*  -- statistiques, historique, replay       |
|   training_routes.py  /api/training/*-- lancement entrainement RL, benchmark  |
+================================================================================+
|
+==[ models/ ]===================================================================+
|   Responsabilite : modeles ORM SQLAlchemy (5 tables SQLite)                   |
|                                                                                |
|   agent.py            Agent      -- id, name, type, created_at               |
|   game.py             Game       -- id, agent_id, score, nb_steps, ...       |
|   game_event.py       GameEvent  -- frames replay, evenements                |
|   stats.py            AgentStats -- statistiques agregees par agent           |
|   rl_training.py      RLTraining -- historique episodes entrainement RL       |
+================================================================================+
|
+==[ training/ ]=================================================================+
|   Responsabilite : entrainement hors-ligne des agents                          |
|                                                                                |
|   trainer.py          Trainer -- boucle episodes, benchmark A*/RL             |
+================================================================================+
|
+==[ tests/ ]====================================================================+
|   Responsabilite : tests automatises (88 tests pytest)                         |
|                                                                                |
|   conftest.py             fixtures partagees (db, moteur, agent)               |
|   test_serpent.py         tests unitaires Serpent                              |
|   test_moteur.py          tests unitaires MoteurJeu                           |
|   test_astar.py           tests unitaires AgentAStar                          |
|   test_rl.py              tests unitaires AgentQL / Q-table                   |
|   test_classes_diagramme.py tests Nourriture/Obstacle/ControleurJeu/Collecteur|
|   test_integration.py     tests integration (agents + moteur + BDD)           |
|   test_functional.py      tests fonctionnels (scenarios complets)             |
|   test_websocket.py       tests WebSocket (connect, step, game_over)          |
+================================================================================+
```

---

## Paquetage frontend/

```
frontend/
|
+-- index.html                 (point d'entree HTML, favicon SVG)
+-- vite.config.js             (config Vite, proxy /api -> :8000)
|
+==[ src/ ]=====================================================================+
|                                                                                |
|   App.jsx                    composant racine, routage des vues, useSoundEffects|
|                                                                                |
|   +--[ components/ ]----------------------------------------------------------+
|   |   GameGrid.jsx           grille de jeu (canvas HTML5)                     |
|   |   ControlPanel.jsx       panneau de controle (mode, vitesse, start/reset) |
|   |   BattleArena.jsx        duel A* vs Q-Learning (2 canvas + heatmap)       |
|   |   StatsComparison.jsx    statistiques comparatives (CSV/JSON/PDF export)  |
|   |   TrainingPanel.jsx      entrainement RL + benchmark A* + mode perf       |
|   |   ReplayViewer.jsx       rejouer frame par frame (canvas + slider)        |
|   |   WelcomeScreen.jsx      ecran d'accueil selection du mode                |
|   +-----------------------------------------------------------------------------+
|                                                                                |
|   +--[ store/ ]--------------------------------------------------------------+
|   |   index.js               configuration Redux store                       |
|   |   gameSlice.js           etat du jeu (snake, food, score, gameOver, ...)  |
|   |   statsSlice.js          statistiques comparatives A*/RL                  |
|   |   wsSlice.js             etat connexion WebSocket                         |
|   |   uiSlice.js             preferences UI (vitesse, theme)                 |
|   +-------------------------------------------------------------------------+
|                                                                                |
|   +--[ hooks/ ]--------------------------------------------------------------+
|   |   useSoundEffects.js     Web Audio API (miam, boom, level-up)            |
|   +-------------------------------------------------------------------------+
|                                                                                |
|   +--[ services/ ]-----------------------------------------------------------+
|   |   api.js                 appels REST axios vers /api/*                   |
|   |   websocket.js           connexion WebSocket, dispatch Redux             |
|   +-------------------------------------------------------------------------+
|                                                                                |
+================================================================================+
```

---

## Relations entre paquetages

```
+------------------+     REST /api/*      +------------------+
|  frontend/       | <------------------> |  backend/routes/ |
|  services/api.js |                      +--------+---------+
+------------------+                               |
                                                   | importe
+------------------+    WebSocket /ws    +--------v---------+
|  frontend/       | <------------------> | websocket_       |
|  services/       |                      | handler.py       |
|  websocket.js    |                      +--------+---------+
+------------------+                               |
                                                   | utilise
                                          +--------v---------+
                                          | game_engine/     |
                                          | agents/          |
                                          | models/          |
                                          +------------------+
                                                   |
                                          +--------v---------+
                                          | database.py      |
                                          | (SQLite/SQLAlch.)|
                                          +------------------+
```

---

## Dependances externes

| Paquetage | Dependances Python | Dependances Node.js |
|---|---|---|
| backend/game_engine | stdlib uniquement | - |
| backend/agents | stdlib uniquement | - |
| backend/routes | fastapi, sqlalchemy | - |
| backend/training | (game_engine + agents) | - |
| frontend/components | - | react, recharts, jspdf |
| frontend/store | - | @reduxjs/toolkit |
| frontend/services | - | axios |

Aucune dependance circulaire : `game_engine` n'importe pas `routes`,
`agents` n'importent pas `websocket_handler`.
