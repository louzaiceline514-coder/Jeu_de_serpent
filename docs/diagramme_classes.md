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
         ^          ^          ^
         |          |          |
+--------+---+  +---+------+  +-----------+
| AgentAStar |  |  AgentQL |  |AgentAleat.|
+------------+  +----------+  +-----------+
| last_path: |  | qtable:  |  |           |
|   list     |  |   dict   |  +-----------+
+------------+  | epsilon: |  |+choisir_  |
| + choisir_ |  |   float  |  |  action() |
|   action() |  | alpha:   |  |+_est_sur..|
| + _astar() |  |   float  |  +-----------+
| + _flood_  |  | gamma:   |
|   fill()   |  |   float  |
| + _safe_   |  +----------+
|   path()   |  | + choisir_   |
+------------+  |   action()   |
                | + encoder_   |
                |   etat()     |
                | + maj_qtable()|
                | + sauvegarder()|
                | + charger()  |
                +--------------+
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


+---------------------------+         +---------------------------+
|        <<enum IntEnum>>   |         |        <<enum str>>       |
|        TypeCellule        |         |         EtatJeu           |
+---------------------------+         +---------------------------+
| VIDE = 0                  |         | EN_COURS = "en_cours"     |
| SERPENT = 1               |         | GAME_OVER = "game_over"   |
| NOURRITURE = 2            |         | PAUSE = "pause"           |
| OBSTACLE = 3              |         +---------------------------+
+---------------------------+         | (sérialisable JSON natif) |
| (utilisé dans to_numpy_   |         +---------------------------+
|  grid() de Grille)        |
+---------------------------+


## Classes du diagramme de conception

+---------------------------+         +---------------------------+
|        Nourriture         |         |         Obstacle          |
+---------------------------+         +---------------------------+
| - position: Coord|None    |         | - position: Coord         |
+---------------------------+         | - type_obstacle: str      |
| + est_presente() -> bool  |         | - age: int                |
| + placer(pos)             |         +---------------------------+
| + effacer()               |         | + est_statique() -> bool  |
+---------------------------+         | + est_actif(lifetime)->bool|
                                      | + vieillir()              |
                                      +---------------------------+

+---------------------------------------+
|            ControleurJeu              |
+---------------------------------------+
| - _moteur: MoteurJeu                  |
| - nourriture: Nourriture              |
| - collecteur: CollecteurStatistiques  |
+---------------------------------------+
| + reset(mode)                         |
| + changer_direction(dir)              |
| + step()                              |
| + get_obstacles() -> list[Obstacle]   |
| + get_state_dict() -> dict            |
| + score: int  (property)              |
| + game_over: bool  (property)         |
+---------------------------------------+
              |           |
              v           v
        [MoteurJeu]  [CollecteurStatistiques]

+---------------------------------------+
|         CollecteurStatistiques        |
+---------------------------------------+
| - scores: list[int]                   |
| - steps: list[int]                    |
| - longueurs: list[int]                |
| - causes_mort: list[str]              |
+---------------------------------------+
| + enregistrer_partie(score,steps,...) |
| + reinitialiser()                     |
| + nb_parties: int  (property)         |
| + score_moyen: float  (property)      |
| + score_median: float  (property)     |
| + meilleur_score: int  (property)     |
| + taux_survie: float  (property)      |
| + to_dict() -> dict                   |
+---------------------------------------+


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
