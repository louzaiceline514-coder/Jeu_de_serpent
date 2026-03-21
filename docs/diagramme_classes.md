# Diagramme de Classes - Snake AI

## Backend (Python / FastAPI)

```
+---------------------------+
|        <<abstract>>       |
|          Agent            |
+---------------------------+
| - id: int                 |
| - type: str               |
+---------------------------+
| + choisir_action(         |
|     state: dict) -> str   |  <<abstract>>
+---------------------------+
         ^          ^
         |          |
+--------+---+  +---+----------+
| AgentAStar |  |   AgentQL    |
+------------+  +--------------+
|            |  | qtable: dict |
|            |  | epsilon: float|
|            |  | alpha: float  |
|            |  | gamma: float  |
+------------+  +--------------+
| + choisir_ |  | + choisir_   |
|   action() |  |   action()   |
| + _astar() |  | + encoder_   |
| + _flood_  |  |   etat()     |
|   fill()   |  | + maj_qtable()|
| + _safe_   |  | + sauvegarder()|
|   path()   |  | + charger()  |
+------------+  +--------------+
                      ^
                      |
               +------+------+
               |   Trainer   |
               +-------------+
               | scores: list|
               | en_cours:bool|
               +-------------+
               | + entrainer(|
               |   episodes) |
               +-------------+


+---------------------------+
|         MoteurJeu         |
+---------------------------+
| - serpent: Serpent        |
| - grille: Grille          |
| - score: int              |
| - game_over: bool         |
| - step_count: int         |
| - mode: str               |
+---------------------------+
| + reset(mode)             |
| + step()                  |
| + changer_direction(dir)  |
| + get_state_dict() -> dict|
+---------------------------+
         |              |
         | 1            | 1
         v              v
+--------+---+    +------+-----+
|  Serpent   |    |   Grille   |
+------------+    +------------+
| - corps:   |    | - size: int|
|  list[dict]|    | - food: dict|
| - direction|    | - obstacles|
|   : Direction|  |   : list   |
+------------+    +------------+
| + deplacer()|   | + generer_ |
| + grandir() |   |   nourriture()|
| + inverser_ |   | + to_numpy_|
|   direction()|  |   grid()   |
+------------+    +------------+


+---------------------------+
|        <<enum>>           |
|        Direction          |
+---------------------------+
| HAUT                      |
| BAS                       |
| GAUCHE                    |
| DROITE                    |
+---------------------------+
| + inverser() -> Direction |
| + est_inverse(d) -> bool  |
+---------------------------+


## Modeles ORM (SQLAlchemy)

+-------------------+       +-------------------+
|      Agent        |       |   AgentStats      |
| (ORM Model)       |       | (ORM Model)       |
+-------------------+       +-------------------+
| id: int PK        | 1---1 | id: int PK        |
| name: str         |       | agent_id: int FK  |
| type: str         |       | games_played: int |
| created_at: dt    |       | avg_score: float  |
+-------------------+       | best_score: int   |
         |                  | win_rate: float   |
         | 1                +-------------------+
         |
         | N
+--------v----------+       +-------------------+
|       Game        |       |   RLTraining      |
| (ORM Model)       |       | (ORM Model)       |
+-------------------+       +-------------------+
| id: int PK        |       | id: int PK        |
| agent_id: int FK  |       | episode: int      |
| score: int        |       | recompense_totale:|
| nb_steps: int     |       |   float           |
| duration: float   |       | epsilon: float    |
| longueur_serpent: |       | perte_moyenne:    |
|   int             |       |   float           |
| cause_mort: str   |       | score_final: int  |
| taille_grille: str|       | taux_apprentissage|
| obstacles_actifs: |       |   : float         |
|   bool            |       | created_at: dt    |
| date_fin: dt      |       +-------------------+
| created_at: dt    |
+-------------------+
         |
         | 1
         | N
+--------v----------+
|    GameEvent      |
| (ORM Model)       |
+-------------------+
| id: int PK        |
| game_id: int FK   |
| type_evenement:   |
|   str             |
| details_json: str |
| timestamp: float  |
| score: int        |
| direction: str    |
+-------------------+


## Frontend (React / Redux)

+---------------------+    +---------------------+
|   Redux Store       |    |  WebSocket Service  |
+---------------------+    +---------------------+
| gameSlice           |    | + connect()         |
|  - snake: list      |    | + send(type, data)  |
|  - food: dict       |    | + onMessage(cb)     |
|  - score: int       |    +---------------------+
|  - gameOver: bool   |             |
|  - mode: str        |             | messages
+---------------------+             v
| statsSlice          |    +---------------------+
|  - astar: dict      |    |    FastAPI Backend   |
|  - rl: dict         |    |    WebSocket /ws     |
|  - history: list    |    +---------------------+
+---------------------+
| wsSlice             |
|  - connected: bool  |
|  - lastMessage: obj |
+---------------------+
| uiSlice             |
|  - speed: int       |
+---------------------+


+-------------------+   +-------------------+   +-------------------+
|      App.jsx      |   |   GameGrid.jsx    |   | ControlPanel.jsx  |
+-------------------+   +-------------------+   +-------------------+
| - view: string    |   | - canvasRef       |   | - mode: string    |
| - hasEntered: bool|   +-------------------+   | - paused: bool    |
+-------------------+   | + drawSnake()     |   | - speed: int      |
| + changeView()    |   | + drawFood()      |   +-------------------+
| + handleEnter()   |   | + drawObstacles() |   | + handleStart()   |
+-------------------+   +-------------------+   | + handleReset()   |
                                                | + handlePause()   |
                                                +-------------------+

+-------------------+   +-------------------+   +-------------------+
|  BattleArena.jsx  |   | StatsComparison   |   | TrainingPanel.jsx |
+-------------------+   +-------------------+   +-------------------+
| - astarGame: obj  |   | lineData: array   |   | - episodes: int   |
| - rlGame: obj     |   | barData: array    |   | - loading: string |
| - isRunning: bool |   +-------------------+   +-------------------+
+-------------------+   | + handleExport()  |   | + handleRun()     |
| + startBattle()   |   +-------------------+   +-------------------+
| + stepAgent()     |
| + togglePause()   |
+-------------------+
```
