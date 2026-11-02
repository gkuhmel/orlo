#!/usr/bin/env node
/* Équilibrage : l'IA joue contre elle-même avec les mêmes réglages des deux côtés.
   Usage : node tools/selfplay.js [taille=7] [rouges=4] [parties=20] [ms=300] [profondeurMax=12]
   Sortie : victoires de Noir (1er joueur) / Blanc, durée moyenne des parties. */
const E=require('../engine.js');
const [size=7,reds=4,games=20,ms=300,depth=12]=process.argv.slice(2).map(Number);
E.configure(size);
let w=[0,0,0,0],moves=0;
for(let g=0;g<games;g++){
  const s=E.newState(reds);
  while(!s.winner){const r=E.search(E.clone(s),{ms,maxDepth:depth});E.play(s,r.move);}
  w[s.winner]++;moves+=s.moves;
  process.stderr.write(`\rpartie ${g+1}/${games}`);
}
process.stderr.write('\n');
console.log(`${size}x${size}, ${reds} rouges : Noir ${w[1]} / Blanc ${w[2]} / nul ${w[3]} — Noir ${Math.round(100*w[1]/games)} % — ${(moves/games).toFixed(1)} coups en moyenne`);
