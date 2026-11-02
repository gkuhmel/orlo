/* Orlo — interface : écran d'ouverture, accueil, partie contre l'ordinateur, tutoriel, réglages. */
(function(){
"use strict";
var E=Engine,$=function(id){return document.getElementById(id);};
var RM=matchMedia('(prefers-reduced-motion: reduce)');
var HOVER=matchMedia('(hover:hover) and (pointer:fine)');
var LEVELS={easy:{ms:400,maxDepth:2,name:'Apprenti',the:'L’Apprenti'},mid:{ms:1500,maxDepth:12,name:'Compagnon',the:'Le Compagnon'},hard:{ms:4000,maxDepth:20,name:'Maître',the:'Le Maître'}};
function opp(){return LEVELS[cfg.level].the;}
/* % de victoires de Noir en simulation IA contre IA (voir CLAUDE.md) */
var BAL={'6:3':60,'6:4':100,'7:3':12,'7:4':50,'8:3':0,'8:4':4};
var DX=[1,-1,0,0],DY=[0,0,1,-1];
var store={get:function(k,d){try{var v=localStorage.getItem('orlo.'+k);return v==null?d:JSON.parse(v);}catch(e){return d;}},
  set:function(k,v){try{localStorage.setItem('orlo.'+k,JSON.stringify(v));}catch(e){}}};
var cfg=Object.assign({level:'mid',color:2,size:7,reds:4,theme:'sable'},store.get('settings',{}));
if(!OrloArt.THEMES[cfg.theme])cfg.theme='sable';
OrloArt.setTheme(cfg.theme);
function saveCfg(){store.set('settings',cfg);}

/* images des pierres pour le DOM, dessinées par le même code que le plateau */
var rs=document.documentElement.style;
function artVars(){[1,2,3].forEach(function(c){rs.setProperty('--st'+c,'url('+OrloArt.url(c,96)+')');});}
artVars();

function stones(c,n){var s='';for(var i=0;i<n;i++)s+='<i class="st c'+c+'"></i>';return s;}
function plural(n,w){return n+' '+w+(n>1?'s':'');}
function colorName(c){return c===1?'Noir':'Blanc';}

/* ================= écrans ================= */
var current='splash';
function go(name){
  document.querySelectorAll('.screen').forEach(function(s){s.classList.toggle('active',s.id===name);});
  current=name;closeSheets();
  if(name==='home'){updateHome();demoStart();}else demoStop();
  if(name!=='game'&&gb)gb.setPreview(null);
  if(name!=='tuto'&&tb){tb.setPreview(null);tb.setTargets([]);}
  window.scrollTo(0,0);
}

/* ================= feuilles ================= */
function openSheet(id){closeSheets();$('backdrop').classList.add('on');$(id).classList.add('on');}
function closeSheets(){$('backdrop').classList.remove('on');document.querySelectorAll('.sheet').forEach(function(s){s.classList.remove('on');});}
$('backdrop').onclick=closeSheets;
document.querySelectorAll('[data-close]').forEach(function(b){b.onclick=closeSheets;});
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeSheets();});

/* ================= entrée commune (aperçu puis jeu) ================= */
function attachInput(board,h){
  var sel=-1,box=board.box;
  box.addEventListener('pointermove',function(ev){
    if(ev.pointerType!=='mouse'||!h.can())return;
    var p=board.cellAt(ev.clientX,ev.clientY),q=p>=0&&h.valid(p)?p:-1;
    if(q!==sel){sel=q;h.preview(q);}});
  box.addEventListener('pointerleave',function(ev){if(ev.pointerType==='mouse'&&sel>=0){sel=-1;h.preview(-1);}});
  box.addEventListener('click',function(ev){
    if(!h.can())return;
    var p=board.cellAt(ev.clientX,ev.clientY);
    if(p<0||!h.valid(p)){if(p>=0&&h.invalid)h.invalid(p);sel=-1;h.preview(-1);return;}
    var mouse=ev.pointerType==='mouse'||(!ev.pointerType&&HOVER.matches);
    if(!mouse&&sel!==p){sel=p;h.preview(p);return;}
    sel=-1;h.preview(-1);h.play(p);});
  return{clear:function(){sel=-1;h.preview(-1);},get sel(){return sel;}};
}
/* files bloquées par une rouge : [{d, cells:[…], red}] */
function blockedChains(b,p,N){
  var out=[];
  for(var d=0;d<4;d++){var x=p%N+DX[d],y=(p/N|0)+DY[d],cells=[],red=-1;
    while(x>=0&&y>=0&&x<N&&y<N){var q=y*N+x;if(!b[q])break;cells.push(q);if(b[q]===3&&red<0)red=q;x+=DX[d];y+=DY[d];}
    if(red>=0&&cells.length>1)out.push({d:d,cells:cells,red:red});}
  return out;}

/* pierre sortie qui vole jusqu'à la réserve */
function fly(color,x,y,size,target){
  var r=target.getBoundingClientRect(),tx=r.left+r.width/2,ty=r.top+r.height/2;
  var f=document.createElement('i');f.className='st c'+color+' flyer';f.style.width=f.style.height=size+'px';
  document.body.appendChild(f);
  var mx=(x+tx)/2+(x<tx?-30:30),my=Math.min(y,ty)-Math.max(60,Math.abs(ty-y)*.25),s1=r.width/size,frames=[];
  for(var i=0;i<=12;i++){var t=i/12,u=1-t,bx=u*u*x+2*u*t*mx+t*t*tx,by=u*u*y+2*u*t*my+t*t*ty,sc=1+(s1-1)*t+Math.sin(Math.PI*t)*.35;
    frames.push({transform:'translate('+(bx-size/2)+'px,'+(by-size/2)+'px) scale('+sc+') rotate('+(t*220)+'deg)'});}
  if(!f.animate){f.remove();return Promise.resolve();}
  var a=f.animate(frames,{duration:RM.matches?250:760,easing:'cubic-bezier(.4,0,.25,1)',fill:'forwards'});
  return a.finished.then(function(){f.remove();},function(){f.remove();});
}

/* ================= écran d'ouverture ================= */
var splashDone=false;
function leaveSplash(){if(splashDone)return;splashDone=true;var s=$('splash');s.classList.add('out');setTimeout(function(){s.classList.remove('out');go('home');},RM.matches?0:450);}
$('splash').addEventListener('click',leaveSplash);
setTimeout(leaveSplash,3600);

/* ================= accueil + partie de démonstration ================= */
var db=new OrloBoard(document.querySelector('.demo canvas'),{n:5,bleed:.1});
var demo={s:null,timer:0,on:false};
function demoNew(){E.configure(5);demo.s=E.newState(1);
  [6,12,18,8,16].forEach(function(p,i){demo.s.b[p]=i%2?1:2;});db.reset(demo.s.b,-1);}
function demoStart(){if(demo.on)return;demo.on=true;if(!demo.s)demoNew();demoTick(900);}
function demoStop(){demo.on=false;clearTimeout(demo.timer);}
function demoTick(ms){clearTimeout(demo.timer);demo.timer=setTimeout(function(){
  if(!demo.on||document.hidden)return demoTick(1200);
  E.configure(5);var s=demo.s;
  if(s.winner||s.moves>36){demoNew();return demoTick(1400);}
  var r=E.search(E.clone(s),{ms:30,maxDepth:2}),t=E.clone(s),tr=[];E.play(t,r.move,tr);demo.s=t;
  var p=r.move>=E.REDOFF?r.move-E.REDOFF:r.move;
  db.playMove(tr,p,t.b[p]).then(function(){demoTick(t.winner?2200:1000);});
},ms);}
function updateHome(){
  var inGame=G.cur&&G.hist.length&&!G.cur.winner;
  $('hPlay').textContent=inGame?'Reprendre la partie':'Jouer';
  $('newBadge').hidden=!!store.get('tutoDone',false);
  $('summary').innerHTML='<b>'+cfg.size+'×'+cfg.size+'</b> · <b>'+plural(cfg.reds,'rouge')+'</b> · adversaire <b>'+LEVELS[cfg.level].name+'</b> · tu joues <b>'+colorName(cfg.color)+'</b>';
}
$('hPlay').onclick=function(){if(G.cur&&G.hist.length&&!G.cur.winner){go('game');resumeGame();}else{go('game');newGame();}};
$('hLearn').onclick=function(){go('tuto');loadLesson(0);};
$('hSettings').onclick=function(){openSettings('home');};

/* ================= partie ================= */
var gb=new OrloBoard(document.querySelector('#gameBox canvas'),{n:cfg.size});
var G={N:cfg.size,REDS:cfg.reds,HC:cfg.color,cur:null,hist:[],mode:'stone',busy:false,thinking:false,gid:0,shown:[0,0,0],pend:[0,0,0],flights:[]};
var worker=null;
function makeWorker(){try{var w=new Worker('worker.js');w.onmessage=function(e){onAI(e.data);};w.onerror=function(e){e.preventDefault&&e.preventDefault();worker=null;if(G.thinking)aiFallback();};return w;}catch(e){return null;}}
worker=makeWorker();
function eng(){E.configure(G.N);}
function AIc(){return 3-G.HC;}
function fr(t){return String(t).replace(/ ([:;!?])/g,'\u202f$1');}
function say(t){$('msg').textContent=fr(t);}
function hint(h){$('hint').innerHTML=fr(h||'');}
function idleHint(){hint(HOVER.matches?'Survole : aperçu. Clique : tu joues.':'Touche : aperçu. Retouche : tu joues.');}

function cardHTML(){return '<span class="pc-state"></span><div class="pc-top"><span class="avatar"><i class="st"></i></span><div class="pc-id"><span class="pc-name"></span><span class="pc-sub"></span></div>'+
  '<div class="pc-stats"><div class="pc-row" title="Pierres adverses sorties"><span class="tray"></span><span class="num ncap"></span></div>'+
  '<div class="pc-row" title="Pierres rouges restantes"><span class="pouch"></span><span class="num red nred"></span></div></div></div>';}
$('cardAI').innerHTML=cardHTML();$('cardMe').innerHTML=cardHTML();

function renderCard(card,player,isMe,popIdx){
  var opp=3-player,s=G.cur,q=function(sel){return card.querySelector(sel);};
  q('.avatar .st').className='st c'+player;
  q('.pc-name').textContent=isMe?'Toi':LEVELS[cfg.level].name;
  q('.pc-sub').textContent=isMe?colorName(player)+(player===1?' · joue en premier':' · joue en second'):'Ordinateur · '+colorName(player);
  var got=Math.min(E.TARGET,G.shown[opp]),h='';
  for(var i=0;i<E.TARGET;i++)h+='<span class="hole'+(i===popIdx?' pop':'')+'">'+(i<got?'<i class="st c'+opp+'"></i>':'')+'</span>';
  q('.tray').innerHTML=h;
  q('.ncap').innerHTML=got+'<small>/'+E.TARGET+'</small>';
  var match=!s.winner&&got===E.TARGET-1;
  card.classList.toggle('match',match);
  var sub=q('.pc-sub');sub.classList.toggle('hot',match);
  if(match)sub.textContent='Plus qu’une sortie !';
  var left=s.reds[player];
  q('.pouch').innerHTML=G.REDS?Array.from({length:G.REDS},function(_,k){return '<i class="st c3'+(k>=left?' used':'')+'"></i>';}).join(''):'<span class="none">—</span>';
  q('.nred').textContent=G.REDS?left:'';
  var turn=!s.winner&&s.toPlay===player,st=q('.pc-state');
  card.classList.toggle('turn',turn);
  card.classList.toggle('thinking',!isMe&&G.thinking);
  if(s.winner===player){st.className='pc-state on win';st.textContent='Gagne';}
  else if(turn&&isMe&&!G.busy){st.className='pc-state on go';st.textContent='À toi';}
  else if(!isMe&&G.thinking){st.className='pc-state on think';st.innerHTML='Réfléchit<i></i><i></i><i></i>';}
  else{st.className='pc-state';st.textContent='';}
}
function renderHUD(pop){
  pop=pop||{};
  renderCard($('cardAI'),AIc(),false,pop[AIc()]);
  renderCard($('cardMe'),G.HC,true,pop[G.HC]);
  var s=G.cur,over=!!s.winner,mine=!over&&s.toPlay===G.HC&&!G.busy&&!G.thinking;
  $('modeStoneIc').className='st c'+G.HC;
  $('modeStone').disabled=!mine;
  $('modeRed').disabled=!mine||s.reds[G.HC]<=0;
  $('redLeft').textContent=s.reds[G.HC];
  if(s.reds[G.HC]<=0&&G.mode==='red')setMode('stone');
  $('undo').disabled=G.busy||G.thinking||!G.hist.some(function(h){return h.toPlay===G.HC;});
  $('gameBox').classList.toggle('wait',G.thinking);
}
function setMode(m){G.mode=m;$('modeStone').setAttribute('aria-pressed',m==='stone');$('modeRed').setAttribute('aria-pressed',m==='red');
  if(gin&&gin.sel>=0)gPreview(gin.sel);}
$('modeStone').onclick=function(){setMode('stone');};
$('modeRed').onclick=function(){setMode(G.mode==='red'?'stone':'red');};

/* trajectoire des pierres sorties vers la bonne réserve */
gb.onEject=function(color,x,y,size){
  var owner=3-color,card=owner===G.HC?$('cardMe'):$('cardAI'),idx=Math.min(E.TARGET-1,G.shown[color]+G.pend[color]);
  G.pend[color]++;
  var hole=card.querySelectorAll('.hole')[idx]||card.querySelector('.tray'),gid=G.gid;
  var pr=fly(color,x,y,size,hole).then(function(){if(gid!==G.gid)return;G.pend[color]--;G.shown[color]++;var pop={};pop[owner]=G.shown[color]-1;renderHUD(pop);});
  G.flights.push(pr);
};

function canPlay(){return current==='game'&&!G.busy&&!G.thinking&&G.cur&&!G.cur.winner&&G.cur.toPlay===G.HC;}
function gPreview(p){
  if(p<0){gb.setPreview(null);if(canPlay())idleHint();return;}
  eng();var red=G.mode==='red',m=red?p+E.REDOFF:p,t=E.clone(G.cur),tr=[];
  if(!E.play(t,m,tr)){gb.setPreview(null);return;}
  var bl=red?[]:blockedChains(G.cur.b,p,G.N);
  gb.setPreview({p:p,color:red?3:G.HC,trace:tr,blocked:bl});
  var out=tr.filter(function(x){return x[1]<0;}),mine=out.filter(function(x){return G.cur.b[x[0]]===G.HC;}).length,theirs=out.length-mine,parts=[];
  if(red)parts.push('<i class="st c3"></i> Rouge : elle bloquera toute file');
  else{
    if(theirs)parts.push('<span class="good">Sort '+stones(AIc(),theirs)+'</span>');
    if(mine)parts.push('<span class="warn">perd '+stones(G.HC,mine)+'</span>');
    if(!out.length)parts.push(tr.length?'Pousse '+plural(tr.length,'pierre'):'Aucune poussée');
    if(bl.length)parts.push('<span class="warn">bloqué par une rouge</span>');}
  hint(parts.join(' · ')+'<br><span class="tap">'+(HOVER.matches?'clique pour jouer':'touche encore pour jouer')+'</span>');
}
var gin=attachInput(gb,{can:canPlay,valid:function(p){return !G.cur.b[p];},preview:gPreview,play:function(p){humanPlay(p);}});

function animate(trace,p,color,blocked){
  G.flights=[];
  var a=gb.playMove(trace,p,color);
  if(blocked&&blocked.length)gb.flashBlocked(blocked);
  return a.then(function(){return Promise.all(G.flights);});
}
function humanPlay(p){
  eng();var red=G.mode==='red',m=red?p+E.REDOFF:p,t=E.clone(G.cur),tr=[];
  var bl=red?[]:blockedChains(G.cur.b,p,G.N);
  if(!E.play(t,m,tr))return;
  G.hist.push(G.cur);G.cur=t;G.busy=true;var gid=G.gid;
  hint('');renderHUD();
  animate(tr,p,t.b[p],bl).then(function(){if(gid!==G.gid)return;G.busy=false;if(red)setMode('stone');next();});
}
function next(){
  syncShown();renderHUD();
  if(G.cur.winner)return endGame();
  if(G.cur.toPlay!==G.HC)return aiTurn();
  idleHint();
}
function syncShown(){G.shown=G.cur.lost.slice();G.pend=[0,0,0];}

function aiTurn(){
  G.thinking=true;renderHUD();say(opp()+' réfléchit…');hint('');
  var opts=LEVELS[cfg.level],gid=G.gid,s=G.cur;G.aiT0=performance.now();
  var st={b:Array.from(s.b),toPlay:s.toPlay,reds:s.reds.slice(),lost:s.lost.slice(),moves:s.moves,winner:s.winner,last:s.last};
  if(worker)worker.postMessage({state:st,opts:{ms:opts.ms,maxDepth:opts.maxDepth},gid:gid,n:G.N});
  else aiFallback();
}
function aiFallback(){var gid=G.gid,opts=LEVELS[cfg.level];
  setTimeout(function(){if(gid!==G.gid)return;eng();var r=E.search(E.clone(G.cur),{ms:Math.min(opts.ms,1200),maxDepth:opts.maxDepth});r.gid=gid;onAI(r);},40);}
function onAI(r){
  if(!G.thinking||r.gid!==G.gid)return;
  var wait=Math.max(0,550-(performance.now()-G.aiT0));
  setTimeout(function(){
    if(!G.thinking||r.gid!==G.gid)return;
    G.thinking=false;G.busy=true;eng();
    var before=G.cur.lost.slice(),t=E.clone(G.cur),tr=[],m=r.move,p=m>=E.REDOFF?m-E.REDOFF:m;
    var bl=m>=E.REDOFF?[]:blockedChains(G.cur.b,p,G.N);
    E.play(t,m,tr);G.hist.push(G.cur);G.cur=t;renderHUD();
    var outMe=t.lost[G.HC]-before[G.HC],outAI=t.lost[AIc()]-before[AIc()],line;
    line=m>=E.REDOFF?opp()+' pose une pierre rouge.':opp()+' a joué.';
    if(outMe)line=opp()+(outMe>1?' sort '+outMe+' de tes pierres.':' sort une de tes pierres.');
    if(outAI)line+=outAI>1?' Il en perd '+outAI+' au passage.':' Il en perd une au passage.';
    if(!t.winner){if(r.score>50000)line+=' Il voit sa victoire venir.';else if(r.score<-50000)line+=' Il semble inquiet.';}
    say(line);
    var gid=G.gid;
    animate(tr,p,t.b[p],bl).then(function(){if(gid!==G.gid)return;G.busy=false;next();});
  },wait);
}

function endGame(){
  var w=G.cur.winner,HC=G.HC,AI=AIc(),card=$('endCard');
  say(w===HC?'Tu gagnes !':w===3?'Égalité parfaite.':opp()+' gagne cette fois.');
  hint('<button class="linkbtn" id="hAgain">Rejouer</button> · <button class="linkbtn" id="hRes">Voir le résultat</button>');
  $('hAgain').onclick=newGame;$('hRes').onclick=function(){card.hidden=false;};
  gb.celebrate(w===3?0:w);
  $('endTitle').textContent=w===HC?'Victoire':w===3?'Égalité':'Défaite';
  card.classList.toggle('lose',w!==HC&&w!==3);
  $('endScore').innerHTML='<i class="st c'+HC+'"></i>'+G.cur.lost[AI]+'<small>contre</small>'+G.cur.lost[HC]+'<i class="st c'+AI+'"></i>';
  $('endLine').textContent=fr(w===HC?'Belle partie, bien poussée.':w===3?'Personne n’a cédé un pouce.':'Revanche ?');
  setTimeout(function(){if(G.cur.winner&&current==='game')card.hidden=false;},RM.matches?200:1300);
}
$('eAgain').onclick=function(){newGame();};
$('eView').onclick=function(){$('endCard').hidden=true;};

function newGame(){
  G.gid++;if(G.thinking&&worker){worker.terminate();worker=makeWorker();}
  G.N=cfg.size;G.REDS=cfg.reds;G.HC=+cfg.color;G.thinking=false;G.busy=false;
  eng();G.cur=E.newState(G.REDS);G.hist=[];syncShown();
  gb.setN(G.N);gb.reset(G.cur.b,-1);$('endCard').hidden=true;setMode('stone');if(gin)gin.clear();
  $('gameBox').querySelector('canvas').setAttribute('aria-label','Plateau de '+G.N+' sur '+G.N);
  say(G.HC===1?'Nouvelle partie. À toi de commencer.':'Nouvelle partie. '+opp()+' commence.');
  next();
}
function resumeGame(){gb.resize();renderHUD();if(!G.thinking&&!G.busy&&G.cur.toPlay===G.HC)idleHint();}
$('undo').onclick=function(){
  if(G.busy||G.thinking||!G.hist.length)return;
  var h=G.hist.pop();while(h.toPlay!==G.HC&&G.hist.length)h=G.hist.pop();
  if(h.toPlay!==G.HC)return;
  G.cur=h;syncShown();gin.clear();$('endCard').hidden=true;
  var l=h.last;gb.reset(h.b,l<0?-1:l>=E.REDOFF?l-E.REDOFF:l);
  renderHUD();say('Coup annulé. À toi.');idleHint();};
$('gHome').onclick=function(){go('home');};
$('gRules').onclick=function(){openSheet('rulesSheet');};
$('gSettings').onclick=function(){openSettings('game');};
$('rTuto').onclick=function(){go('tuto');loadLesson(0);};

/* ================= réglages ================= */
var setFrom='home';
function opts(id,list,key,num){
  var box=$(id);box.innerHTML='';
  list.forEach(function(o){var b=document.createElement('button');b.className='opt';b.innerHTML=o[1];
    b.setAttribute('aria-pressed',String(cfg[key])===String(o[0]));
    b.onclick=function(){cfg[key]=num?+o[0]:o[0];saveCfg();if(key==='theme')applyTheme();renderSettings();if(current==='home')updateHome();if(current==='game')renderHUD();};
    box.appendChild(b);});}
function renderSettings(){
  opts('sLevel',[['easy','Apprenti'],['mid','Compagnon'],['hard','Maître']],'level');
  opts('sColor',[[2,'<i class="st c2"></i>Blanc <small>· 2e</small>'],[1,'<i class="st c1"></i>Noir <small>· 1er</small>']],'color',true);
  opts('sSize',[5,6,7,8,9].map(function(n){return[n,n+'×'+n];}),'size',true);
  opts('sReds',[0,1,2,3,4,5,6,7,8].map(function(n){return[n,String(n)];}),'reds',true);
  opts('sTheme',[['sable','<i class="sw sw-sable"></i>Sable'],['ivoire','<i class="sw sw-ivoire"></i>Ivoire'],['graphite','<i class="sw sw-graphite"></i>Graphite']],'theme');
  var b=BAL[cfg.size+':'+cfg.reds],box=$('sBal');
  if(b==null){box.innerHTML='<p class="bal-txt" style="margin:0">Combinaison pas encore testée en simulation. Équilibrées : <b>7×7 · 4 rouges</b> ou <b>6×6 · 3 rouges</b>.</p>';}
  else{var verdict=b>=40&&b<=62?'<b>équilibré</b>':b>62?'Noir (1er) <b>très avantagé</b>':'Blanc (2e) <b>très avantagé</b>';
    box.innerHTML='<div style="flex:1"><p class="bal-txt">Équilibre mesuré\u202f: '+verdict+' · Noir gagne ~'+b+' %</p><div style="display:flex;align-items:center;gap:8px"><i class="st c1"></i><div class="bal-bar"><i style="left:'+(100-b)+'%"></i></div><i class="st c2"></i></div></div>';}
  var differs=G.cur&&G.hist.length&&!G.cur.winner&&(cfg.size!==G.N||cfg.reds!==G.REDS||+cfg.color!==G.HC);
  $('sNote').textContent=differs?'Taille, couleur et rouges s’appliqueront à la prochaine partie. Le niveau change tout de suite.':'';
  $('sNote').className='note'+(differs?' warn':'');
  $('sApply').textContent=setFrom==='game'?'Nouvelle partie':'Jouer';
}
function applyTheme(){OrloArt.setTheme(cfg.theme);artVars();[db,gb,tb].forEach(function(b){b.rebuild();});}
function openSettings(from){setFrom=from;renderSettings();openSheet('setSheet');}
$('sApply').onclick=function(){closeSheets();if(current!=='game')go('game');newGame();};

/* ================= tutoriel ================= */
var tb=new OrloBoard(document.querySelector('#tuto canvas'),{n:5});
var LESSONS=[
  {t:'Poser une pierre',x:'Pose ta pierre blanche sur le cercle, juste à gauche de la noire.<br><em>Premier toucher : l’aperçu. Second toucher : tu joues.</em>',
   cells:{12:1},target:[11],ok:'Ta pierre a poussé la noire d’un cran. C’est toute la règle : <b>ta pierre pousse tout ce qui la touche.</b>'},
  {t:'Dans les quatre directions',x:'Pose ta pierre au centre de la croix. Regarde l’aperçu : les flèches montrent qui bouge.',
   cells:{7:1,11:1,13:1,17:1},target:[12],ok:'Les quatre reculent d’un seul coup : la poussée part dans les quatre directions à la fois.'},
  {t:'Le bord du plateau',x:'Une pierre poussée hors du plateau est <b>sortie</b>. Pousse la noire par-dessus le bord.',
   cells:{14:1},target:[13],ok:'Sortie ! Elle rejoint ta réserve, en bas. Sors-en <b>5</b> pour gagner.'},
  {t:'Les files',x:'Des pierres collées forment une file, poussée en entier quelle que soit la couleur. Pousse celle-ci.',
   cells:{12:1,13:2,14:1},target:[11],ok:'Toute la file avance et la noire du bout tombe. Attention : tes propres pierres peuvent tomber aussi, et elles comptent pour l’adversaire.'},
  {t:'Les pierres rouges',x:'Noir menace de jouer sur le cercle et de pousser tes deux pierres dehors. Pose une <b class="r">pierre rouge</b> à cet endroit.',
   cells:{13:2,14:2},reds:1,mode:'red',target:[12],reply:11,ok:'Noir pousse contre la rouge… et rien ne bouge. Une rouge ne bouge jamais et bloque toute la file. Mais la poser te coûte ton tour.'},
  {t:'À toi de trouver',x:'Il te manque deux sorties pour gagner. Trouve le coup qui sort <b>deux</b> pierres noires d’un seul geste.',
   cells:{10:1,11:1,13:1,14:1,6:2,18:2,3:1},lost:3,free:true,solution:12,ok:'Victoire ! Tu sais jouer. Dernier conseil : surveille les bords, tout s’y décide.'}
];
var T={i:0,s:null,done:false,busy:false,fails:0,shown:0,targets:[],flights:[]};
function tState(){E.configure(5);}
function loadLesson(i){
  T.i=i;var L=LESSONS[i];tState();
  var s=E.newState(0);s.reds=[0,0,L.reds||0];s.toPlay=2;s.lost=[0,L.lost||0,0];
  for(var k in L.cells)s.b[+k]=L.cells[k];
  T.s=s;T.done=false;T.busy=false;T.shown=s.lost[1];T.targets=L.target||[];
  if(L.free&&T.fails>=2)T.targets=[L.solution];
  tb.setN(5);tb.reset(s.b,-1);tb.setTargets(T.targets);tin.clear();
  $('lStep').textContent='Leçon '+(i+1)+' sur '+LESSONS.length;
  $('lTitle').innerHTML=fr(L.t);$('lText').innerHTML=fr(L.x);
  var les=$('lesson');les.classList.remove('ok','fresh');void les.offsetWidth;les.classList.add('fresh');
  $('tNext').disabled=true;$('tNext').textContent=i===LESSONS.length-1?'Jouer !':'Suivant';
  $('tMode').className='chip-mode'+(L.mode==='red'?' red':'');
  $('tMode').innerHTML=L.mode==='red'?'<i class="st c3"></i>Pierre rouge':'<i class="st c2"></i>Pierre blanche';
  $('tDots').innerHTML=LESSONS.map(function(_,k){return '<i class="'+(k<i?'done':k===i?'cur':'')+'"></i>';}).join('');
  tTray();
}
function tTray(pop){var h='';for(var i=0;i<E.TARGET;i++)h+='<span class="hole'+(i===pop?' pop':'')+'">'+(i<T.shown?'<i class="st c1"></i>':'')+'</span>';
  $('tTray').innerHTML=h;$('tNum').innerHTML=T.shown+'<small>/'+E.TARGET+'</small>';}
function tCan(){return current==='tuto'&&!T.busy&&!T.done;}
function tValid(p){return !T.s.b[p]&&(!T.targets.length||T.targets.indexOf(p)>=0);}
function tPreview(p){
  if(p<0){tb.setPreview(null);return;}
  tState();var L=LESSONS[T.i],red=L.mode==='red',t=E.clone(T.s),tr=[];
  if(!E.play(t,red?p+E.REDOFF:p,tr))return;
  tb.setPreview({p:p,color:red?3:2,trace:tr,blocked:red?[]:blockedChains(T.s.b,p,5)});
}
function tNudge(){var l=$('lesson');l.classList.remove('nudge');void l.offsetWidth;l.classList.add('nudge');}
var tin=attachInput(tb,{can:tCan,valid:tValid,preview:tPreview,invalid:function(p){if(!T.s.b[p])tNudge();},play:function(p){tPlay(p);}});
tb.onEject=function(color,x,y,size){
  var idx=Math.min(E.TARGET-1,T.shown),hole=$('tTray').querySelectorAll('.hole')[idx];
  T.flights.push(fly(color,x,y,size,hole).then(function(){if(color===1){T.shown++;tTray(T.shown-1);}}));
};
function tPlay(p){
  tState();var L=LESSONS[T.i],red=L.mode==='red',t=E.clone(T.s),tr=[],i0=T.i;
  if(!E.play(t,red?p+E.REDOFF:p,tr))return;
  T.s=t;T.busy=true;T.flights=[];tb.setTargets([]);
  tb.playMove(tr,p,t.b[p]).then(function(){return Promise.all(T.flights);}).then(function(){
    if(T.i!==i0||current!=='tuto')return;
    if(L.reply!=null){
      return tb.wait(450).then(function(){tState();var t2=E.clone(T.s),tr2=[],bl=blockedChains(T.s.b,L.reply,5);E.play(t2,L.reply,tr2);T.s=t2;
        var a=tb.playMove(tr2,L.reply,1);tb.flashBlocked(bl);return a;}).then(function(){return tb.wait(250);}).then(function(){success(i0);});
    }
    if(L.free&&!T.s.winner){T.fails++;
      $('lText').innerHTML=fr(T.fails>=2?'Presque. Regarde le cercle : il est entre les deux paires.':'Pas tout à fait : ce coup n’en sort pas deux. On recommence.');
      tNudge();return tb.wait(1500).then(function(){if(T.i===i0&&current==='tuto')loadLesson(i0);});}
    success(i0);
  });
}
function success(i0){
  if(T.i!==i0)return;
  var L=LESSONS[T.i];T.done=true;T.busy=false;
  $('lText').innerHTML=fr(L.ok);var les=$('lesson');les.classList.add('ok');les.classList.remove('fresh');void les.offsetWidth;les.classList.add('fresh');
  $('lStep').textContent='Leçon '+(T.i+1)+' · réussie';
  $('tNext').disabled=false;
  if(T.i===LESSONS.length-1){tb.celebrate(2);store.set('tutoDone',true);T.fails=0;}
}
$('tNext').onclick=function(){if(T.i<LESSONS.length-1)loadLesson(T.i+1);else{go('game');newGame();}};
$('tRetry').onclick=function(){loadLesson(T.i);};
$('tBack').onclick=function(){go('home');};

/* ================= départ ================= */
window.Orlo={get state(){return G.cur;},get N(){return G.N;},get color(){return G.HC;}};
eng();G.cur=E.newState(G.REDS);syncShown();renderHUD();
document.addEventListener('visibilitychange',function(){if(!document.hidden&&current==='home')demoTick(600);});
})();
