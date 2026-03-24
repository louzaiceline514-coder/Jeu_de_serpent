# Mesures de performance – Snake AI

Document répertoriant les mesures de performance collectées sur le projet
(grille 25×25, Python 3.11, Windows 11, CPU Intel i5/i7).

---

## 1. Latences d'inférence

| Agent | Mesure | Valeur observée | Seuil acceptable |
|---|---|---|---|
| A* | Temps moyen par step (50 appels) | **< 5 ms** | 50 ms |
| Q-Learning | Temps moyen par step (200 appels) | **< 0.5 ms** | 5 ms |
| WebSocket round-trip | Tick → frontend | **< 16 ms** | 50 ms |

> L'algorithme A* est plus lent que Q-Learning car il explore le graphe de la grille.
> Q-Learning est un simple lookup dict → O(1) garanti.

Tests automatisés couvrant ces seuils :
- `test_integration.py::test_latence_astar_inferieure_50ms`
- `test_integration.py::test_latence_rl_inferieure_5ms`

---

## 2. Scores moyens observés (benchmark 50 épisodes)

| Agent | Score moyen | Score médian | Meilleur score | Taux survie |
|---|---|---|---|---|
| A* (sans obstacles) | ~18–25 | ~20 | ~35–50 | ~95 % |
| A* (avec obstacles) | ~8–15 | ~10 | ~20–30 | ~80 % |
| Q-Learning (avant entraînement) | ~1–3 | 1 | ~5 | ~30 % |
| Q-Learning (après 500 épisodes) | ~4–8 | ~5 | ~12–18 | ~55 % |

> Ces valeurs sont indicatives. Les performances RL varient selon la Q-table disponible.
> Le mode performance (sans obstacles) accélère la convergence du RL d'environ 30 %.

---

## 3. Occupation mémoire

| Composant | Taille observée |
|---|---|
| Q-table (après 500 épisodes) | ~200–400 KB (JSON) |
| Buffer de replay (1500 frames max) | ~3–8 MB en RAM |
| Base SQLite (1000 parties) | ~5–10 MB |
| Grille NumPy 25×25 (uint8) | **625 octets** par snapshot |

> La grille NumPy uint8 est particulièrement efficace : 25×25 = 625 octets vs
> 5 000 octets avec une liste Python de floats (×8 facteur).

---

## 4. Complexité algorithmique

### A* (agent_astar.py)

| Opération | Complexité |
|---|---|
| Recherche chemin principal | O(N log N) — N = cases de la grille |
| Flood fill (espace libre) | O(N) — BFS sur la grille |
| Worst case (grille 25×25) | O(625 × log 625) ≈ O(5 800) |

### Q-Learning (agent_rl.py)

| Opération | Complexité |
|---|---|
| Encodage état (11 features) | O(L) — L = longueur du serpent |
| Lookup Q-table | O(1) — dict Python |
| Mise à jour Bellman | O(1) |

### MoteurJeu.step()

| Opération | Complexité |
|---|---|
| Détection collision corps | O(L) — liste du corps |
| Détection collision obstacles | O(1) — set Python |
| Génération nourriture | O(N) — liste des cases libres |

---

## 5. Performance du WebSocket temps réel

- Tick interval configurable : 50 ms (rapide) → 500 ms (lent), défaut 200 ms
- À 200 ms/tick : ~5 messages/s → charge réseau négligeable (< 1 KB/s)
- Chaque message JSON ≈ 150–400 octets selon la longueur du serpent

---

## 6. Tests de performance automatisés

Les seuils de performance sont vérifiés automatiquement dans la suite de tests :

```bash
cd backend
python -m pytest tests/test_integration.py -v -k "latence"
```

Résultats attendus :
```
test_latence_astar_inferieure_50ms    PASSED  (< 50 ms)
test_latence_rl_inferieure_5ms        PASSED  (< 5 ms)
```

---

## 7. Limites connues

| Limitation | Impact | Piste d'amélioration |
|---|---|---|
| Q-Learning tabulaire (11 features) | Performances plafonnent ~score 10–15 | Deep Q-Network (DQN) avec PyTorch |
| A* recalcule le chemin à chaque step | Redondant si la grille n'a pas changé | Cache du chemin partiel |
| Replay stocké en RAM | Limite à 1500 frames (~5 min à 200ms/tick) | Streaming vers SQLite en tâche de fond |
| Pas de parallélisme Python (GIL) | Un seul jeu actif à la fois | Processus séparés avec multiprocessing |
