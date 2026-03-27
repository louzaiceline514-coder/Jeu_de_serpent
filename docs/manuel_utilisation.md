# Manuel d'utilisation — Snake AI
## SAE4 — Licence Informatique 3e année — UPJV

---

## Prérequis

- Navigateur web moderne (Chrome 90+, Firefox 88+, Edge 90+)
- Backend et frontend démarrés (voir `MANUEL_INSTALLATION.md`)
- Indicateur connexion : **point vert "OK"** visible dans la barre de navigation

---

## Lancement rapide

| Système | Action |
|---|---|
| Windows | Double-cliquer sur `start.bat` à la racine du projet |
| Linux | `./start.sh` dans un terminal |
| macOS | Double-cliquer sur `start.command` ou `./start.command` dans un terminal |

Le navigateur s'ouvre automatiquement sur **http://localhost:5174**.

---

## 1. Écran d'accueil

Au premier lancement, l'écran d'accueil présente le projet et permet de choisir
un mode de jeu initial avant d'entrer dans l'application.

### Choisir un mode initial

| Mode | Description |
|---|---|
| **Manuel** | Vous contrôlez le serpent avec le clavier |
| **A\*** | L'IA utilise l'algorithme A* (pathfinding optimal) |
| **Q-Learning** | L'IA utilise l'apprentissage par renforcement (Q-table) |

Cliquez sur **Lancer en mode [X]** pour entrer dans l'application.

> Le mode peut être changé à tout moment depuis le panneau de contrôle.

---

## 2. Barre de navigation

Une fois dans l'application, la barre de navigation en haut donne accès aux 4 vues :

| Bouton | Vue | Description |
|---|---|---|
| **Jouer** | Jeu principal | Partie avec mode Manuel, A* ou Q-Learning |
| **A\* vs QL** | Battle Arena | Duel simultané A* contre Q-Learning |
| **Entrainement** | Panneau entraînement | Entraîner RL ou benchmarker A* |
| **Stats** | Statistiques | Comparaison historique des performances |

### Indicateurs de la navbar

| Indicateur | Signification |
|---|---|
| Point vert **"OK"** | Connexion WebSocket active avec le backend |
| Point rouge **"Off"** | Backend déconnecté — relancer le script de démarrage |
| Badge **score** | Score de la partie en cours (vue Jouer uniquement) |

---

## 3. Vue Jouer

Vue principale accessible via **Jouer** dans la navbar.

### 3.1 Grille de jeu (gauche)

La grille 25×25 est affichée sur un canvas HTML5 (deux couches superposées).

| Élément | Couleur | Description |
|---|---|---|
| Serpent (tête) | Vert vif avec yeux | Position de la tête |
| Serpent (corps) | Vert avec dégradé | Corps du serpent |
| Nourriture | Rouge avec tige verte | Cible à atteindre |
| Obstacles statiques | Gris foncé | Fixes, définis au démarrage |
| Obstacles dynamiques | Gris clair | Apparaissent et disparaissent |
| Chemin A* | Gradient bleu semi-transparent | Chemin planifié (mode A* uniquement) |
| Chemin RL | Gradient violet semi-transparent | Décisions prises (mode Q-Learning uniquement) |
| Compteur FPS | Texte gris en haut à droite | Fréquence de rafraîchissement |

### 3.2 Panneau de contrôle (droite)

**Sélecteur de mode :**

Cliquez sur `Manuel`, `A*` ou `Q-Learning` pour changer de mode.
Le changement prend effet au prochain **Reset**.

**Boutons d'action :**

| Bouton | Action | Conditions |
|---|---|---|
| **Start** | Démarre la partie | Disponible à l'arrêt / après reset |
| **Pause** | Met en pause | Disponible pendant une partie |
| **Reprendre** | Reprend après une pause | Disponible en pause |
| **Reset** | Réinitialise la grille dans le mode courant | Toujours disponible |

> Le jeu ne démarre **pas** automatiquement. Il faut cliquer sur **Start**.

**Curseur de vitesse :**

Ajuste l'intervalle entre deux ticks (50 ms à 500 ms).

| Valeur | Vitesse |
|---|---|
| 50 ms | Très rapide (idéal pour observer A*) |
| 150 ms | Rapide (vitesse par défaut) |
| 300 ms | Modérée |
| 500 ms | Lente (idéal pour observer les décisions RL) |

**Dashboard (en bas du panneau) :**

Affiche en temps réel : score courant, nombre de steps, mode actif, état de la partie.

### 3.3 Contrôles clavier (mode Manuel uniquement)

| Touche | Action |
|---|---|
| `↑` ou `Z` | Déplacer vers le haut |
| `↓` ou `S` | Déplacer vers le bas |
| `←` ou `Q` | Déplacer vers la gauche |
| `→` ou `D` | Déplacer vers la droite |

> Un demi-tour immédiat (ex. aller à gauche alors que le serpent va à droite)
> est automatiquement ignoré pour éviter une mort immédiate.

---

## 4. Vue A* vs Q-Learning (Battle Arena)

Accessible via **A\* vs QL** dans la navbar.

Cette vue fait s'affronter les deux agents IA simultanément sur deux grilles indépendantes.

### 4.1 Démarrer une bataille

1. Cliquez sur **Start Battle**
2. Les deux grilles s'animent en temps réel
3. Les statistiques live s'affichent sous chaque grille

### 4.2 Statistiques live

Chaque grille affiche :

| Indicateur | Description |
|---|---|
| **Score** | Score courant de l'agent |
| **Steps** | Nombre de mouvements effectués |
| **Latence** | Temps de décision de l'agent (ms) |
| **Epsilon** | Taux d'exploration courant (Q-Learning uniquement) |

### 4.3 Boutons de contrôle

| Bouton | Action |
|---|---|
| **Start Battle** | Lance une nouvelle simulation |
| **Pause** | Met en pause les deux agents simultanément |
| **Resume** | Reprend la simulation |
| **Reset** | Réinitialise tout |

> En début de simulation, **Start Battle** est actif et **Pause** est désactivé.
> Après démarrage, **Pause** s'active et **Start Battle** se désactive.

### 4.4 Graphiques

Deux graphiques Recharts s'affichent à droite des grilles :

- **BarChart** : comparaison directe Score / Steps / Latence entre A* et Q-Learning
- **RadarChart** : profil global (vitesse, précision, optimisation, survie)

Un tableau **Historique des rounds** liste les batailles précédentes avec le vainqueur.

---

## 5. Vue Entraînement

Accessible via **Entrainement** dans la navbar.

Permet de lancer un entraînement Q-Learning ou un benchmark A*.

### 5.1 Paramètres

| Champ | Description | Défaut |
|---|---|---|
| **Nombre d'épisodes** | Nombre de parties à jouer | 80 |
| **Mode performance** | Désactive les obstacles (apprentissage plus rapide) | Désactivé |

> Le nombre d'épisodes est limité à 100 par requête.

### 5.2 Lancer un entraînement Q-Learning

1. Réglez le nombre d'épisodes (recommandé : 80)
2. Optionnel : activez **Mode performance** pour une convergence plus rapide
3. Cliquez sur **Entrainer Q-Learning**
4. Attendez la fin (10 à 30 secondes selon le nombre d'épisodes)
5. Les résultats s'affichent dans les graphiques

> Après l'entraînement, la Q-table est sauvegardée dans `qtable.json` et rechargée
> automatiquement au prochain démarrage du backend.

### 5.3 Lancer un benchmark A*

1. Réglez le nombre d'épisodes
2. Cliquez sur **Benchmarker A\***
3. Les scores s'affichent épisode par épisode

### 5.4 Résultats affichés

- **Courbe des épisodes** : évolution du score épisode par épisode (LineChart)
- **MetricCards** :

| Carte | Description |
|---|---|
| RL moyen | Score moyen sur les épisodes RL |
| RL meilleur | Meilleur score RL |
| A\* moyen | Score moyen sur les épisodes A\* |
| A\* meilleur | Meilleur score A\* |

### 5.5 Mode performance

Le toggle **Mode performance** désactive les obstacles statiques pour l'entraînement.
L'agent apprend plus vite sur une grille vide.

Stratégie recommandée :
1. Entraîner 50 épisodes **avec** mode performance (convergence rapide)
2. Entraîner 30 épisodes **sans** mode performance (robustesse aux obstacles)

---

## 6. Vue Statistiques

Accessible via **Stats** dans la navbar.

Affiche les statistiques comparatives basées sur toutes les parties enregistrées en base.

### 6.1 Tableau comparatif

| Colonne | Description |
|---|---|
| **Score moyen** | Moyenne de tous les scores A* ou RL enregistrés |
| **Meilleur score** | Record absolu par agent |
| **Parties jouées** | Nombre total de parties en base |
| **Taux de survie** | Proportion de parties avec score > 0 |

### 6.2 Graphiques

- **Courbe d'évolution** : scores des 20 dernières parties pour A* et Q-Learning
- **Comparaison** : score moyen, meilleur score et taux de survie en barres

### 6.3 Export des données

| Bouton | Format | Contenu |
|---|---|---|
| **Export CSV** | `.csv` | Historique brut des parties (id, agent, score, steps, date…) |
| **Export JSON** | `.json` | Structure complète avec métadonnées |

---

## 7. Problèmes courants

| Problème | Cause | Solution |
|---|---|---|
| Écran blanc au chargement | Backend non démarré ou port incorrect | Vérifier que le backend tourne sur le port 8000 |
| Indicateur **"Off"** rouge | Backend déconnecté | Relancer le script de démarrage |
| Jeu ne démarre pas | Start non cliqué | Cliquer sur **Start** (pas de démarrage automatique) |
| Score reste à 0 en mode Manuel | Flèches avant le Start | Cliquer sur **Start** avant d'utiliser les flèches |
| Battle Arena ne démarre pas | Backend déconnecté | Vérifier l'indicateur vert dans la navbar |
| Entraînement semble bloqué | Calcul normal | Attendre 10-30 secondes selon le nombre d'épisodes |
| Q-Learning peu performant | Q-table vide ou peu entraînée | Lancer au moins 50 épisodes d'entraînement |
| Obstacles absents | Mode performance activé | Désactiver le toggle Mode performance |
| Chemin A* non visible | Mode ≠ A* | Sélectionner le mode A* et relancer une partie |
