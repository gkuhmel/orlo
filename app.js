/* Orlo — interface : écran d'ouverture, accueil, partie contre l'ordinateur, tutoriel, réglages. */
(function(){
"use strict";
var E=Engine,$=function(id){return document.getElementById(id);};
var RM=matchMedia('(prefers-reduced-motion: reduce)');
var HOVER=matchMedia('(hover:hover) and (pointer:fine)');
/* Appareil tactile (iPhone, iPad sans souris…) : toujours deux touchers, quel que soit le pointerType annoncé. */
function touchMode(ev){return !HOVER.matches||ev.pointerType==='touch'||ev.pointerType==='pen';}
var VERSION='8';
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
/* Entrée : souris = survol (aperçu) + clic (jouer).
   Doigt = toucher (aperçu), glisser (l'aperçu suit), retoucher la même intersection (jouer).
   On se fie au type de pointerdown : sur iPhone Safari, l'événement click se déclare « mouse » même au doigt. */
function attachInput(board,h){
  var sel=-1,box=board.box,down=null;
  function setSel(q,armed){sel=q;h.preview(q,armed);}
  box.addEventListener('pointermove',function(ev){
    if(!h.can())return;
    var p=board.cellAt(ev.clientX,ev.clientY),q=p>=0&&h.valid(p)?p:-1;
    if(!touchMode(ev)){if(q!==sel)setSel(q,false);return;}
    if(!down||down.id!==ev.pointerId)return;
    if(Math.hypot(ev.clientX-down.x,ev.clientY-down.y)>8)down.moved=true;
    if(q>=0&&q!==sel){setSel(q,true);down.moved=true;}
  });
  box.addEventListener('pointerleave',function(ev){if(!touchMode(ev)&&sel>=0)setSel(-1);});
  box.addEventListener('pointerdown',function(ev){
    if(!h.can())return;
    var p=board.cellAt(ev.clientX,ev.clientY);
    if(!touchMode(ev)){
      if(ev.button!==0)return;
      if(p<0||!h.valid(p)){if(p>=0&&h.invalid)h.invalid(p);return;}
      setSel(-1);h.play(p);return;}
    ev.preventDefault();
    try{box.setPointerCapture(ev.pointerId);}catch(e){}
    var valid=p>=0&&h.valid(p);
    down={id:ev.pointerId,x:ev.clientX,y:ev.clientY,moved:false,confirm:valid&&p===sel};
    if(valid&&p!==sel)setSel(p,true);
    else if(!valid){if(p>=0&&h.invalid)h.invalid(p);setSel(-1);}
  });
  box.addEventListener('pointerup',function(ev){
    if(!down||down.id!==ev.pointerId)return;
    var d=down;down=null;
    if(!h.can())return;
    if(d.confirm&&!d.moved&&sel>=0){var p=sel;setSel(-1);h.play(p);}
  });
  box.addEventListener('pointercancel',function(){down=null;});
  return{clear:function(){down=null;setSel(-1);},get sel(){return sel;}};
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
  $('summary').innerHTML='<b>'+cfg.size+'×'+cfg.size+'</b> · <b>'+plural(cfg.reds,'rouge')+'</b> · adversaire <b>'+LEVELS[cfg.level].name+'</b> · tu joues <b>'+colorName(cfg.color)+'</b>'+'<span class="ver">v'+VERSION+'</span>';
}
$('hPlay').onclick=function(){if(G.cur&&G.hist.length&&!G.cur.winner){go('game');resumeGame();}else{go('game');newGame();}};
$('hLearn').onclick=function(){go('tuto');loadLesson(0);};
$('hSettings').onclick=function(){openSettings('home');};

/* ================= partie ================= */
var gb=new OrloBoard(document.querySelector('#gameBox canvas'),{n:cfg.size});
var G={N:cfg.size,REDS:cfg.reds,HC:cfg.color,cur:null,hist:[],mode:'stone',busy:false,thinking:false,gid:0,shown:[0,0,0],pend:[0,0,0],flights:[]};
var worker=null;
function makeWorker(){try{var w=new Worker('worker.js?v='+VERSION);w.onmessage=function(e){onAI(e.data);};w.onerror=function(e){e.preventDefault&&e.preventDefault();worker=null;if(G.thinking)aiFallback();};return w;}catch(e){return null;}}
worker=makeWorker();
function eng(){E.configure(G.N);}
function AIc(){return 3-G.HC;}
function fr(t){return String(t).replace(/ ([:;!?])/g,'\u202f$1');}
function say(t){$('msg').textContent=fr(t);}
function hint(h){$('hint').innerHTML=fr(h||'');}
function idleHint(){if(G.mode==='red'){hint('<i class="st c3"></i> Pierre rouge : choisis où la poser.');return;}hint(HOVER.matches?'Survole : aperçu. Clique : tu joues.':'Touche : aperçu. Retouche : tu joues.');}

function cardHTML(){return '<span class="avatar"><i class="st"></i></span><span class="pc-who"><span class="pc-line"><span class="pc-name"></span><span class="pc-state"></span></span><span class="pc-sub"></span></span>'+
  '<span class="pc-stats"><span class="tray" title="Pierres adverses sorties"></span><span class="num ncap"></span></span>'+
  '<span class="pc-red" title="Pierres rouges restantes"><i class="st c3"></i><span class="nred"></span></span>';}
$('cardAI').innerHTML=cardHTML();$('cardMe').innerHTML=cardHTML();

function renderCard(card,player,isMe,popIdx){
  var opp=3-player,s=G.cur,q=function(sel){return card.querySelector(sel);};
  q('.avatar .st').className='st c'+player;
  q('.pc-name').textContent=isMe?'Toi':LEVELS[cfg.level].name;
  q('.pc-sub').textContent=isMe?colorName(player)+(player===1?' · 1er':' · 2e'):'Ordinateur · '+colorName(player);
  var got=Math.min(E.TARGET,G.shown[opp]),h='';
  for(var i=0;i<E.TARGET;i++)h+='<span class="hole'+(i===popIdx?' pop':'')+'">'+(i<got?'<i class="st c'+opp+'"></i>':'')+'</span>';
  q('.tray').innerHTML=h;
  q('.ncap').innerHTML=got+'<small>/'+E.TARGET+'</small>';
  card.classList.toggle('match',!s.winner&&got===E.TARGET-1);
  q('.nred').textContent=s.reds[player];
  card.classList.toggle('nored',!G.REDS);
  var turn=!s.winner&&s.toPlay===player,st=q('.pc-state');
  card.classList.toggle('turn',turn&&!(isMe&&G.busy));
  card.classList.toggle('thinking',!isMe&&G.thinking);
  if(s.winner===player){st.className='pc-state win';st.textContent='gagne';}
  else if(!isMe&&G.thinking){st.className='pc-state think';st.innerHTML='<i></i><i></i><i></i>';}
  else{st.className='pc-state';st.textContent='';}
}
function renderHUD(pop){
  pop=pop||{};
  renderCard($('cardAI'),AIc(),false,pop[AIc()]);
  renderCard($('cardMe'),G.HC,true,pop[G.HC]);
  var s=G.cur,over=!!s.winner,mine=!over&&s.toPlay===G.HC&&!G.busy&&!G.thinking;
  $('modeRed').disabled=!mine||s.reds[G.HC]<=0;
  $('modeRed').hidden=!G.REDS;
  $('redLeft').textContent=s.reds[G.HC];
  if(s.reds[G.HC]<=0&&G.mode==='red')setMode('stone');
  $('undo').disabled=G.busy||G.thinking||!G.hist.some(function(h){return h.toPlay===G.HC;});
  $('gameBox').classList.toggle('wait',G.thinking);
}
function setMode(m){G.mode=m;$('modeRed').setAttribute('aria-pressed',m==='red');
  if(gin&&gin.sel>=0)gPreview(gin.sel,!HOVER.matches);
  else if(canPlay())idleHint();}
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
function gPreview(p,armed){
  if(p<0){gb.setPreview(null);if(canPlay())idleHint();return;}
  eng();var red=G.mode==='red',m=red?p+E.REDOFF:p,t=E.clone(G.cur),tr=[];
  if(!E.play(t,m,tr)){gb.setPreview(null);return;}
  var bl=red?[]:blockedChains(G.cur.b,p,G.N);
  gb.setPreview({p:p,color:red?3:G.HC,trace:tr,blocked:bl,armed:!!armed});
  var out=tr.filter(function(x){return x[1]<0;}),mine=out.filter(function(x){return G.cur.b[x[0]]===G.HC;}).length,theirs=out.length-mine,parts=[];
  if(red)parts.push('<i class="st c3"></i> Rouge : elle bloquera toute file');
  else{
    if(theirs)parts.push('<span class="good">Sort '+stones(AIc(),theirs)+'</span>');
    if(mine)parts.push('<span class="warn">perd '+stones(G.HC,mine)+'</span>');
    if(!out.length)parts.push(tr.length?'Pousse '+plural(tr.length,'pierre'):'Aucune poussée');
    if(bl.length)parts.push('<span class="warn">bloqué par une rouge</span>');}
  hint(parts.join(' · ')+'<br><span class="tap">'+(armed?'retouche pour jouer':'clique pour jouer')+'</span>');
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
  hint('<button class="linkbtn" id="hAgain">Rejouer</button> · <button class="linkbtn" id="hAna">Analyser la partie</button>');
  $('hAgain').onclick=newGame;$('hAna').onclick=startAnalysis;
  gb.celebrate(w===3?0:w);
  $('endTitle').textContent=w===HC?'Victoire':w===3?'Égalité':'Défaite';
  card.classList.toggle('lose',w!==HC&&w!==3);
  $('endScore').innerHTML='<i class="st c'+HC+'"></i>'+G.cur.lost[AI]+'<small>contre</small>'+G.cur.lost[HC]+'<i class="st c'+AI+'"></i>';
  $('endLine').textContent=fr(w===HC?'Belle partie, bien poussée.':w===3?'Personne n’a cédé un pouce.':'Revanche ?');
  setTimeout(function(){if(G.cur.winner&&current==='game')card.hidden=false;},RM.matches?200:1300);
}
$('eAgain').onclick=function(){newGame();};
$('eAna').onclick=startAnalysis;

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
$('sRules').onclick=function(){openSheet('rulesSheet');};
$('gSettings').onclick=function(){openSettings('game');};
$('rTuto').onclick=function(){go('tuto');loadLesson(0);};

/* ================= analyse de partie ================= */
var ab=new OrloBoard(document.querySelector('#anaBox canvas'),{n:7});
var CLS={best:{t:'Meilleur coup',s:'★',c:'#d4b483'},good:{t:'Bon coup',s:'✓',c:'#9fb08f'},inacc:{t:'Imprécision',s:'?!',c:'#e2c15a'},
  mistake:{t:'Erreur',s:'?',c:'#ec9550'},blunder:{t:'Gaffe',s:'??',c:'#e0564a'}};
var CLS_ORDER=['best','good','inacc','mistake','blunder'];
var A=null,anaWorker=null,anaGid=0;
function capS(v){return Math.max(-6000,Math.min(6000,v));}
function classify(L){return L<=15?'best':L<120?'good':L<400?'inacc':L<1500?'mistake':'blunder';}
function noteOf(N,m){var p=m>=E.REDOFF?m-E.REDOFF:m;return 'ABCDEFGHI'[p%N]+(N-((p/N)|0));}
function stoneTxt(v){var x=Math.round(v/100)/10;return (x>0?'+':x<0?'−':'')+Math.abs(x).toFixed(1).replace('.',',');}
function ser(st){return{b:Array.from(st.b),toPlay:st.toPlay,reds:st.reds.slice(),lost:st.lost.slice(),moves:st.moves,winner:st.winner,last:st.last};}
function outs(st,m,color){E.configure(A.N);var t=E.clone(st),tr=[];if(!E.play(t,m,tr))return 0;
  return tr.filter(function(x){return x[1]<0&&st.b[x[0]]===color;}).length;}

function startAnalysis(){
  var P=G.hist.concat([G.cur]);if(P.length<2)return;
  anaGid++;if(anaWorker){anaWorker.terminate();anaWorker=null;}
  A={P:P,N:G.N,HC:G.HC,who:LEVELS[cfg.level].name,res:new Array(P.length-1),done:0,k:P.length-1,showBest:false,gid:anaGid};
  go('ana');ab.setN(A.N);anaShow(A.k,false);
  $('aProg').hidden=false;anaRun(0);
}
function anaRun(i){
  if(!A||A.gid!==anaGid)return;
  if(i>=A.P.length-1){$('aProg').hidden=true;anaRender();return;}
  var st=A.P[i],played=A.P[i+1].last,gid=A.gid;
  var done=function(a){if(!A||A.gid!==gid)return;A.res[i]=a;A.done=i+1;anaRender();anaRun(i+1);};
  if(!anaWorker){try{anaWorker=new Worker('worker.js?v='+VERSION);}catch(e){anaWorker=null;}}
  if(anaWorker){anaWorker.onmessage=function(e){if(e.data.type==='analyze'&&e.data.gid===gid&&e.data.id===i)done(e.data);};
    anaWorker.postMessage({type:'analyze',state:ser(st),played:played,depth:4,n:A.N,id:i,gid:gid});}
  else setTimeout(function(){E.configure(A.N);var a=E.analyze(E.clone(st),played,{depth:3});done(a);},10);
}
/* infos dérivées d'un coup i (de P[i] à P[i+1]) */
function anaMove(i){
  var r=A.res[i];if(!r)return null;
  var st=A.P[i],m=A.P[i+1].last,mover=st.toPlay,me=mover===A.HC;
  var L=Math.max(0,capS(r.bestScore)-capS(r.playedScore)),cls=classify(L);
  var sgn=me?1:-1;
  return{i:i,m:m,mover:mover,me:me,L:L,cls:cls,best:r.best,
    before:sgn*capS(r.bestScore),after:sgn*capS(r.playedScore),
    acc:100*Math.exp(-L/900),gain:outs(st,m,3-mover),selfOut:outs(st,m,mover)};
}
function anaExplain(x){
  var who=x.me?'Tu':'Il',poss=x.me?'tes':'ses',N=A.N,t=[];
  if(x.cls==='best'||x.cls==='good'){
    if(x.gain)t.push((x.me?'Tu sors ':'Il sort ')+plural(x.gain,'pierre')+'.');
    t.push(x.cls==='best'?'C’était le meilleur coup.':'Coup solide, proche du meilleur.');
  }else{
    var nx=A.res[x.i+1];
    if(nx&&nx.best!=null&&!A.P[x.i+1].winner){var k=outs(A.P[x.i+1],nx.best,x.mover);
      if(k)t.push('Ce coup permet à l’adversaire de sortir '+(k>1?k+' de '+poss+' pierres':'une de '+poss+' pierres')+' (réponse '+noteOf(N,nx.best)+').');}
    if(x.selfOut)t.push((x.me?'Tu sors ':'Il sort ')+(x.selfOut>1?x.selfOut+' de '+poss+' propres pierres':'une de '+poss+' propres pierres')+'.');
    if(x.best!=null&&x.best!==x.m){var g=outs(A.P[x.i],x.best,3-x.mover);
      t.push('Meilleur : '+noteOf(N,x.best)+(x.best>=E.REDOFF?' (rouge)':'')+(g?', qui sortait '+plural(g,'pierre'):'')+'.');}
  }
  return t.join(' ');
}
function anaShow(k,animate){
  if(!A)return;k=Math.max(0,Math.min(A.P.length-1,k));
  var prev=A.k;A.k=k;A.showBest=false;ab.setPreview(null);
  if(animate&&k===prev+1){var st=A.P[prev],m=A.P[k].last,t=E.clone(st),tr=[];E.configure(A.N);E.play(t,m,tr);
    ab.reset(st.b,st.last<0?-1:st.last%E.REDOFF);var p=m>=E.REDOFF?m-E.REDOFF:m;ab.playMove(tr,p,t.b[p]);}
  else{var l=A.P[k].last;ab.reset(A.P[k].b,k&&l>=0?(l>=E.REDOFF?l-E.REDOFF:l):-1);}
  anaRender();
}
function anaToggleBest(){
  var x=A.k>0&&anaMove(A.k-1);if(!x||x.best==null)return;
  A.showBest=!A.showBest;
  if(A.showBest){var st=A.P[x.i];E.configure(A.N);ab.reset(st.b,-1);var t=E.clone(st),tr=[];E.play(t,x.best,tr);
    var p=x.best>=E.REDOFF?x.best-E.REDOFF:x.best;ab.setPreview({p:p,color:x.best>=E.REDOFF?3:x.mover,trace:tr,blocked:[]});}
  else{ab.setPreview(null);var l=A.P[A.k].last;ab.reset(A.P[A.k].b,l>=E.REDOFF?l-E.REDOFF:l);}
  anaRender();
}
function anaRender(){
  if(!A)return;
  var n=A.P.length-1,moves=[],i;
  for(i=0;i<n;i++)moves.push(anaMove(i));
  $('aProgTxt').textContent='Analyse en cours… '+A.done+' / '+n;
  $('aProgBar').style.width=(100*A.done/n)+'%';
  /* résumé : précision et décompte par joueur */
  var sum='';
  [A.HC,3-A.HC].forEach(function(pl){
    var ms=moves.filter(function(x){return x&&x.mover===pl;}),acc=ms.length?Math.round(ms.reduce(function(a,x){return a+x.acc;},0)/ms.length):null,cnt={};
    ms.forEach(function(x){cnt[x.cls]=(cnt[x.cls]||0)+1;});
    sum+='<div class="ana-row"><i class="st c'+pl+'"></i><b>'+(pl===A.HC?'Toi':A.who)+'</b><span class="acc">'+(acc==null?'…':acc+' %')+'</span><span class="ana-cnt">'+
      CLS_ORDER.slice(2).map(function(c){return '<span style="color:'+CLS[c].c+'" title="'+CLS[c].t+'">'+CLS[c].s+' '+(cnt[c]||0)+'</span>';}).join('')+'</span></div>';});
  $('aSum').innerHTML=sum;
  anaGraph(moves);
  /* commentaire du coup courant */
  var k=A.k,card='';
  if(k===0)card='<p class="ana-h">Position de départ</p><p class="ana-t">Avance coup par coup, ou saute au moment clé suivant.</p>';
  else{var x=moves[k-1],m=A.P[k].last,isRed=m>=E.REDOFF;
    card='<p class="ana-h"><span class="mv">'+k+'.</span><i class="st c'+(isRed?3:A.P[k-1].toPlay)+'"></i>'+(A.P[k-1].toPlay===A.HC?'Toi':A.who)+' · '+noteOf(A.N,m)+
      (x?'<span class="badge-cls" style="--c:'+CLS[x.cls].c+'">'+CLS[x.cls].s+' '+CLS[x.cls].t+'</span>':'<span class="badge-cls wait">analyse…</span>')+'</p>';
    if(x){card+='<p class="ana-t">'+fr(anaExplain(x))+'</p><p class="ana-e">Ton avantage (en pierres) : '+stoneTxt(x.before)+' → '+stoneTxt(x.after)+'</p>';
      if(x.best!=null&&x.best!==x.m&&CLS_ORDER.indexOf(x.cls)>=2)card+='<button class="linkbtn" id="aBest">'+(A.showBest?'Revenir au coup joué':'Montrer le meilleur coup')+'</button>';}}
  if(k===n&&A.P[n].winner){var w=A.P[n].winner;card+='<p class="ana-t end">'+(w===A.HC?'Victoire.':w===3?'Égalité.':'Défaite.')+'</p>';}
  $('aCard').innerHTML=card;if($('aBest'))$('aBest').onclick=anaToggleBest;
  /* liste des coups */
  var h='';
  for(i=0;i<n;i++){var y=moves[i],mm=A.P[i+1].last;
    h+='<button class="mvchip'+(i+1===k?' on':'')+'" data-k="'+(i+1)+'"><span class="d" style="background:'+(y?CLS[y.cls].c:'var(--line-2)')+'"></span>'+(i+1)+'. '+noteOf(A.N,mm)+(mm>=E.REDOFF?'<i class="st c3"></i>':'')+'</button>';}
  var box=$('aMoves');box.innerHTML=h;
  var on=box.querySelector('.on');if(on)box.scrollLeft=on.offsetLeft-box.clientWidth/2+on.offsetWidth/2;
  $('aPrev').disabled=k===0;$('aFirst').disabled=k===0;$('aNext').disabled=k===n;$('aLast').disabled=k===n;
}
function anaGraph(moves){
  var cv=$('aGraph'),dpr=Math.min(3,devicePixelRatio||1),W=cv.clientWidth,H=cv.clientHeight;if(!W)return;
  cv.width=W*dpr;cv.height=H*dpr;var c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);
  var n=A.P.length-1,vals=[],i;
  vals.push(moves[0]?moves[0].before:0);
  for(i=0;i<n;i++)vals.push(moves[i]?moves[i].after:null);
  var X=function(k){return 6+(W-12)*k/Math.max(1,n);},Y=function(v){return H/2-Math.tanh(v/2500)*(H/2-4);};
  c.fillStyle='#1b1a18';c.fillRect(0,0,W,H);
  c.beginPath();c.moveTo(X(0),H);var last=0;
  for(i=0;i<=n;i++){if(vals[i]==null)break;c.lineTo(X(i),Y(vals[i]));last=i;}
  c.lineTo(X(last),H);c.closePath();c.fillStyle='rgba(243,239,232,.85)';c.fill();
  c.fillStyle='rgba(243,239,232,.85)';
  c.strokeStyle='rgba(255,248,236,.15)';c.lineWidth=1;c.beginPath();c.moveTo(0,H/2+.5);c.lineTo(W,H/2+.5);c.stroke();
  moves.forEach(function(x,j){if(!x||CLS_ORDER.indexOf(x.cls)<2)return;
    c.beginPath();c.arc(X(j+1),Y(x.after),x.me?3.6:2.6,0,7);c.fillStyle=CLS[x.cls].c;c.fill();
    if(x.me){c.lineWidth=1.2;c.strokeStyle='#121110';c.stroke();}});
  c.strokeStyle='#d4b483';c.lineWidth=1.5;c.beginPath();c.moveTo(X(A.k),0);c.lineTo(X(A.k),H);c.stroke();
}
$('aGraph').addEventListener('pointerdown',function(ev){if(!A)return;var r=this.getBoundingClientRect(),n=A.P.length-1;
  anaShow(Math.round((ev.clientX-r.left-6)/(r.width-12)*n),false);});
$('aMoves').addEventListener('click',function(ev){var b=ev.target.closest('.mvchip');if(b)anaShow(+b.dataset.k,false);});
$('aPrev').onclick=function(){anaShow(A.k-1,false);};
$('aNext').onclick=function(){anaShow(A.k+1,true);};
$('aFirst').onclick=function(){anaShow(0,false);};
$('aLast').onclick=function(){anaShow(A.P.length-1,false);};
$('aKey').onclick=function(){
  var n=A.P.length-1;
  /* d'abord tes erreurs, puis les erreurs adverses et les sorties de pierres */
  var tests=[function(x){return x.me&&CLS_ORDER.indexOf(x.cls)>=2;},function(x){return CLS_ORDER.indexOf(x.cls)>=2||x.gain;}];
  for(var t=0;t<2;t++)for(var k=A.k+1;k<=n;k++){var x=anaMove(k-1);if(x&&tests[t](x)){anaShow(k,false);return;}}
  anaShow(n,false);};
$('aBack').onclick=function(){go('game');$('endCard').hidden=true;};
window.addEventListener('resize',function(){if(current==='ana')anaRender();});

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
  {t:'Poser une pierre',x:'Pose ta pierre blanche sur le cercle, juste à gauche de la noire.<br><em>Touche : l’aperçu. Retouche la même intersection : tu joues.</em>',
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
function tPreview(p,armed){
  if(p<0){tb.setPreview(null);return;}
  tState();var L=LESSONS[T.i],red=L.mode==='red',t=E.clone(T.s),tr=[];
  if(!E.play(t,red?p+E.REDOFF:p,tr))return;
  tb.setPreview({p:p,color:red?3:2,trace:tr,blocked:red?[]:blockedChains(T.s.b,p,5),armed:!!armed});
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
window.Orlo={get analysis(){return A;},get state(){return G.cur;},get N(){return G.N;},get color(){return G.HC;}};
eng();G.cur=E.newState(G.REDS);syncShown();renderHUD();
document.addEventListener('visibilitychange',function(){if(!document.hidden&&current==='home')demoTick(600);});
})();
