#!/usr/bin/env node
/* Test de compétence : une IA qui calcule plus loin (A) contre une qui calcule moins loin (B).
   Les couleurs alternent à chaque partie pour neutraliser l'avantage du trait.
   Usage : node tools/ladder.js profA profB [parties=16] [taille=7] [rouges=4] [ms=5000] */
const E=require('../engine.js');
const [dA=4,dB=2,games=16,size=7,reds=4,ms=5000]=process.argv.slice(2).map(Number);
E.configure(size);
let a=0,b=0,d=0,moves=0;
for(let g=0;g<games;g++){
  const aCol=g%2?1:2,s=E.newState(reds);
  while(!s.winner){const isA=s.toPlay===aCol;
    const r=E.search(E.clone(s),{ms,maxDepth:isA?dA:dB});E.play(s,r.move);}
  if(s.winner===3)d++;else if(s.winner===aCol)a++;else b++;moves+=s.moves;
  process.stderr.write(`\rpartie ${g+1}/${games}`);
}
process.stderr.write('\n');
console.log(`profondeur ${dA} contre ${dB} (${size}x${size}, ${reds} rouges) : ${a} – ${b} (nuls ${d}) — ${(moves/games).toFixed(1)} coups en moyenne`);
