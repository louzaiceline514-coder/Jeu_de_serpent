# Snake AI – Projet SAE4

Projet universitaire complet proposant un jeu de Snake jouable :
- par un humain (clavier),
- par un agent IA A* (pathfinding),
- par un agent IA Q-Learning (apprentissage par renforcement),
avec un dashboard de comparaison des performances en temps réel.

## Installation

```bash
git clone <votre_repo> snake-ai
cd snake-ai
```

### Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend (React 18 + Vite)

Dans un deuxième terminal :

```bash
cd frontend
npm install
npm run dev
```

Le frontend est accessible sur `http://localhost:5173` et communique avec le backend sur `http://localhost:8000` (CORS déjà configuré).

## Lancement des tests

Depuis la racine du projet :

```bash
pytest tests/ -v
```

Les tests couvrent :
- le moteur de jeu (`Serpent`, `Grille`, `MoteurJeu`),
- les agents IA (`AgentAStar`, `AgentQL`),
- et les routes principales de l’API FastAPI.

## Description des algorithmes

### Algorithme A* (pathfinding)

1. A* explore la grille en maintenant deux ensembles : les cases ouvertes (à visiter) et les cases fermées (déjà visitées).  
2. Chaque case a un coût `g` (distance depuis la tête du serpent) et une heuristique `h` (distance de Manhattan jusqu’à la nourriture).  
3. Le coût total `f = g + h` détermine la priorité dans une file (min-heap) : on visite toujours la case avec le `f` le plus faible.  
4. Les cases correspondant au corps du serpent et aux obstacles sont interdites, ce qui évite les collisions.  
5. Si aucun chemin n’est trouvé, l’agent choisit une direction qui maximise l’espace libre accessible (flood fill simplifié) pour survivre le plus longtemps possible.

### Q-Learning (apprentissage par renforcement)

1. L’état du jeu est encodé en un tuple binaire de 11 caractéristiques : dangers devant/gauche/droite, direction actuelle (one-hot), et position relative de la nourriture (haut/bas/gauche/droite).  
2. Pour chaque état, l’agent maintient une Q-table associant chaque action possible (4 directions) à une valeur Q estimant la « qualité » de cette action.  
3. À chaque étape, il choisit une action via une stratégie epsilon-greedy : avec probabilité ε, il explore (action aléatoire), sinon il exploite (meilleure Q-valeur).  
4. La mise à jour suit l’équation de Bellman : `Q(s,a) ← Q(s,a) + α [r + γ max_a' Q(s',a') − Q(s,a)]`, où `r` est la récompense et `s'` l’état suivant.  
5. Le paramètre ε commence à 1.0 puis décroît (×0.995 jusqu’à 0.01), ce qui favorise l’exploration au début puis l’exploitation d’une politique apprise ; la Q-table est sauvegardée dans `qtable.json`.

## Lecture des graphiques de comparaison

- **LineChart (scores par épisode)** : chaque couleur représente un agent (A* ou Q-Learning). L’axe des abscisses correspond aux épisodes/parties, l’axe des ordonnées au score obtenu. Une courbe qui monte indique une amélioration des performances au fil des parties.  
- **BarChart (moyenne / meilleur / taux de survie)** : pour chaque agent, trois barres résument son comportement global :
  - **Score moyen** : performance typique sur l’ensemble des parties.
  - **Meilleur score** : meilleure partie réalisée (capacité maximale observée).
  - **Taux de survie** : proportion de parties non perdues prématurément (indicateur de robustesse).  
- **Tableau comparatif** : reprend ces indicateurs sous forme textuelle pour faciliter la comparaison rapide entre A* et Q-Learning (nombre de parties jouées, score moyen, meilleur score, taux de survie).

