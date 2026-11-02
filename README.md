# Orlo

Jeu abstrait à deux joueurs, sur un tissu quadrillé, contre l'ordinateur (trois niveaux : Apprenti, Compagnon, Maître).

*Orlo* : « ourlet, bord du tissu » en italien ; *sull'orlo*, « au bord du gouffre ».

## Règles

1. Noir commence. À son tour, on pose une pierre sur un croisement vide.
2. La pierre posée **pousse d'un cran** tout ce qui la touche, dans les 4 directions. Une file de pierres collées est poussée en entier, quelle que soit sa couleur.
3. Une pierre poussée hors du tissu est **sortie**. On gagne en sortant **5 pierres adverses**. Une pierre qu'on sort soi-même de sa propre couleur compte pour l'adversaire.
4. Chaque joueur a des **pierres rouges** (4 par défaut sur 7×7). Elles ne poussent pas, ne bougent jamais et bloquent toute file qui les contient. En poser une coûte le tour.
5. Après 120 coups, ou si le tissu est plein, celui qui a perdu le moins de pierres gagne.

## Interface

Écran d'ouverture, accueil avec une partie de démonstration, tutoriel interactif en 6 leçons, partie contre l'ordinateur (3 niveaux), réglages (taille, rouges, couleur) avec l'équilibre mesuré en simulation. Rendu Canvas : tissu teint et tissé (safran, lin ou olive) posé sur une table en noyer, lignes brodées, ourlet cousu, pierres animées.

## Lancer

Site statique sans build : servir le dossier (le Web Worker ne marche pas en `file://`, le jeu bascule alors sur le thread principal).

```sh
npx serve .        # ou : python3 -m http.server
```

## Simulations

```sh
node tools/selfplay.js 7 4 20     # équilibrage : taille, rouges, parties
node tools/ladder.js 4 2 16       # compétence : profondeur A contre profondeur B
```
