# Orlo — contexte projet

Jeu de pierres 1v1 contre IA, web mobile en priorité (iPhone Safari). Prototype jouable, né d'un échange avec Claude le 1er novembre 2026.

## Fichiers

- `index.html` : interface (SVG, animations, aperçu du coup, réglages). Pas de build.
- `engine.js` : règles + IA, sans dépendance. Global `Engine` dans le navigateur, `require` sous Node.
- `worker.js` : exécute `Engine.search` dans un Web Worker.
- `tools/` : simulations Node (équilibrage, test de compétence).

## Moteur (engine.js)

- Plateau N×N à plat (`Int8Array`) : 0 vide, 1 Noir, 2 Blanc, 3 rouge. `Engine.configure(n)` avant `newState(reds)`.
- Coups : index de case `0..NN-1` pour une pierre, `100 + index` pour une rouge (`REDOFF`).
- `play(state, move, trace?)` : `trace` reçoit `[de, vers (-1 = sortie), direction]` pour animer.
- Poussée : pour chaque direction, la file contiguë de pierres est décalée d'un cran ; la dernière sort si elle est au bord ; une rouge dans la file bloque toute la file.
- IA : negamax alpha-beta, approfondissement itératif borné en temps (`{ms, maxDepth}`), tri des coups par évaluation statique.
- Évaluation : écart de pierres sorties ×1000, rouges restantes ×30, position (bord pénalisé, centre valorisé, table `PV` par distance au bord).
- Niveaux UI : Apprenti 0,4 s prof. 2 ; Compagnon 1,5 s ; Maître 4 s.

## Décisions de design (à respecter)

- Règles originales, pas un clone de go ni d'Abalone. Une règle centrale en une phrase : « ta pierre pousse tout ce qui la touche ».
- Équilibre visé « façon échecs » : léger avantage du premier joueur, pas plus. On n'équilibre pas en changeant le nombre de pierres à sortir (trop brutal), mais par le nombre de rouges.
- Le joueur humain joue Blanc par défaut ; couleur, taille (5 à 9) et nombre de rouges (0 à 8) réglables.
- Sur mobile : premier toucher = aperçu (flèches, croix sur les pierres qui sortent), second toucher = jouer.
- Direction visuelle : tissu bleu guède tissé, fils de lin, pierres en dégradé, rouge garance, typo IM Fell English + Alegreya Sans, thème sombre unique.

## Résultats de simulation (IA contre IA)

Équilibrage, % de victoires de Noir (1er joueur), ~300 ms par coup :

| Grille | 3 rouges | 4 rouges |
|---|---|---|
| 6×6 | ~60 % | 100 % |
| 7×7 | ~12 % | ~50 % |
| 8×8 | 0 % | ~4 % |

7×7 / 3 rouges Noir 4 / Blanc 3 donne ~55 %. Noir jouant 2 pierres au 1er tour : ~37 %. La densité de rouges décide de l'équilibre : une rouge d'écart fait basculer le jeu.

Compétence (7×7, 4 rouges, couleurs alternées) : prof. 2 contre 1 = 20–0 ; 4 contre 2 = 20–0 ; 4 contre 3 = 16–0 ; 6 contre 4 = 15–1. La réflexion paie à chaque niveau, sans plafond visible.

Parties : 35 à 45 coups entre IA fortes, première sortie vers le 10e coup, limite de 120 coups jamais atteinte.

## Pistes non tranchées

- Rouges « déviation » (une poussée qui bute sur une rouge tourne à 90°) ou « pivot » (faire tourner les pierres autour d'une rouge). À ne tester que si les rouges paraissent trop défensives.
- Départage des égalités (ex. : plus de pierres sur le tissu).
- Tutoriel interactif, PWA, sauvegarde de partie, mode 2 joueurs local, IA plus forte (table de transposition, killer moves).
- Nom : vérifier marques (EUIPO/USPTO classes 9 et 28), domaine et App Store.
