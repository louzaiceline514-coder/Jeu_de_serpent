# Schema de Base de Donnees - Snake AI

## Vue d'ensemble

La base de donnees SQLite (snake.db) est creee automatiquement au demarrage du backend.
Elle contient 5 tables gerees via SQLAlchemy ORM.

---

## Schema relationnel

```
+-------------------------------------+
|               agents                |
+-------------------------------------+
| id (PK)       INTEGER AUTO_INCREMENT|
| name          STRING   NOT NULL     |
| type          STRING   NOT NULL     |
|               human | astar | rl    |
| created_at    DATETIME NOT NULL     |
+----------+--------+------------------+
           |        |
           | 1      | 1 (UNIQUE)
           |        |
           | N      v
+----------v-------------------+  +-----------------------------+
|            games             |  |        agent_stats          |
+------------------------------+  +-----------------------------+
| id (PK)       INTEGER        |  | id (PK)       INTEGER       |
| agent_id (FK) INTEGER NN     |  | agent_id (FK) INTEGER NN    |
| score         INTEGER NN     |  | games_played  INTEGER       |
| nb_steps      INTEGER NN     |  | avg_score     FLOAT         |
| duration      FLOAT   NN     |  | best_score    INTEGER       |
| longueur_serpent INTEGER     |  | win_rate      FLOAT         |
| cause_mort    STRING          |  +-----------------------------+
| taille_grille STRING          |
| obstacles_actifs BOOLEAN      |
| date_fin      DATETIME        |
| created_at    DATETIME NN     |
+----------+-------------------+
           |
           | 1
           |
           | N
+----------v-------------------+
|         game_events          |
+------------------------------+
| id (PK)         INTEGER      |
| game_id (FK)    INTEGER NN   |
| type_evenement  STRING(50)   |
|   move | food | collision    |
| details_json    TEXT         |
| timestamp       FLOAT NN     |
| score           INTEGER      |
| direction       STRING(10)   |
+------------------------------+


+------------------------------+
|         rl_training          |
|       (independante)         |
+------------------------------+
| id (PK)           INTEGER    |
| episode           INTEGER NN |
| recompense_totale FLOAT   NN |
| epsilon           FLOAT   NN |
| perte_moyenne     FLOAT   NN |
| score_final       INTEGER NN |
| taux_apprentissage FLOAT  NN |
| created_at        DATETIME   |
+------------------------------+
```

---

## Description des tables

### Table `agents`
Referentiel des agents du systeme. 3 agents sont crees au premier lancement : humain, astar, rl.

| Colonne | Type | Description |
|---|---|---|
| id | INTEGER PK | Identifiant unique |
| name | STRING | Nom de l'agent (ex. "Agent A*") |
| type | STRING | Type : `human`, `astar`, `rl` |
| created_at | DATETIME | Date de creation |

---

### Table `games`
Enregistre chaque partie jouee par un agent.

| Colonne | Type | Description |
|---|---|---|
| id | INTEGER PK | Identifiant unique |
| agent_id | INTEGER FK | Reference vers agents.id |
| score | INTEGER | Score final |
| nb_steps | INTEGER | Nombre de mouvements effectues |
| duration | FLOAT | Duree en secondes |
| longueur_serpent | INTEGER | Longueur finale du serpent |
| cause_mort | STRING | Cause : mur, corps, obstacle, battle |
| taille_grille | STRING | Ex. 20x20 |
| obstacles_actifs | BOOLEAN | Obstacles presents pendant la partie |
| date_fin | DATETIME | Horodatage de fin de partie |
| created_at | DATETIME | Horodatage d'insertion |

---

### Table `game_events`
Trace les evenements survenus pendant une partie.

| Colonne | Type | Description |
|---|---|---|
| id | INTEGER PK | Identifiant unique |
| game_id | INTEGER FK | Reference vers games.id |
| type_evenement | STRING(50) | Type : move, food, collision |
| details_json | TEXT | Donnees JSON libres |
| timestamp | FLOAT | Secondes depuis le debut |
| score | INTEGER | Score au moment de l'evenement |
| direction | STRING(10) | Direction du serpent |

---

### Table `agent_stats`
Statistiques agregees par agent, mises a jour apres chaque partie.

| Colonne | Type | Description |
|---|---|---|
| id | INTEGER PK | Identifiant unique |
| agent_id | INTEGER FK UNIQUE | Reference vers agents.id |
| games_played | INTEGER | Nombre total de parties |
| avg_score | FLOAT | Score moyen |
| best_score | INTEGER | Meilleur score |
| win_rate | FLOAT | Taux de survie (score > 0) |

---

### Table `rl_training`
Historique des episodes d'entrainement Q-Learning. Table independante.

| Colonne | Type | Description |
|---|---|---|
| id | INTEGER PK | Identifiant unique |
| episode | INTEGER | Numero de l'episode |
| recompense_totale | FLOAT | Recompense cumulee |
| epsilon | FLOAT | Taux d'exploration |
| perte_moyenne | FLOAT | Erreur TD moyenne |
| score_final | INTEGER | Score de l'episode |
| taux_apprentissage | FLOAT | Alpha (learning rate) |
| created_at | DATETIME | Date d'enregistrement |

---

## Relations

- `agents` vers `games` : 1 a N (un agent joue plusieurs parties)
- `games` vers `game_events` : 1 a N (une partie genere plusieurs evenements)
- `agents` vers `agent_stats` : 1 a 1 (contrainte UNIQUE sur agent_id)
- `rl_training` : table independante, ne reference pas agents
