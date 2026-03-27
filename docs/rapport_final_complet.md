# Rapport Final Complet — Snake AI
## SAE4 — Licence Informatique 3e année — UPJV
### Année universitaire 2024/2025

---

## Table des matières

1. [Introduction](#1-introduction)
2. [Contexte et démarche de développement](#2-contexte-et-démarche-de-développement)
3. [Analyse des écarts — CDC vs réalisé](#3-analyse-des-écarts--cdc-vs-réalisé)
   - 3.1 Fonctionnalités réalisées
   - 3.2 Fonctionnalités non réalisées — analyse MoSCoW
   - 3.3 Déviations techniques intentionnelles
4. [Résultats des agents IA](#4-résultats-des-agents-ia)
   - 4.1 Performances mesurées
   - 4.2 Analyse comparative
   - 4.3 Limites du Q-Learning tabulaire
5. [Architecture réalisée](#5-architecture-réalisée)
6. [Retour d'expérience](#6-retour-dexpérience)
7. [Conclusion et suites possibles](#7-conclusion-et-suites-possibles)
8. [Références](#8-références)
9. [Annexes](#9-annexes)

---

## 1. Introduction

Ce document est le rapport final de la SAE4 de Licence Informatique 3e année.
Il présente le bilan complet du projet **Snake AI** : une application web temps réel
intégrant un jeu Snake, deux agents IA (A* et Q-Learning), une base de données
persistante, une interface de comparaison et un pipeline CI/CD.

Ce rapport adopte une posture honnête : il distingue clairement ce qui a été réalisé,
ce qui n'a pas été fait et pourquoi, et analyse les écarts entre les objectifs initiaux
du CDC (Cahier des Charges) et le produit livré.

---

## 2. Contexte et démarche de développement

### 2.1 Pivot frontend-first → backend-first

Le développement a débuté par l'interface React (approche frontend-first), avec l'intention
de brancher le backend ensuite. Cette approche a révélé rapidement une difficulté fondamentale :
sans backend opérationnel, impossible de valider que les composants React affichaient
des données cohérentes. Les composants GameGrid et ControlPanel étaient construits
sur des données mockées qui ne correspondaient pas à la structure réelle du backend.

**Pivot à mi-parcours :** Nous avons décidé de reprendre avec une approche backend-first :
1. Moteur de jeu complet + tests unitaires (pytest)
2. API REST + WebSocket FastAPI
3. Agents IA A* et Q-Learning
4. Base de données SQLite + persistance
5. Frontend React connecté à un backend fonctionnel

Ce pivot a entraîné un retard sur la partie frontend, mais a produit un backend
solide et entièrement testé dès le début.

### 2.2 Chronologie réelle

| Période | Travail effectué |
|---|---|
| Semaines 1-2 | Moteur de jeu, agents IA, tests unitaires backend (≈40 tests) |
| Semaines 3-4 | API REST + WebSocket, base de données, intégration |
| Semaines 5-6 | Frontend React complet, Redux, CI/CD, documentation |
| Semaine 7 | Tests d'intégration, correction bugs, polish UI |

---

## 3. Analyse des écarts — CDC vs réalisé

### 3.1 Fonctionnalités réalisées

| Fonctionnalité | Statut | Détails |
|---|---|---|
| Jeu Snake jouable (mode Manuel) | ✅ Réalisé | Contrôles ZQSD + flèches, demi-tour ignoré |
| Agent A* pathfinding | ✅ Réalisé | Min-heap heapq, heuristique Manhattan, flood fill, tail-chasing |
| Agent Q-Learning | ✅ Réalisé | Q-table JSON, 11 features NumPy uint8, epsilon-greedy, Bellman |
| Interface web React 18 | ✅ Réalisé | SPA, Redux Toolkit, Tailwind CSS |
| Communication WebSocket temps réel | ✅ Réalisé | FastAPI WebSocket natif, protocole delta, orjson bytes |
| Base de données persistante | ✅ Réalisé | SQLite via SQLAlchemy ORM, 5 tables |
| Battle Arena (duel A* vs RL) | ✅ Réalisé | REST step-by-step, deux grilles indépendantes, graphiques Recharts |
| Panneau d'entraînement RL | ✅ Réalisé | POST /api/training/run, courbe épisodes, résumé stats |
| Benchmark A* | ✅ Réalisé | Même endpoint, agent_type="astar" |
| Page statistiques comparatives | ✅ Réalisé | /api/stats/comparison, BarChart + LineChart Recharts |
| Export CSV statistiques | ✅ Réalisé | Bouton dans StatsComparison |
| Tests automatisés backend | ✅ Réalisé | 107 tests pytest (unitaires, intégration, E2E, WebSocket) |
| Tests automatisés frontend | ✅ Réalisé | Vitest + @testing-library (gameSlice, uiSlice, Dashboard, BattleArena, TrainingPanel) |
| CI/CD GitHub Actions | ✅ Réalisé | 2 jobs parallèles (pytest + Vitest) sur push main/dev |
| Script lancement automatique Windows | ✅ Réalisé | start.bat |
| Script lancement Linux | ✅ Réalisé | start.sh |
| Script lancement macOS | ✅ Réalisé | start.command |
| Overlay chemin A* en temps réel | ✅ Réalisé | Gradient bleu sur le canvas entités |
| Overlay chemin RL en temps réel | ✅ Réalisé | Gradient violet sur le canvas entités |
| Mode performance (sans obstacles) | ✅ Réalisé | Toggle dans TrainingPanel |
| Agent aléatoire (référence) | ✅ Réalisé | AgentAleatoire dans base_agent.py |
| Obstacles statiques | ✅ Réalisé | Configurés par mode dans config.py |
| Obstacles dynamiques | ✅ Réalisé | Apparaissent/disparaissent en mode battle |
| Compteur FPS | ✅ Réalisé | Affiché sur le canvas entités |
| Indicateur connexion WebSocket | ✅ Réalisé | Point vert/rouge dans la navbar |

### 3.2 Fonctionnalités non réalisées — analyse MoSCoW

La méthode MoSCoW (Must/Should/Could/Won't) a guidé la priorisation :

| Fonctionnalité | Priorité CDC | Décision | Justification |
|---|---|---|---|
| Jeu + agents IA + BDD + Interface (F1-F5) | **Must** | ✅ Réalisé | Cœur du projet |
| Visualisation chemin A* | **Should** | ✅ Réalisé | Overlay canvas en temps réel |
| DQN / réseau de neurones | **Could** | ❌ Non réalisé | Nécessite PyTorch + GPU ; complexité hors scope SAE |
| Responsive mobile | **Should** | ❌ Non réalisé | Priorité donnée aux fonctionnalités core ; application desktop uniquement |
| Déploiement en ligne | **Could** | ❌ Non réalisé | Complexité DevOps (Docker, hébergement) hors scope SAE |
| Replay frame par frame | **Could** | ❌ Non réalisé | La route `/api/stats/replay/{game_id}` existe mais le lecteur frontend n'est pas connecté |
| Heatmap positions visitées | **Could** | ❌ Non réalisé | Visualisation avancée déprioritisée au profit de la robustesse |
| Export PDF | **Could** | ❌ Non réalisé | CSV et JSON sont disponibles ; PDF jugé non prioritaire |
| Sons Web Audio API | **Won't** | ❌ Non réalisé | Confort UI hors scope fonctionnel |
| Multijoueur en ligne | **Won't** | ❌ Non réalisé | Hors scope explicite du projet |

**Synthèse :** Tous les objectifs **Must** et la majorité des **Should** sont atteints.
Les fonctionnalités **Could** non réalisées sont des améliorations de confort ou de
complexité technique élevée (DQN), sans impact sur le cœur fonctionnel du projet.

### 3.3 Déviations techniques intentionnelles

#### WebSocket natif FastAPI vs Socket.IO (CDC)

Le CDC mentionnait Socket.IO comme option de communication. Nous avons choisi le
WebSocket natif FastAPI pour les raisons suivantes :

| Critère | WebSocket natif (choix) | Socket.IO (CDC) |
|---|---|---|
| Dépendance | Intégré Starlette/FastAPI | Bibliothèque ~80 Ko bundle |
| Overhead message | Nul | ~10-30 % (protocole d'enveloppe) |
| Sérialisation | orjson bytes (3-5× plus rapide) | JSON texte |
| Reconnexion | Implémentée (backoff exponentiel) | Intégrée automatiquement |

La reconnexion automatique a été réimplémentée dans `WSService` avec un backoff
exponentiel (100 ms → 200 ms → 400 ms → ... → 10 s), ce qui équivaut fonctionnellement
à la reconnexion Socket.IO.

#### Grille 25×25 vs 20×20 (CDC)

La grille a été portée à 25×25 pour offrir plus d'espace aux algorithmes IA et
rendre les parties plus longues et visuellement intéressantes. Cela n'impacte
pas les algorithmes (A* et Q-Learning sont agnostiques à la taille).

---

## 4. Résultats des agents IA

### 4.1 Performances mesurées (80 épisodes d'entraînement)

| Métrique | Agent A* | Agent Q-Learning |
|---|---|---|
| Score moyen | **31.79** | 9.10 |
| Meilleur score | **42** | 23 |
| Score médian | **32** | 8 |
| Taux de survie | **98.75 %** | 88.75 % |
| Temps de décision moyen | ~2 ms | < 1 ms |
| Mémoire algorithme | N/A | 18.7 Ko (254 états visités) |
| Espace d'états théorique | N/A | 2 048 (2^11) |
| États visités après 80 épisodes | N/A | 254 (12.4 %) |

### 4.2 Analyse comparative

**A* domine Q-Learning**, ce qui est attendu et expliqué :

- A* est **omniscient** : il connaît l'intégralité de la grille à chaque tick et calcule
  le chemin optimal (ou quasi-optimal avec flood fill). Son score de 98.75 % de survie
  reflète l'efficacité de la stratégie tail-chasing pour éviter les culs-de-sac.

- Q-Learning est **partiellement aveugle** : ses 11 features ne capturent que
  l'environnement immédiat (cases voisines + direction + nourriture). Il ne peut pas
  anticiper les pièges à plusieurs cases, ce qui explique le plafond autour du score 23.

**Convergence Q-Learning observable :** Sur les 80 épisodes, le score moyen
croît de ~2 (épisodes 1-10) à ~12 (épisodes 70-80), confirmant que l'apprentissage
fonctionne. L'epsilon décroît de 1.0 à ~0.67 après 80 épisodes (×0.995^80 ≈ 0.67),
ce qui signifie que l'agent est encore majoritairement en exploration à ce stade.

### 4.3 Limites du Q-Learning tabulaire

**Limite principale — l'horizon temporel court :**

Les 11 features capturent uniquement l'environnement **immédiat**. Un serpent de
longueur 30 peut créer un couloir fermé que les features ne détectent pas :
aucun danger immédiat n'est signalé, l'agent fonce dans le couloir, puis se retrouve
bloqué. C'est ce phénomène qui explique le plafond observé.

**Analyse de l'espace d'états :**

| Nombre de features | États théoriques | Episodes nécessaires |
|---|---|---|
| 11 (implémentation) | 2 048 | ~100-200 |
| 15 | 32 768 | ~500-1 000 |
| 20 | 1 048 576 | ~5 000-10 000 |
| Grille complète 25×25 | 2^625 (infini) | Impossible (tabulaire) |

Après 80 épisodes, seulement 254 états sur 2 048 ont été visités (12.4 %).
L'agent ne sait pas comment agir dans les 87.6 % d'états non vus → valeurs Q = 0 → comportement sous-optimal.

**Amélioration la plus prometteuse dans ce cadre :**

L'ajout d'une feature `flood_fill_count` (espace libre accessible, discrétisé en
3 niveaux : faible/moyen/grand) résoudrait les culs-de-sac sans faire exploser
l'espace d'états de manière ingérable (3 × 2^11 = 6 144 états).

---

## 5. Architecture réalisée

### 5.1 Backend (Python 3.11 + FastAPI 0.115)

```
backend/
├── agents/
│   ├── agent_astar.py     # A* : heapq, Manhattan, flood fill, tail-chasing
│   ├── agent_rl.py        # Q-Learning : Q-table JSON, 11 features NumPy
│   └── base_agent.py      # Classe abstraite Agent
├── game_engine/
│   ├── moteur.py          # MoteurJeu : step(), reset(), get_state_dict()
│   ├── serpent.py         # Serpent : corps list[dict], déplacement, croissance
│   ├── grille.py          # Grille : food, obstacles, to_numpy_grid() uint8
│   ├── direction.py       # Enum Direction avec dx/dy et inverser()
│   ├── nourriture.py      # Classe Nourriture (diagramme de classes)
│   ├── obstacle.py        # Classe Obstacle statique/dynamique
│   ├── collecteur_statistiques.py  # Agrégation stats parties
│   └── controleur_jeu.py  # Façade ControleurJeu
├── models/                # ORM SQLAlchemy (5 tables)
├── routes/                # 4 routeurs FastAPI
├── training/trainer.py    # Boucle entraînement RL
├── config.py              # Paramètres centralisés (GRID_SIZE=25, RL params…)
├── database.py            # Engine SQLite + SessionLocal + seed agents
├── main.py                # App FastAPI, CORS, /ws, montage routeurs
└── websocket_handler.py   # Boucle de jeu WebSocket asynchrone
```

**Dépendances principales :**

| Bibliothèque | Version | Rôle |
|---|---|---|
| fastapi | 0.115.0 | Framework web + WebSocket |
| uvicorn | 0.30.0 | Serveur ASGI |
| sqlalchemy | 2.0.36 | ORM SQLite |
| numpy | 2.1.2 | Encodage état Q-Learning |
| orjson | 3.10.7 | Sérialisation JSON rapide |
| websockets | 13.1 | Support WebSocket bas niveau |
| pytest | 8.3.3 | Tests unitaires et d'intégration |
| httpx | 0.27.2 | Client HTTP pour tests API |

### 5.2 Frontend (React 18 + Vite + Redux Toolkit)

```
frontend/src/
├── components/
│   ├── App.jsx             # Routeur SPA (WelcomeScreen / vues principales)
│   ├── BattleArena.jsx     # Duel A* vs RL, graphiques Recharts
│   ├── ControlPanel.jsx    # Start/Pause/Reset, sélecteur mode, curseur vitesse
│   ├── Dashboard.jsx       # Score/steps/mode/état en temps réel
│   ├── GameGrid.jsx        # Container ResizeObserver → Snake
│   ├── Snake.jsx           # Canvas bi-couche (fond + entités)
│   ├── StatsComparison.jsx # Stats agrégées + export CSV/JSON
│   └── TrainingPanel.jsx   # Entraînement RL/A* + toggle mode performance
├── hooks/
│   ├── useWebSocket.js     # Connexion WS, dispatch Redux, delta/full state
│   └── useKeyboard.js      # Flèches + ZQSD → envoie direction via WS
├── services/
│   ├── api.js              # Axios, base URL http://localhost:8000
│   └── websocket.js        # WSService avec backoff exponentiel
├── store/
│   ├── gameSlice.js        # setGameState / applyDelta / setMode
│   ├── statsSlice.js       # fetchTrainingResults (createAsyncThunk)
│   ├── wsSlice.js          # connected, lastMessage
│   └── uiSlice.js          # speed, view
└── tests/
    ├── setup.js            # ResizeObserver mock + Canvas getContext mock
    ├── gameSlice.test.js
    ├── uiSlice.test.js
    ├── Dashboard.test.jsx
    ├── BattleArena.test.jsx
    └── TrainingPanel.test.jsx
```

### 5.3 Efficacité mémoire et temps de calcul

| Composant | Mesure |
|---|---|
| Q-table (qtable.json) | 18.7 Ko — 254 états × 4 valeurs Q |
| Grille NumPy 25×25 uint8 | 625 octets |
| Base de données snake.db | ~64 Ko après plusieurs parties |
| État jeu par tick WebSocket | ~500 octets (delta) |
| Décision A* (pathfinding complet) | ~2 ms |
| Décision Q-Learning (lookup dict) | < 1 ms |
| Tick WebSocket (step complet) | < 5 ms |
| Encodage état NumPy (11 features) | < 0.1 ms |

---

## 6. Retour d'expérience

### Ce qui a bien fonctionné

**Architecture backend solide dès le début.** Le pivot backend-first, bien que coûteux
en temps, a produit un moteur de jeu fiable. Les 107 tests pytest garantissent que
les régressions sont détectées immédiatement.

**FastAPI + WebSocket natif.** Le choix de WebSocket natif avec orjson s'est révélé
excellent : latence < 5 ms par tick, aucun overhead de protocole, reconnexion
gérée proprement.

**Agent A*.** Score moyen de 31.79 avec 98.75 % de survie. La stratégie tail-chasing
(flood fill + suivi de queue) est indispensable et fonctionne très bien.

**Redux bi-mode (setGameState / applyDelta).** La distinction entre le premier frame
complet et les frames suivantes en delta réduit considérablement les données transmises
et les mutations Redux par tick.

**Canvas bi-couche.** Le fond (grille + obstacles statiques) n'est redessiné qu'en cas
de changement de mode/taille. Les frames de jeu ne redessinentque les entités, ce qui
permet des taux de rafraîchissement élevés sans dégradation.

### Ce qui a été difficile

**Synchronisation Redux ↔ WebSocket.** Les messages WebSocket arrivent en dehors du cycle
React. Les dispatches Redux depuis le handler WS ont nécessité une attention particulière
pour éviter les mises à jour concurrentes et les stale closures.

**Tests frontend avec jsdom.** Le canvas HTML5 n'est pas disponible dans jsdom (environnement
de test Vitest). Solution : mock minimal du contexte 2D dans `setup.js` couvrant toutes
les méthodes utilisées par le rendu. De même, `ResizeObserver` n'existe pas dans jsdom
(utilisé par Recharts) → mock no-op global.

**Q-Learning : calibration des récompenses.** Le système de récompenses (+1/-1 pour
rapprochement/éloignement) a nécessité plusieurs itérations. Un système trop agressif
sur les pénalités de mort entraînait l'agent à fuir les obstacles mais à ignorer la nourriture.

**Battle Arena — latence cumulée.** Les deux agents sont appelés séquentiellement via REST
(POST /api/agent/step × 2 par tick). Cette latence cumulée introduit un délai inhérent
à chaque frame de la simulation. Une architecture WebSocket duale résoudrait ce problème
mais ajouterait de la complexité.

### Méthodes et outils — bilan

| Outil | Évaluation |
|---|---|
| FastAPI | Excellent : WebSocket natif, Pydantic, doc Swagger auto |
| SQLAlchemy 2.0 | Très bien : ORM moderne, sessions contextuelles |
| Redux Toolkit | Très bien : createSlice simplifie drastiquement le boilerplate |
| Vitest | Excellent : plus rapide que Jest, API identique, intégré Vite |
| GitHub Actions | Bien : pipeline simple, gratuit, détection régression immédiate |
| Tailwind CSS | Bien : cohérence visuelle rapide, pas de CSS custom à maintenir |
| Recharts | Correct : graphiques réactifs, mais ResponsiveContainer nécessite un mock ResizeObserver en test |

---

## 7. Conclusion et suites possibles

Le projet Snake AI livre une application web complète et fonctionnelle :
moteur de jeu, deux agents IA, base de données persistante, interface de comparaison
temps réel, pipeline CI/CD, et documentation technique complète.

**Les résultats confirment la supériorité attendue de A* sur Q-Learning**
(score moyen 31.79 vs 9.10) : A* bénéficie d'une connaissance complète de la grille,
tandis que Q-Learning apprend uniquement par expérience avec une vue partielle de l'environnement.

### Suites possibles (priorisées)

1. **Deep Q-Network (DQN)** — Remplacer la Q-table tabulaire par un réseau de neurones
   (PyTorch). Résoudrait la limitation des 11 features par généralisation sur des états non vus.
   Score estimé : 40-80 après entraînement suffisant.

2. **Feature flood fill pour Q-Learning** — Ajouter l'espace libre accessible (3 niveaux)
   comme 12e feature. Complexité faible (3×2^11 = 6 144 états), gain estimé +10 à +20 pts.

3. **Replay fonctionnel** — La route `/api/stats/replay/{game_id}` existe et retourne
   les événements. Connecter un composant frontend `ReplayViewer` pour la lecture frame par frame.

4. **Déploiement Docker** — Containeriser backend + frontend avec Docker Compose pour
   un déploiement reproductible sur n'importe quelle machine ou serveur cloud.

5. **Responsive mobile** — Adapter le CSS et les interactions tactiles pour les terminaux mobiles.

---

## 8. Références

- Russell, S., Norvig, P. (2020). *Artificial Intelligence: A Modern Approach* (4e éd.). Pearson.
- Sutton, R., Barto, A. (2018). *Reinforcement Learning: An Introduction* (2e éd.). MIT Press.
- Hart, P., Nilsson, N., Raphael, B. (1968). A Formal Basis for the Heuristic Determination of Minimum Cost Paths. *IEEE TSSC*.
- Documentation FastAPI : https://fastapi.tiangolo.com/
- Documentation React 18 : https://react.dev/
- Documentation Redux Toolkit : https://redux-toolkit.js.org/
- Documentation SQLAlchemy 2.0 : https://docs.sqlalchemy.org/en/20/

---

## 9. Annexes

- **Annexe A** — Schéma base de données → [schema_base_de_donnees.md](schema_base_de_donnees.md)
- **Annexe B** — Diagramme de classes → [diagramme_classes.md](diagramme_classes.md)
- **Annexe C** — Rapport de conception détaillée → [rapport_conception_detaillee_final.md](rapport_conception_detaillee_final.md)
- **Annexe D** — Manuel d'utilisation → [MANUEL_UTILISATION.md](MANUEL_UTILISATION.md)
- **Annexe E** — Manuel d'installation → [../MANUEL_INSTALLATION.md](../MANUEL_INSTALLATION.md)

### Résultats entraînement — 80 épisodes

| Agent | Score moyen | Meilleur score | Taux de survie |
|---|---|---|---|
| A* | **31.79** | **42** | **98.75 %** |
| Q-Learning | 9.10 | 23 | 88.75 % |

Fichier brut : `training_results.csv` à la racine du projet.

### Dépôt GitHub

https://github.com/louzaiceline514-coder/SnakeGAME_final
