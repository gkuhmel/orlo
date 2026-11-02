# Orlo — contexte projet

Jeu de pierres 1v1 contre IA, web mobile en priorité (iPhone Safari). Prototype jouable, né d'un échange avec Claude le 1er novembre 2026.

## Fichiers

- `index.html` : structure des écrans (ouverture, accueil, partie, tutoriel) et des feuilles (réglages, règles). Pas de build.
- `style.css` : toute la direction visuelle de l'interface (cartes, boutons, feuilles, animations CSS du splash).
- `render.js` : rendu Canvas 2D. `OrloArt` dessine pierres et textures (aussi exportées en images CSS `--st1..3`) ; `OrloBoard` = un plateau animé (surface précalculée par taille, pierres en sprites, ombres, ondes, particules, aperçu, cibles, célébration).
- `app.js` : interface et déroulé (écrans, partie contre l'ordinateur, tutoriel en 6 leçons, réglages en `localStorage`). Expose `window.Orlo` en lecture seule (état courant) pour les tests.
- `engine.js` : règles + IA, sans dépendance. Global `Engine` dans le navigateur, `require` sous Node.
- `worker.js` : exécute `Engine.search` dans un Web Worker.
- `tools/` : simulations Node (équilibrage, test de compétence).

## Rendu et animations (render.js)

- Le canvas déborde de sa boîte carrée (`bleed`) pour que les pierres sortantes et les ombres ne soient pas coupées. `cellAt(x,y)` / `client(i,j)` convertissent pointeur ↔ croisement.
- `playMove(trace, p, color)` renvoie une promesse : chute de la pierre posée, onde, poussée en cascade (décalée selon la distance), sortie avec éclats et secousse. Si `onEject` est défini, la pierre sortie est confiée au DOM (elle vole jusqu'à la réserve du joueur qui marque) ; sinon elle tombe du plateau.
- `setPreview({p,color,trace,blocked})` : pierre fantôme, chevrons (poussée), halo et double chevron rouges (sortie), barre rouge (file bloquée par une rouge).
- Respecte `prefers-reduced-motion` (durées raccourcies, moins de particules, pas de secousse).
- La boucle `requestAnimationFrame` ne tourne que s'il y a quelque chose à animer.

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
- Sur mobile : premier toucher = aperçu (chevrons, halo rouge sur les pierres qui sortent), second toucher = jouer.
- Lisibilité des compteurs : chaque carte joueur montre ses sorties comme des pierres adverses dans 5 alvéoles (+ « n/5 ») et ses rouges restantes. Adversaire en haut, joueur en bas, comme aux échecs en ligne.
- Direction visuelle **épurée et classe, numérique assumée** : pas d'imitation de matière (ni tissu, ni bois, ni coutures, ni cuir — essais abandonnés : bleu guède jugé froid, puis artisanal jugé « faux numérique »). Fond noir chaud uni (#121110), surfaces mates, filets d'un pixel, un seul accent champagne (#d4b483), rouge #e0564a, bouton principal plein ivoire. Typo unique Manrope ; logo en capitales légères très espacées. Vocabulaire : « plateau », « bord » (plus de « tissu »).
- Plateaux (`THEMES` dans render.js, réglage « Plateau ») : sable (par défaut), ivoire, graphite (liseré clair sur les pierres noires). Surface en dégradé discret, quadrillage d'un pixel physique, points repères, ombre portée douce.
- Aucune référence à une œuvre existante (pas de personnage nommé) : l'adversaire est désigné par son niveau (« le Compagnon réfléchit… »).

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
- Départage des égalités (ex. : plus de pierres sur le plateau).
- PWA, sauvegarde de partie, mode 2 joueurs local, sons, IA plus forte (table de transposition, killer moves).
- Nom : vérifier marques (EUIPO/USPTO classes 9 et 28), domaine et App Store.
