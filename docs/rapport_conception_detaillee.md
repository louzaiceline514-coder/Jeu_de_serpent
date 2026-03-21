# Rapport de Conception Detaillee - Snake AI
## SAE4 - Licence Informatique 3e annee - UPJV
### Binome : [Prenom NOM] / [Prenom NOM partenaire]
### Annee universitaire 2024/2025

---

## Table des matieres

1. Architecture logicielle
2. Modelisation technique UML
   - 2.1 Diagramme de classes
   - 2.2 Diagramme de sequence
   - 2.3 Schema de base de donnees
3. Justification des choix techniques
4. Algorithmes implementes
5. Plan d'etudes

---

## 1. Architecture logicielle

### Vue d'ensemble

L'application suit une architecture client-serveur en deux couches distinctes :

```
+------------------------------------------+        +------------------------------------------+
|           FRONTEND (React 18)            |        |           BACKEND (FastAPI)               |
|                                          |        |                                          |
|  App.jsx                                 |        |  main.py                                 |
|   +- WelcomeScreen                       |        |   +- routes/game_routes.py               |
|   +- GameGrid.jsx (canvas)               | REST   |   +- routes/agent_routes.py              |
|   +- ControlPanel.jsx                    <-------->   +- routes/stats_routes.py              |
|   +- BattleArena.jsx                     | HTTP   |   +- routes/training_routes.py           |
|   +- StatsComparison.jsx                 |        |   +- websocket_handler.py                |
|   +- TrainingPanel.jsx                   |        |                                          |
|                                          | WS     |  game_engine/                            |
|  Redux Store                             <-------->   +- moteur.py                           |
|   +- gameSlice                           |        |   +- serpent.py                          |
|   +- statsSlice                          |        |   +- grille.py                           |
|   +- wsSlice                             |        |   +- direction.py                        |
|   +- uiSlice                             |        |                                          |
|                                          |        |  agents/                                 |
|  services/                               |        |   +- agent_astar.py                      |
|   +- api.js (REST)                       |        |   +- agent_rl.py                         |
|   +- websocket.js (WS)                   |        |   +- base_agent.py                       |
+------------------------------------------+        |                                          |
                                                    |  SQLite (snake.db)                       |
                                                    |   +- agents                               |
                                                    |   +- games                                |
                                                    |   +- game_events                          |
                                                    |   +- agent_stats                          |
                                                    |   +- rl_training                          |
                                                    +------------------------------------------+
```

### Flux de communication

**Mode Jeu (WebSocket) :**
```
Frontend                    Backend
   |                           |
   |-- WS connect /ws -------->|
   |-- send "set_mode" ------->|  (choix: manual / astar / rl)
   |-- send "start" ---------->|
   |                           |-- game loop (tick toutes les N ms)
   |<-- game_state (JSON) -----|  (serpent, nourriture, score...)
   |<-- game_state (JSON) -----|
   |-- send "set_paused" ----->|
   |-- send "reset" ---------->|
```

**Mode Battle Arena (REST) :**
```
Frontend                    Backend
   |                           |
   |-- POST /api/agent/init -->|  (initialise la grille)
   |<-- game_state ------------|
   |-- POST /api/agent/step -->|  (agent_type: astar, game_state)
   |<-- {payload, meta} -------|  (nouvel etat + temps inference)
   |-- POST /api/agent/step -->|  (agent_type: rl, game_state)
   |<-- {payload, meta} -------|
   |  ... (boucle jusqu game over)
   |-- POST /api/agent/save -->|  (enregistre la partie en BDD)
```

---

## 2. Modelisation technique UML

### 2.1 Diagramme de classes (simplifie)

```
[Agent <<abstract>>]
    - choisir_action(state) : str <<abstract>>
        ^              ^
        |              |
[AgentAStar]      [AgentQL]
  + _astar()        - qtable : dict
  + _flood_fill()   - epsilon : float
  + _safe_path()    + encoder_etat() : tuple
                    + maj_qtable()

[MoteurJeu]
  - serpent : Serpent
  - grille  : Grille
  - score   : int
  + reset(mode)
  + step()
  + get_state_dict() : dict
      |           |
      v           v
[Serpent]     [Grille]
  - corps[]    - food
  - direction  - obstacles[]
  + deplacer() + generer_nourriture()
  + grandir()  + to_numpy_grid()

[Direction <<enum>>]
  HAUT | BAS | GAUCHE | DROITE
  + inverser() : Direction

[Trainer]
  - scores : list
  + entrainer(episodes)

[GameWebSocketManager]
  + connect(ws)
  + broadcast(data)
  + game_loop()
```

Voir `docs/diagramme_classes.md` pour le diagramme complet avec tous les attributs.

### 2.2 Diagramme de sequence - Partie en mode A*

```
Utilisateur   Frontend (React)   WebSocket   Backend (FastAPI)   AgentAStar   BDD
    |               |               |               |               |          |
    |-- clic Start->|               |               |               |          |
    |               |-- send "start"|               |               |          |
    |               |               |-- message --->|               |          |
    |               |               |               |-- game_loop()|           |
    |               |               |               |-- choisir_action()------>|
    |               |               |               |<-- direction ------------|
    |               |               |               |-- step()      |          |
    |               |               |<-- game_state-|               |          |
    |               |<-- WS message-|               |               |          |
    |               |-- Redux update|               |               |          |
    |<-- re-render--|               |               |               |          |
    |               |               |    ...boucle tick...          |          |
    |               |               |               |-- game_over   |          |
    |               |               |               |-- save_game()----------->|
    |               |               |<-- game_over--|               |          |
    |<-- affichage--|               |               |               |          |
       Game Over    |               |               |               |          |
```

### 2.3 Schema de base de donnees

Voir `docs/schema_base_de_donnees.md` pour le schema complet.

Relations principales :
- `agents` (1) --> (N) `games` : un agent joue plusieurs parties
- `games` (1) --> (N) `game_events` : une partie genere plusieurs evenements
- `agents` (1) --> (1) `agent_stats` : stats agregees par agent (UNIQUE)
- `rl_training` : table independante pour historique entrainement QL

---

## 3. Justification des choix techniques

### Backend : Python + FastAPI

**Pourquoi Python ?**
- Langage maitrise et adapte a l'IA (NumPy, ecosysteme ML riche)
- Implementation naturelle des algorithmes A* et Q-Learning
- Prototypage rapide

**Pourquoi FastAPI ?**
- Support natif WebSocket (asynchrone via asyncio)
- Validation automatique des donnees (Pydantic)
- Performance elevee (comparable a Node.js)
- Documentation API automatique (Swagger UI)
- Plus moderne et rapide que Flask

**Pourquoi SQLite + SQLAlchemy ?**
- SQLite : aucune installation de serveur BDD necessaire, fichier unique
- SQLAlchemy ORM : abstraction SQL, protection contre injections, migrations faciles
- Adapte pour un projet monoutilisateur / developpement local

### Frontend : React 18 + Redux Toolkit + Tailwind CSS

**Pourquoi React ?**
- Composants reutilisables (GameGrid, ControlPanel, etc.)
- Mise a jour efficace du DOM via virtual DOM (important pour le rendu temps reel)
- Ecosysteme riche (Redux, Recharts, hooks)

**Pourquoi Redux Toolkit ?**
- Gestion centralisee de l'etat partage entre composants (score, mode, connexion WS)
- Slices bien separes (game / stats / ws / ui)
- createAsyncThunk simplifie les appels API asynchrones

**Pourquoi Vite ?**
- Demarrage serveur dev quasi-instantane (vs Webpack)
- Hot Module Replacement rapide
- Support natif ESModules

**Pourquoi Tailwind CSS ?**
- Styles directement dans le JSX, pas de fichiers CSS separes a gerer
- Classes utilitaires predefinies (pas de CSS custom a ecrire)
- Design system coherent

**Pourquoi Canvas HTML5 pour la grille ?**
- Performance superieure a un rendu SVG ou DOM pour une grille 20x20 mise a jour a chaque tick
- Controle total du rendu pixel par pixel

**Pourquoi Recharts pour les graphiques ?**
- Bibliotheque React native (pas de manipulation DOM manuelle)
- BarChart, LineChart, RadarChart disponibles out-of-the-box
- Responsive automatiquement

### Communication : WebSocket

**Pourquoi WebSocket et pas uniquement REST ?**
- Le jeu necessite des mises a jour frequentes (toutes les 50-500ms)
- REST impliquerait du polling qui est inefficace et introduit de la latence
- WebSocket : connexion persistante, push serveur vers client, latence minimale

**Architecture hybride WebSocket + REST :**
- WebSocket : boucle de jeu en temps reel (mode Jouer)
- REST : operations ponctuelles (Battle Arena step par step, stats, entrainement)

### Tests : pytest + Vitest

- pytest : framework Python standard, fixtures puissantes, 45 tests en 4.89s
- Vitest : plus rapide que Jest, integre nativement avec Vite, meme API que Jest

### CI/CD : GitHub Actions

- Gratuit pour depots publics GitHub
- Pipeline automatique a chaque push sur main
- Deux jobs independants (Python / JavaScript) en parallele

---

## 4. Algorithmes implementes

### 4.1 Algorithme A* (agent_astar.py)

**Principe :**
A* est un algorithme de recherche de chemin qui trouve le chemin optimal entre
deux points en minimisant f(n) = g(n) + h(n).

**Implementation :**
```
g(n) = distance reelle parcourue depuis la tete du serpent
h(n) = distance de Manhattan vers la nourriture
       h = |x_food - x_serpent| + |y_food - y_serpent|
```

**File de priorite (min-heap) :**
```
heapq.heappush(open_set, (f, compteur, position, chemin))
```

**Cases interdites :** corps du serpent + obstacles statiques + obstacles dynamiques

**Strategie de survie (tail-chasing) :**
Si le chemin vers la nourriture existe mais l'etat d'arrivee ne permet pas de
rejoindre la queue du serpent (flood fill < taille serpent), l'agent suit sa
propre queue via un second appel A* pour temporiser et eviter le cul-de-sac.

**Flood fill (BFS) :**
Evalue l'espace libre accessible depuis une position donnee pour eviter de
s'enfermer. Si l'espace libre < seuil, le chemin est considerere dangereux.

**Complexite :** O(N log N) ou N = nombre de cases de la grille (20x20 = 400)

### 4.2 Q-Learning (agent_rl.py)

**Principe :**
Apprentissage par renforcement tabulaire. L'agent apprend une politique optimale
en associant a chaque paire (etat, action) une valeur Q via l'equation de Bellman.

**Equation de Bellman :**
```
Q(s, a) <- Q(s, a) + alpha * [r + gamma * max(Q(s', a')) - Q(s, a)]
```

**Parametres :**
- alpha (learning rate) = 0.1
- gamma (discount factor) = 0.95
- epsilon (exploration) : 1.0 -> 0.01, decroit par * 0.995 par episode

**Espace d'etats - 11 features binaires (NumPy uint8) :**
```
[0] Danger devant (relatif a la direction actuelle)
[1] Danger a gauche (relatif)
[2] Danger a droite (relatif)
[3] Direction actuelle : HAUT
[4] Direction actuelle : BAS
[5] Direction actuelle : GAUCHE
[6] Direction actuelle : DROITE
[7] Nourriture au-dessus du serpent
[8] Nourriture en-dessous du serpent
[9] Nourriture a gauche du serpent
[10] Nourriture a droite du serpent
```

**Actions :** 4 directions (HAUT, BAS, GAUCHE, DROITE)

**Politique epsilon-greedy :**
```
avec probabilite epsilon  -> action aleatoire (exploration)
avec probabilite 1-epsilon -> argmax Q(s, a) (exploitation)
```

**Recompenses :**
```
+10 : nourriture mangee
-10 : mort (collision mur, corps, obstacle)
 +1 : rapprochement de la nourriture
 -1 : eloignement de la nourriture
```

**Persistance :** Q-table sauvegardee dans qtable.json, rechargee au demarrage.

**Complexite :** O(1) par decision (lookup dictionnaire)

### 4.3 Comparaison des algorithmes

| Critere | A* | Q-Learning |
|---|---|---|
| Type | Recherche de chemin | Apprentissage par renforcement |
| Connaissance grille | Complete (omniscient) | Partielle (11 features locales) |
| Apprentissage | Non (deterministe) | Oui (s'ameliore avec episodes) |
| Score moyen (80 ep.) | 31.79 | 9.10 |
| Meilleur score | 42 | 23 |
| Taux de survie | 98.75% | 88.75% |
| Temps decision | ~2ms | <1ms |
| Optimal | Oui (si grille connue) | Non (politique apprise) |

---

## 5. Plan d'etudes

### Semaine 1 - Fondations
- Mise en place environnement (Python venv, Node.js, Git)
- Architecture backend : moteur de jeu, serpent, grille, direction
- Tests unitaires moteur (pytest)
- API REST basique (FastAPI)

### Semaine 2 - Agents IA
- Implementation Agent A* avec heuristique Manhattan
- Tests Agent A* (chemins simples, obstacles, fallback)
- Implementation Agent Q-Learning (encodage etat, Q-table, epsilon-greedy)
- Tests Agent RL (encodage, mise a jour Q-table, decroissance epsilon)

### Semaine 3 - Integration et BDD
- Communication WebSocket (FastAPI + React)
- Base de donnees SQLite (SQLAlchemy, 5 tables)
- Enregistrement parties et statistiques
- Frontend React de base (GameGrid canvas, ControlPanel)

### Semaine 4 - Interface avancee
- Battle Arena (duel A* vs Q-Learning temps reel)
- Panneau entrainement RL et benchmark A*
- Page statistiques avec graphiques (Recharts)
- Redux store complet (4 slices)

### Semaine 5 - Tests et CI/CD
- Tests d'integration backend (BDD, flux complets, latence)
- Tests frontend (Vitest, Redux slices, composants)
- Pipeline GitHub Actions (pytest + Vitest)
- Corrections bugs CI

### Semaine 6 - Finalisation
- Script lancement automatique (start.bat)
- Documentation complete (README, schema BDD, diagrammes)
- Rapport final et rapport de conception
- Preparation depôt Moodle
