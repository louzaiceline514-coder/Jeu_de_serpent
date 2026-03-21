# Manuel d'utilisation - Snake AI

## Prerequis

- Navigateur web moderne (Chrome, Firefox, Edge)
- Backend et frontend lances (voir installation)

---

## Lancement rapide

Double-cliquez sur `start.bat` a la racine du projet.
Le navigateur s'ouvre automatiquement sur http://localhost:5174

---

## 1. Ecran d'accueil

Au lancement, un ecran de presentation s'affiche avec trois modes disponibles.

### Choisir un mode

| Mode | Icone | Description |
|---|---|---|
| Manuel | Manette | Vous controlez le serpent avec le clavier |
| A* | Telescope | L'IA utilise A* pour trouver la nourriture |
| Q-Learning | Cerveau | Agent par renforcement, apprend en jouant |

1. Cliquez sur le mode souhaite
2. Cliquez sur **Lancer en mode [X]**

---

## 2. Interface principale

Une fois dans l'application, la barre de navigation en haut permet d'acceder aux 4 vues :

| Bouton | Vue |
|---|---|
| Jouer | Jeu principal |
| A* vs QL | Battle Arena (duel en temps reel) |
| Entrainement | Panneau d'entrainement RL / benchmark A* |
| Performances | Statistiques comparatives |

---

## 3. Vue Jouer

### Panneau de controle (droite)

**Selectionner un mode de jeu :**
- Cliquez sur `Manuel`, `A*` ou `Q-Learning`

**Demarrer une partie :**
- Cliquez sur **Start** pour lancer la partie
- Le jeu ne demarre pas automatiquement

**Pendant la partie :**
- **Pause** : met la partie en pause
- **Reprendre** : reprend apres une pause
- **Reset** : reinitialise la grille

**Regler la vitesse :**
- Curseur en bas du panneau
- 50 ms = tres rapide / 500 ms = lent

### Grille de jeu (gauche)

| Element | Couleur |
|---|---|
| Serpent (tete) | Vert vif |
| Serpent (corps) | Vert semi-transparent |
| Nourriture | Rouge |
| Obstacles statiques | Gris fonce |
| Obstacles dynamiques | Gris clair |

### Controles clavier (mode Manuel uniquement)

| Touche | Action |
|---|---|
| Fleche Haut ou Z | Monter |
| Fleche Bas ou S | Descendre |
| Fleche Gauche ou Q | Aller a gauche |
| Fleche Droite ou D | Aller a droite |

> Un demi-tour immediat (ex. gauche->droite) est automatiquement ignore.

---

## 4. Vue A* vs Q-Learning (Battle Arena)

Cette vue fait s'affronter les deux agents IA simultanement sur la meme grille.

### Demarrer une bataille

1. Cliquez sur **Start Battle**
2. Les deux grilles s'animent en temps reel
3. Les statistiques live s'affichent sous chaque grille :
   - Score, Steps, Steps/Food
   - Temps d'inference (ms)
   - Score de securite de zone

### Controles

| Bouton | Action |
|---|---|
| Start Battle | Lance une nouvelle simulation |
| Pause | Met en pause les deux agents |
| Resume | Reprend la simulation |
| Reset | Reinitialise tout |

### Graphiques

- **Graphique en barres** : comparaison directe score/steps/latence/securite
- **Graphique radar** : profil global (vitesse, precision, optimisation, survie)
- **Historique** : tableau des rounds precedents avec le vainqueur

---

## 5. Vue Entrainement

Permet de lancer un entrainement Q-Learning ou un benchmark A*.

### Lancer un entrainement Q-Learning

1. Reglez le nombre d'episodes (10 a 100, defaut 80)
2. Cliquez sur **Entrainer Q-Learning**
3. Attendez la fin (peut prendre 10-30 secondes)
4. Les resultats s'affichent dans les graphiques

### Lancer un benchmark A*

1. Reglez le nombre d'episodes
2. Cliquez sur **Benchmarker A***
3. Les scores par episode s'affichent

### Resultats affiches

- **Courbe des episodes** : evolution du score episode par episode
- **Synthese** : score moyen, meilleur score, taux de survie pour chaque algorithme

> Apres un entrainement RL, la Q-table est sauvegardee dans `qtable.json` et rechargee automatiquement au prochain demarrage.

---

## 6. Vue Performances

Affiche les statistiques comparatives basees sur toutes les parties enregistrees en base.

### Tableau comparatif

| Colonne | Description |
|---|---|
| Score moyen | Moyenne de tous les scores enregistres |
| Meilleur score | Record absolu |
| Parties | Nombre de parties enregistrees |
| Taux de survie | Pourcentage de parties avec score > 0 |

### Graphiques

- **Courbe d'evolution** : les 20 dernieres parties pour A* et Q-Learning
- **Comparaison** : score moyen, meilleur score et taux de survie en barres

### Export CSV

Cliquez sur **Export CSV** pour telecharger l'historique complet des parties au format CSV.

---

## 7. Indicateurs de l'interface

### Barre de navigation

| Indicateur | Signification |
|---|---|
| Point vert "OK" | Connexion WebSocket active avec le backend |
| Point rouge "Off" | Backend deconnecte - relancer start.bat |
| Badge score | Score de la partie en cours |

---

## 8. Problemes courants

| Probleme | Solution |
|---|---|
| Ecran blanc au chargement | Verifier que le backend tourne sur le port 8000 |
| Indicateur "Off" en rouge | Relancer start.bat |
| Battle Arena ne demarre pas | Le backend doit etre connecte (indicateur vert) |
| Entrainement semble bloque | Normal - attendre 10-30 secondes selon le nombre d'episodes |
| Score toujours a 0 | Cliquer sur Start avant d'utiliser les fleches |
