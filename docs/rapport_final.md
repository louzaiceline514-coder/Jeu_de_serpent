# Rapport Final - Snake AI
## SAE4 - Licence Informatique 3e annee - UPJV
### Binome : [Prenom NOM] / [Prenom NOM partenaire]
### Annee universitaire 2024/2025

---

## Table des matieres

1. Introduction
2. Analyse des ecarts
   - 2.1 Objectifs techniques
   - 2.2 Objectifs organisationnels
   - 2.3 Analyse
3. Retour d'experience
4. Conclusion
5. References
6. Annexes

---

## 1. Introduction

Ce document est le rapport final de la SAE4 de Licence Informatique 3e annee.
Il presente une analyse critique du projet realise : une application web de jeu Snake
integrant trois modes de jeu (humain, A*, Q-Learning), comparant les performances
des algorithmes IA via une interface web en temps reel.

Le document est organise en quatre parties : analyse des ecarts entre objectifs initiaux
et resultats obtenus, retour d'experience, conclusion sur les suites possibles, et annexes.

---

## 2. Analyse des ecarts

### 2.1 Objectifs techniques

| Objectif | Statut | Commentaire |
|---|---|---|
| Jeu Snake jouable en mode Manuel | Atteint | Controles clavier ZQSD et fleches |
| Agent A* pathfinding | Atteint | Min-heap + heuristique Manhattan + flood fill |
| Agent Q-Learning | Atteint | Q-table, epsilon-greedy, 11 features NumPy |
| Interface web React | Atteint | React 18, Redux Toolkit, Tailwind CSS |
| Communication WebSocket temps reel | Atteint | FastAPI WebSocket natif |
| Base de donnees persistante | Atteint | SQLite via SQLAlchemy (5 tables) |
| Battle Arena temps reel | Atteint | Duel A* vs Q-Learning avec graphiques |
| Panneau entrainement RL | Atteint | Entrainement et benchmark depuis interface |
| Page statistiques | Atteint | Comparaison A* vs Q-Learning, export CSV |
| Tests automatises | Atteint | 107 tests pytest (unitaires, intégration, E2E, WebSocket) |
| CI/CD GitHub Actions | Atteint | Pipeline automatique sur chaque push |

Tous les objectifs techniques ont ete atteints.

Points qui depassent les specifications initiales :
- Grille 25x25 (au lieu de 20x20 initial)
- Obstacles dynamiques en mode Battle Arena
- Export CSV, JSON et PDF des statistiques
- Replay frame par frame des parties enregistrees
- Heatmap des positions visitees par chaque agent
- Sons Web Audio API (miam, boom, level-up)
- Score median en plus du score moyen
- Mode performance (sans obstacles) pour l'entrainement RL
- Script de lancement automatique (start.bat)

### 2.2 Objectifs organisationnels

Le projet a ete realise sur la duree de la SAE4. Les grandes etapes ont ete :

1. Mise en place de l'architecture (backend FastAPI + frontend React)
2. Developpement du moteur de jeu et des agents IA
3. Integration WebSocket et base de donnees
4. Developpement de l'interface (Battle Arena, Statistiques, Entrainement)
5. Tests, CI/CD et documentation

Le planning a globalement ete tenu. Le developpement de l'agent Q-Learning a pris
plus de temps que prevu en raison de la conception de l'espace d'etats (11 features binaires).

Contraintes respectees :
- Code versionne sur GitHub avec historique complet des commits
- Tests automatises backend (pytest) et frontend (Vitest)
- Documentation technique complete (README, schema BDD, diagramme de classes, manuel)
- Pipeline CI/CD fonctionnel avec GitHub Actions

### 2.3 Analyse

**Ce qui a bien fonctionne :**

L'architecture choisie (FastAPI + WebSocket + React/Redux) s'est revelee bien adaptee
au besoin de temps reel. La separation claire backend/frontend a facilite le travail en binome.

L'agent A* donne d'excellents resultats : score moyen de 31.8 sur 80 episodes, taux de
survie de 98.75%. La strategie de tail-chasing evite efficacement les situations bloquantes.

Le Q-Learning atteint un score moyen de 9.1 avec un meilleur score de 23 apres 80 episodes.
Ses performances restent inferieures a A* (attendu) mais le systeme d'apprentissage
fonctionne correctement (decroissance epsilon, convergence progressive observable).

**Ce qui a ete difficile :**

La synchronisation WebSocket entre le backend et le frontend a necessite une gestion
soigneuse des etats Redux pour eviter les mises a jour concurrentes.

La Battle Arena (deux agents en parallele) pose un defi de performance : les appels
API sequentiels pour chaque step introduisent une latence cumulee inherente.

Le fichier requirements.txt exporte par Conda contenait des chemins locaux Windows
incompatibles avec l'environnement CI Ubuntu. Corrige en remplacant par une liste
propre de dependances pip.

**Methodes et outils :**

Les outils utilises etaient adaptes : Python/FastAPI pour un backend rapide, React/Redux
pour la reactivite de l'interface, SQLite pour la simplicite de deploiement, GitHub Actions
pour l'integration continue. Vitest s'est revele plus rapide que Jest pour les tests frontend.

**Choix WebSocket natif plutot que Socket.IO :**

Le CDC mentionnait Socket.IO comme option, mais nous avons choisi le WebSocket natif
FastAPI pour trois raisons concretes : (1) FastAPI integre nativement le support
WebSocket via Starlette sans dependance supplementaire ; (2) Socket.IO impose un
protocole d'enveloppe qui ajoute ~10-30 % de surcharge par message, alors que notre
application envoie des frames frequentes (~5-20/s) ; (3) Socket.IO.js alourdirait
le bundle frontend de ~80 Ko minifie, alors que le WebSocket natif du navigateur est
sans cout. La reconnexion automatique a ete reimplantee avec un backoff exponentiel
dans WSService, ce qui equivaut fonctionnellement a Socket.IO.

**Fonctions non implementees — analyse MoSCoW :**

La methode MoSCoW (Must/Should/Could/Won't) a guide la priorisation :

| Fonctionnalite | Priorite MoSCoW | Decision | Justification |
|---|---|---|---|
| F1-F5 (jeu, A*, RL, interface, BDD) | Must | Implemente | Coeur du projet |
| F6 (visualisation chemin A*) | Should | Implemente | Overlay ambre en mode A*, chemin planifie visible en temps reel |
| F7 (DQN/reseau de neurones) | Could | Non implemente | Necessite PyTorch + GPU ; complexite tres elevee hors scope SAE |
| F9 (3e agent, aleatoire) | Should | Implemente | AgentAleatoire : reference inferieure pour les benchmarks |
| Multijoueur en ligne | Won't | Non implemente | Hors scope pour ce projet |

L'absence de F7 (DQN) est un choix delibere : la SAE vise a comparer les approches,
pas a optimiser une seule. La Q-table tabulaire est suffisante pour cette demonstration
et reste explicable (lookup O(1), 11 features interpretables).

---

### 2.4 Limites du modele

**SQLite — avantages et inconvenients :**

| Avantages | Inconvenients |
|---|---|
| Aucune installation de serveur requise | Pas de connexions simultanees (1 seul ecrivain) |
| Fichier unique, facilement portable | Non adapte a un deploiement multi-utilisateurs |
| Integre nativement a Python | Performances limitees au-dela de quelques milliers de parties |
| Parfait pour un projet local mono-utilisateur | Pas de types JSON natifs (stockes en TEXT) |

Pour un deploiement en production avec plusieurs utilisateurs simultanement, SQLite
devrait etre remplace par PostgreSQL. Dans le cadre de ce projet (usage local, un seul
utilisateur), SQLite est pleinement suffisant.

**Q-table tabulaire — avantages et inconvenients :**

| Avantages | Inconvenients |
|---|---|
| Implementation simple et interpretable | Espace d'etats explose si la grille grandit |
| Lookup O(1) par acces dictionnaire | Ne generalise pas : chaque etat est appris independamment |
| Legere en memoire (18.7 Ko pour 254 etats) | Necessite beaucoup d'episodes pour converger |
| Pas de GPU ou bibliotheque ML necessaire | Performances plafonnees face a A* (connaissance incomplete) |

Avec une grille 25x25 et 11 features binaires, l'espace theorique est 2^11 = 2048 etats
possibles. Apres 80 episodes d'entrainement, seulement 254 etats distincts ont ete visites
(12.4% de l'espace total), ce qui explique les performances limitees du Q-Learning.

Un Deep Q-Network (DQN) resoudrait ces limites en generalisant sur des etats non vus,
au cout d'une complexite d'implementation bien superieure.

---

### 2.4.1 Justification du choix des 11 features

Les 11 features binaires ont ete choisies selon trois criteres : minimiser l'espace d'etats,
capturer les informations critiques pour la survie, et garantir un encodage O(1).

**Decomposition des 11 features :**

| # | Feature | Valeur | Role |
|---|---|---|---|
| 1 | Danger immédiat devant | 0/1 | Collision dans la prochaine case (mur, corps, obstacle) |
| 2 | Danger immédiat à gauche (relatif) | 0/1 | Idem à gauche selon la direction courante |
| 3 | Danger immédiat à droite (relatif) | 0/1 | Idem à droite selon la direction courante |
| 4 | Direction actuelle : HAUT | 0/1 | One-hot encoding sur 4 bits |
| 5 | Direction actuelle : BAS | 0/1 | One-hot encoding sur 4 bits |
| 6 | Direction actuelle : GAUCHE | 0/1 | One-hot encoding sur 4 bits |
| 7 | Direction actuelle : DROITE | 0/1 | One-hot encoding sur 4 bits |
| 8 | Nourriture en haut | 0/1 | Position relative de la nourriture |
| 9 | Nourriture en bas | 0/1 | Position relative de la nourriture |
| 10 | Nourriture à gauche | 0/1 | Position relative de la nourriture |
| 11 | Nourriture à droite | 0/1 | Position relative de la nourriture |

Ces features encodent trois informations essentielles : eviter la mort immediate (features 1-3),
connaitre l'orientation (features 4-7), et se diriger vers la nourriture (features 8-11).

**Pourquoi pas plus de features ?**

Le choix de 11 features est un compromis delibere entre capacite de representation et
tractabilite de l'apprentissage. Avec N features binaires, l'espace d'etats croit en 2^N :

| Nombre de features | Etats theoriques | Episodes necessaires (estimation) |
|---|---|---|
| 11 (implementation actuelle) | 2 048 | ~100-200 |
| 15 | 32 768 | ~500-1 000 |
| 20 | 1 048 576 | ~5 000-10 000 |
| Grille complete 25x25 | 2^625 (infini) | Impossible (tabul.) |

Au-dela de 15-16 features, la Q-table ne converge plus dans un nombre raisonnable
d'episodes : la majorite des etats ne sera jamais visitee, et l'agent ne saura pas
quoi faire dans ces etats (valeurs Q = 0 par defaut → comportement aleatoire).

---

### 2.4.2 Limite principale : l'horizon temporel court

La limite fondamentale n'est pas le nombre de features mais leur nature : les 11 features
capturent uniquement l'environnement **immediat** (cases voisines). Elles ne permettent
pas de modeliser la forme globale du serpent ni d'anticiper un piege a plusieurs cases.

Exemple concret : un serpent de longueur 30 sur une grille 25x25 peut creer un couloir
ferme que les 11 features ne detectent pas. L'agent fonce dans le couloir car aucun danger
immediat n'est signale, puis se retrouve bloque. C'est precisement ce phenomene qui
explique le plafond observe autour du score 30.

**Ce qui ameliorerait les performances (et pourquoi on ne l'a pas fait) :**

| Amelioration | Gain estime | Complexite ajoutee |
|---|---|---|
| Ajouter l'espace libre (flood fill count, discretise en 3 niveaux) | +10 a +20 pts de score moyen | Moyenne : 3 niveaux x 2^11 = 6 144 etats |
| Ajouter le danger a 2 cases de distance | +5 a +10 pts | Faible : +3 features = 2^14 = 16 384 etats |
| Encoder la distance a la nourriture (5 niveaux) | +5 pts | Moyenne : 5^2 x 2^7 = 3 200 etats |
| Deep Q-Network (grille 25x25 complete) | +50 a +100 pts | Tres elevee : PyTorch, GPU recommande |

L'ajout du flood fill aurait ete la piste la plus prometteuse dans le cadre de ce projet,
car il resoudrait le probleme des culs-de-sac sans exploser l'espace d'etats de maniere
incontrolable. Nous avons prefere garder un modele simple et interpretable conforme
aux objectifs de la SAE, qui compare les approches plutot que d'optimiser une seule.

---

### 2.5 Efficacite memoire et temps de calcul

**Occupation memoire mesurée :**

| Composant | Taille |
|---|---|
| Q-table (qtable.json) | 18.7 Ko — 254 etats x 4 valeurs Q |
| Grille NumPy 25x25 uint8 | 625 octets (25 x 25 x 1 octet) |
| Base de donnees snake.db | 64.0 Ko (apres plusieurs parties) |
| Etat du jeu (dict Python) | ~500 octets par tick WebSocket |

La Q-table tabulaire est extremement legere (18.7 Ko) comparee a un reseau de neurones
DQN qui necessite plusieurs Mo de parametres.
La grille NumPy en uint8 est optimale : 1 octet par cellule suffit pour encoder les
etats (vide=0, serpent=1, nourriture=2, obstacle=3).

**Temps de calcul mesures :**

| Operation | Temps moyen |
|---|---|
| Decision A* (pathfinding complet) | ~2 ms |
| Decision Q-Learning (lookup Q-table) | < 1 ms |
| Tick WebSocket (step complet) | < 5 ms |
| Encodage etat NumPy (11 features) | < 0.1 ms |

L'agent A* est plus lent que Q-Learning a chaque decision car il recalcule un chemin
complet a chaque tick. Cependant, 2 ms reste largement en dessous du tick minimum
de 50 ms configure dans l'interface, donc sans impact perceptible pour l'utilisateur.

---

## 3. Retour d'experience

**Sur les algorithmes IA :**

A* est deterministe et optimal mais necessite une heuristique bien calibree.
La distance de Manhattan est simple et efficace pour un environnement en grille.
La strategie de survie (flood fill + tail-chasing) est indispensable pour eviter
les situations sans issue.

Le Q-Learning necessite beaucoup d'episodes pour converger. Avec seulement 80 episodes,
les performances sont limitees. Un deep Q-Network (DQN) avec reseau de neurones
permettrait une meilleure generalisation sur des grilles plus grandes.
La conception de l'espace d'etats est critique : nos 11 features binaires capturent
les dangers immediats mais ne permettent pas d'anticiper les pieges a long terme.

**Sur l'architecture logicielle :**

La separation claire des responsabilites (moteur de jeu / agents / API / frontend)
a facilite le developpement et les tests. Chaque composant peut etre teste independamment.
Redux Toolkit simplifie considerablement la gestion d'etat dans React pour des applications
avec de nombreux composants partageant des donnees.

**Sur les bonnes pratiques :**

Les tests automatises ont permis de detecter rapidement les regressions lors des
modifications du moteur de jeu. Le CI/CD impose une discipline : chaque commit doit
laisser le code dans un etat stable. La documentation est indispensable pour qu'un
autre developpeur puisse reprendre le projet.

---

## 4. Conclusion

Le projet Snake AI a abouti a une application web complete et fonctionnelle, integrant
un moteur de jeu, deux agents IA (A* et Q-Learning), une base de donnees persistante,
une interface de comparaison en temps reel et un pipeline CI/CD.

Les resultats confirment la superiorite de A* sur Q-Learning pour ce probleme
(score moyen 31.8 vs 9.1), ce qui est attendu : A* beneficie d'une connaissance
complete de la grille tandis que Q-Learning apprend uniquement par experience.

**Suites possibles :**

- Remplacer la Q-table par un Deep Q-Network (DQN) avec PyTorch pour ameliorer
  les performances du Q-Learning sur des grilles plus grandes.
- Ajouter un mode multijoueur en ligne (deux humains sur la meme grille via WebSocket).
- Implementer d'autres algorithmes de pathfinding (Dijkstra, BFS) pour comparaison.
- Deployer l'application sur un serveur public (Docker + Nginx).

---

## 5. References

- Russell, S., Norvig, P. (2020). Artificial Intelligence: A Modern Approach (4e ed.). Pearson.
- Sutton, R., Barto, A. (2018). Reinforcement Learning: An Introduction (2e ed.). MIT Press.
- Documentation FastAPI : https://fastapi.tiangolo.com/
- Documentation React : https://react.dev/
- Documentation Redux Toolkit : https://redux-toolkit.js.org/
- Documentation SQLAlchemy : https://www.sqlalchemy.org/

---

## 6. Annexes

- Annexe A : Schema base de donnees -> docs/schema_base_de_donnees.md
- Annexe B : Diagramme de classes -> docs/diagramme_classes.md
- Annexe C : Manuel d'utilisation -> docs/manuel_utilisation.md

Resultats entrainement (80 episodes) :

| Agent | Score moyen | Meilleur score | Taux de survie |
|---|---|---|---|
| A* | 31.79 | 42 | 98.75% |
| Q-Learning | 9.10 | 23 | 88.75% |

Depot GitHub : https://github.com/louzaiceline514-coder/SnakeGAME_final
