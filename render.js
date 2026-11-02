/* Orlo — rendu du plateau en Canvas 2D : tissu de guède tissé, fils de lin brodés,
   pierres en dégradé, animations (chute, poussée, sortie, célébration) et particules.
   OrloArt : dessin des pierres et textures, réutilisé par l'interface (images CSS).
   OrloBoard : un plateau animé attaché à un <canvas> dans une boîte carrée. */
var OrloArt=(function(){
"use strict";
function rng(seed){var s=(seed>>>0)||1;return function(){s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};}

function drawStone(c,cx,cy,r,col){
  var g;
  c.save();
  c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.clip();
  if(col===1){
    g=c.createRadialGradient(cx-.38*r,cy-.42*r,0,cx-.08*r,cy-.08*r,1.22*r);
    g.addColorStop(0,'#86909f');g.addColorStop(.16,'#4b525e');g.addColorStop(.5,'#1d2129');g.addColorStop(.85,'#0b0c10');g.addColorStop(1,'#040506');
  }else if(col===2){
    g=c.createRadialGradient(cx-.36*r,cy-.42*r,0,cx-.08*r,cy-.08*r,1.22*r);
    g.addColorStop(0,'#ffffff');g.addColorStop(.22,'#f8f3e8');g.addColorStop(.58,'#e6ddca');g.addColorStop(.86,'#c6ba9e');g.addColorStop(1,'#9a8e73');
  }else{
    g=c.createRadialGradient(cx-.36*r,cy-.42*r,0,cx-.05*r,cy-.05*r,1.2*r);
    g.addColorStop(0,'#ffb9a6');g.addColorStop(.2,'#e9604f');g.addColorStop(.52,'#b22c21');g.addColorStop(.82,'#6c120c');g.addColorStop(1,'#3a0705');
  }
  c.fillStyle=g;c.fillRect(cx-r,cy-r,2*r,2*r);
  if(col===2){ /* stries de coquillage, très discrètes */
    c.lineWidth=r*.04;
    for(var k=0;k<11;k++){c.strokeStyle='rgba(140,120,88,'+(k%2?.07:.045)+')';c.beginPath();c.arc(cx+r*2.3,cy+r*.5,r*(1.45+k*.15),0,Math.PI*2);c.stroke();}
  }
  if(col===1){ /* reflet secondaire de fenêtre, bas droit */
    c.save();c.translate(cx+.42*r,cy+.38*r);c.rotate(-.7);c.scale(1,.35);
    g=c.createRadialGradient(0,0,0,0,0,.4*r);g.addColorStop(0,'rgba(150,175,230,.22)');g.addColorStop(1,'rgba(150,175,230,0)');
    c.fillStyle=g;c.beginPath();c.arc(0,0,.4*r,0,Math.PI*2);c.fill();c.restore();
  }
  if(col===3){ /* lueur interne de verre (diffusion) */
    g=c.createRadialGradient(cx+.16*r,cy+.5*r,0,cx+.16*r,cy+.5*r,.72*r);
    g.addColorStop(0,'rgba(255,150,105,.7)');g.addColorStop(.5,'rgba(255,90,60,.25)');g.addColorStop(1,'rgba(255,90,60,0)');
    c.globalCompositeOperation='lighter';c.fillStyle=g;c.fillRect(cx-r,cy-r,2*r,2*r);c.globalCompositeOperation='source-over';
  }
  /* lumière renvoyée par le tissu bleu */
  g=c.createLinearGradient(0,cy+r,0,cy+.05*r);
  g.addColorStop(0,col===1?'rgba(95,128,210,.42)':col===2?'rgba(70,100,175,.30)':'rgba(110,70,170,.28)');g.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=g;c.fillRect(cx-r,cy-r,2*r,2*r);
  /* bord assombri */
  g=c.createRadialGradient(cx-.05*r,cy-.05*r,r*.7,cx,cy,r);
  g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,col===2?'rgba(40,30,10,.32)':'rgba(0,0,0,.5)');
  c.fillStyle=g;c.fillRect(cx-r,cy-r,2*r,2*r);
  /* reflet spéculaire doux */
  c.save();c.translate(cx-.33*r,cy-.4*r);c.rotate(-.7);c.scale(1,.6);
  g=c.createRadialGradient(0,0,0,0,0,.46*r);
  var a=col===1?.42:col===2?.85:.55;
  g.addColorStop(0,'rgba(255,255,255,'+a+')');g.addColorStop(.6,'rgba(255,255,255,'+(a*.25)+')');g.addColorStop(1,'rgba(255,255,255,0)');
  c.fillStyle=g;c.beginPath();c.arc(0,0,.46*r,0,Math.PI*2);c.fill();c.restore();
  /* point chaud */
  g=c.createRadialGradient(cx-.37*r,cy-.45*r,0,cx-.37*r,cy-.45*r,.13*r);
  g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(1,'rgba(255,255,255,0)');
  c.fillStyle=g;c.fillRect(cx-r,cy-r,2*r,2*r);
  c.restore();
  c.beginPath();c.arc(cx,cy,r-r*.015,0,Math.PI*2);
  c.strokeStyle=col===2?'rgba(70,58,35,.35)':'rgba(0,0,0,.5)';c.lineWidth=r*.03;c.stroke();
}
function stoneCanvas(col,rpx){
  var pad=Math.ceil(rpx*.04)+2,sz=Math.ceil(2*rpx+2*pad),cv=document.createElement('canvas');
  cv.width=cv.height=sz;drawStone(cv.getContext('2d'),sz/2,sz/2,rpx,col);return cv;}
function shadowCanvas(rpx){
  var sz=Math.max(8,Math.ceil(rpx*3)),cv=document.createElement('canvas');cv.width=cv.height=sz;
  var c=cv.getContext('2d'),g=c.createRadialGradient(sz/2,sz/2,0,sz/2,sz/2,sz/2);
  g.addColorStop(0,'rgba(2,4,14,.62)');g.addColorStop(.38,'rgba(2,4,14,.42)');g.addColorStop(.7,'rgba(2,4,14,.12)');g.addColorStop(1,'rgba(2,4,14,0)');
  c.fillStyle=g;c.fillRect(0,0,sz,sz);return cv;}
function url(col,px){return stoneCanvas(col,px/2-3).toDataURL();}
/* petite tuile d'armure toile pour les fonds CSS (8 px CSS, 2x) */
function weaveTile(){
  var cv=document.createElement('canvas'),t=8;cv.width=cv.height=2*t;var c=cv.getContext('2d');
  c.fillStyle='#121825';c.fillRect(0,0,2*t,2*t);
  function cell(x,y,h){var g=h?c.createLinearGradient(0,y,0,y+t):c.createLinearGradient(x,0,x+t,0);
    g.addColorStop(0,'rgba(0,0,0,.35)');g.addColorStop(.5,h?'rgba(70,90,140,.20)':'rgba(60,80,130,.14)');g.addColorStop(1,'rgba(0,0,0,.4)');
    c.fillStyle=g;c.fillRect(x,y,t,t);}
  cell(0,0,1);cell(t,0,0);cell(0,t,0);cell(t,t,1);
  return cv.toDataURL();}
return {rng:rng,drawStone:drawStone,stoneCanvas:stoneCanvas,shadowCanvas:shadowCanvas,url:url,weaveTile:weaveTile};
})();

var OrloBoard=(function(){
"use strict";
var DX=[1,-1,0,0],DY=[0,0,1,-1],ANG=[0,Math.PI,Math.PI/2,-Math.PI/2];
var EASE={
  lin:function(t){return t;},
  inQ:function(t){return t*t;},
  outC:function(t){return 1-Math.pow(1-t,3);},
  outBack:function(t){var c=1.25,u=t-1;return 1+(c+1)*u*u*u+c*u*u;},
  inOut:function(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}
};
var RM=window.matchMedia?matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
var LINEN='#ddd3b8';

function Board(canvas,opt){
  opt=opt||{};
  this.cv=canvas;this.box=canvas.parentElement;this.ctx=canvas.getContext('2d');
  this.N=opt.n||7;this.bleedF=opt.bleed==null?.08:opt.bleed;this.margin=.72;
  this.stones=new Map();this.cell=new Int32Array(this.N*this.N);this.nextId=1;
  this.anims=[];this.parts=[];this.ripples=[];this.pv=null;this.targets=[];this.last=-1;
  this.shakeAmp=0;this.shakeT0=0;this.onEject=null;this.raf=0;this.now=performance.now();this.prev=0;
  this.rand=OrloArt.rng(1234);this.C=0;this.built=0;
  var self=this;
  if(window.ResizeObserver)new ResizeObserver(function(){self.resize();}).observe(this.box);
  window.addEventListener('resize',function(){self.resize();});
  this.resize();
}
var P=Board.prototype;
Board.EASE=EASE;
P.k=function(){return RM.matches?.4:1;};
P.resize=function(){
  var C=Math.round(this.box.clientWidth);if(!C)return;
  var dpr=Math.min(3,window.devicePixelRatio||1);
  if(C===this.C&&dpr===this.dpr&&this.built===this.N)return;
  this.C=C;this.dpr=dpr;var B=Math.round(C*this.bleedF);this.B=B;this.W=C+2*B;
  var cv=this.cv;cv.style.left=cv.style.top=(-B)+'px';cv.style.width=cv.style.height=this.W+'px';
  cv.width=cv.height=Math.round(this.W*dpr);
  this.layout();this.build();this.draw();
};
P.layout=function(){var N=this.N;this.S=this.C/(N-1+2*this.margin);this.R=this.S*.43;this.O=this.B+this.margin*this.S;};
P.g=function(i){return this.O+i*this.S;};
P.setN=function(n){
  if(n===this.N)return;
  this.N=n;this.cell=new Int32Array(n*n);this.stones.clear();this.built=0;this.pv=null;this.targets=[];this.last=-1;
  if(this.C){this.layout();this.build();this.draw();}
};

/* ---------- le tissu (calculé une fois par taille) ---------- */
P.build=function(){
  this.built=this.N;
  var dpr=this.dpr,W=this.W,C=this.C,B=this.B,S=this.S,N=this.N,self=this;
  var cv=document.createElement('canvas');cv.width=cv.height=Math.round(W*dpr);
  var c=cv.getContext('2d'),rnd=OrloArt.rng(17+N*31),g,i,k;
  c.setTransform(dpr,0,0,dpr,0,0);
  var x0=B,y0=B,rr=Math.max(3,C*.014),cx=x0+C/2,cy=y0+C/2;
  function clothPath(){c.beginPath();if(c.roundRect)c.roundRect(x0,y0,C,C,rr);else c.rect(x0,y0,C,C);}
  /* ombre portée du tissu sur la table */
  c.save();c.shadowColor='rgba(0,0,0,.75)';c.shadowBlur=C*.07;c.shadowOffsetY=C*.025;
  clothPath();c.fillStyle='#1c2644';c.fill();c.restore();
  c.save();clothPath();c.clip();
  /* fond de guède */
  g=c.createRadialGradient(x0+C*.42,y0+C*.36,C*.04,cx,cy,C*.78);
  g.addColorStop(0,'#3a4f88');g.addColorStop(.55,'#2a3b68');g.addColorStop(1,'#182140');
  c.fillStyle=g;c.fillRect(x0,y0,C,C);
  /* armure toile : tuile 2×2 (trame dessus / chaîne dessus) en pixels physiques */
  var td=Math.max(3,Math.round(C*dpr/124));
  var tile=document.createElement('canvas');tile.width=tile.height=2*td;var t=tile.getContext('2d');
  function cellH(x,y){var q=t.createLinearGradient(0,y,0,y+td);
    q.addColorStop(0,'rgba(2,6,22,.42)');q.addColorStop(.45,'rgba(185,205,255,.13)');q.addColorStop(.55,'rgba(185,205,255,.11)');q.addColorStop(1,'rgba(2,6,22,.48)');
    t.fillStyle=q;t.fillRect(x,y,td,td);
    q=t.createLinearGradient(x,0,x+td,0);q.addColorStop(0,'rgba(0,0,10,.3)');q.addColorStop(.25,'rgba(0,0,10,0)');q.addColorStop(.75,'rgba(0,0,10,0)');q.addColorStop(1,'rgba(0,0,10,.3)');
    t.fillStyle=q;t.fillRect(x,y,td,td);}
  function cellV(x,y){var q=t.createLinearGradient(x,0,x+td,0);
    q.addColorStop(0,'rgba(2,6,22,.46)');q.addColorStop(.5,'rgba(160,185,245,.09)');q.addColorStop(1,'rgba(2,6,22,.5)');
    t.fillStyle=q;t.fillRect(x,y,td,td);
    q=t.createLinearGradient(0,y,0,y+td);q.addColorStop(0,'rgba(0,0,10,.3)');q.addColorStop(.25,'rgba(0,0,10,0)');q.addColorStop(.75,'rgba(0,0,10,0)');q.addColorStop(1,'rgba(0,0,10,.3)');
    t.fillStyle=q;t.fillRect(x,y,td,td);}
  cellH(0,0);cellV(td,0);cellV(0,td);cellH(td,td);
  c.save();c.setTransform(1,0,0,1,Math.round(x0*dpr),Math.round(y0*dpr));
  var CD=Math.ceil(C*dpr);
  c.fillStyle=c.createPattern(tile,'repeat');c.fillRect(0,0,CD,CD);
  /* irrégularités fil à fil, flammes (fils plus épais) */
  for(var y=0;y<CD;y+=td){var v=rnd();c.fillStyle=v<.5?'rgba(0,0,12,'+((.5-v)*.2)+')':'rgba(210,225,255,'+((v-.5)*.08)+')';c.fillRect(0,y,CD,td);}
  for(var x=0;x<CD;x+=td){v=rnd();c.fillStyle=v<.5?'rgba(0,0,12,'+((.5-v)*.16)+')':'rgba(200,215,255,'+((v-.5)*.06)+')';c.fillRect(x,0,td,CD);}
  for(k=0;k<70;k++){var hz=rnd()<.5,len=(3+rnd()*10)*td,a=rnd()*CD,b=Math.floor(rnd()*CD/td)*td;
    c.fillStyle=rnd()<.7?'rgba(205,220,255,.08)':'rgba(0,0,10,.18)';if(hz)c.fillRect(a,b,len,td);else c.fillRect(b,a,td,len);}
  c.restore();
  /* grain */
  var nz=document.createElement('canvas');nz.width=nz.height=96;var nc=nz.getContext('2d'),id=nc.createImageData(96,96);
  for(i=0;i<id.data.length;i+=4){var n=rnd()*255|0;id.data[i]=id.data[i+1]=id.data[i+2]=n;id.data[i+3]=255;}
  nc.putImageData(id,0,0);
  c.save();c.globalAlpha=.06;c.globalCompositeOperation='overlay';c.fillStyle=c.createPattern(nz,'repeat');c.fillRect(x0,y0,C,C);c.restore();
  /* lumière rasante et vignettage */
  g=c.createLinearGradient(x0,y0,x0+C,y0+C);g.addColorStop(0,'rgba(255,255,255,.08)');g.addColorStop(.45,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(0,0,10,.2)');
  c.fillStyle=g;c.fillRect(x0,y0,C,C);
  g=c.createRadialGradient(cx,cy,C*.3,cx,cy,C*.76);g.addColorStop(0,'rgba(4,7,20,0)');g.addColorStop(1,'rgba(4,7,20,.55)');
  c.fillStyle=g;c.fillRect(x0,y0,C,C);
  /* l'ourlet : bande repliée + couture */
  var h=Math.max(6,S*.3);
  c.beginPath();c.rect(x0,y0,C,C);c.rect(x0+h,y0+h,C-2*h,C-2*h);c.fillStyle='rgba(4,8,22,.26)';c.fill('evenodd');
  c.lineWidth=1.4;c.strokeStyle='rgba(0,0,12,.55)';c.strokeRect(x0+h+.7,y0+h+.7,C-2*h,C-2*h);
  c.lineWidth=1;c.strokeStyle='rgba(185,205,255,.13)';c.strokeRect(x0+h-.5,y0+h-.5,C-2*h+1,C-2*h+1);
  c.strokeStyle='rgba(185,205,255,.16)';c.strokeRect(x0+.5,y0+.5,C-1,C-1);
  var sw=Math.max(1,S*.022),hi=h*.52;
  c.lineCap='round';
  c.setLineDash([S*.075,S*.055]);
  c.lineWidth=sw*1.6;c.strokeStyle='rgba(0,0,12,.55)';c.strokeRect(x0+hi+.4,y0+hi+.7,C-2*hi,C-2*hi);
  c.lineWidth=sw;c.strokeStyle='rgba(221,211,184,.82)';c.strokeRect(x0+hi,y0+hi,C-2*hi,C-2*hi);
  c.setLineDash([]);
  c.restore();
  /* fibres effilochées au bord */
  c.lineWidth=.6;
  for(k=0;k<140;k++){var side=k%4,u=rnd()*C,l=1+rnd()*2.6,o=rnd()*.8-.4;
    var px=side===0?x0+u:side===1?x0+u:side===2?x0:x0+C,py=side===0?y0:side===1?y0+C:y0+u;
    var vx=side===2?-1:side===3?1:o,vy=side===0?-1:side===1?1:o;
    c.strokeStyle=rnd()<.5?'rgba(70,92,150,.55)':'rgba(40,55,95,.6)';
    c.beginPath();c.moveTo(px,py);c.lineTo(px+vx*l,py+vy*l);c.stroke();}
  /* les lignes : fils de lin brodés */
  var lw=Math.min(2.6,Math.max(1.1,S*.036)),a0=this.g(0),a1=this.g(N-1);
  c.lineCap='round';
  c.beginPath();for(i=0;i<N;i++){var p=this.g(i);c.moveTo(a0+lw*.4,p+lw*.7);c.lineTo(a1+lw*.4,p+lw*.7);c.moveTo(p+lw*.4,a0+lw*.7);c.lineTo(p+lw*.4,a1+lw*.7);}
  c.lineWidth=lw*1.9;c.strokeStyle='rgba(2,5,16,.55)';c.stroke();
  c.beginPath();for(i=0;i<N;i++){p=this.g(i);c.moveTo(a0,p);c.lineTo(a1,p);}
  c.lineWidth=lw;c.strokeStyle='#cbbf9f';c.stroke();
  c.beginPath();for(i=0;i<N;i++){p=this.g(i);c.moveTo(p,a0);c.lineTo(p,a1);}
  c.stroke();
  /* torsion du fil : petites diagonales sombres + reflet */
  c.beginPath();var st=lw*1.45;
  for(i=0;i<N;i++){p=this.g(i);
    for(x=a0;x<a1;x+=st){c.moveTo(x,p-lw*.45);c.lineTo(x+lw*.6,p+lw*.45);}
    for(y=a0;y<a1;y+=st){c.moveTo(p+lw*.45,y);c.lineTo(p-lw*.45,y+lw*.6);}}
  c.lineWidth=lw*.28;c.strokeStyle='rgba(105,86,55,.42)';c.stroke();
  c.beginPath();for(i=0;i<N;i++){p=this.g(i);c.moveTo(a0,p-lw*.2);c.lineTo(a1,p-lw*.2);c.moveTo(p-lw*.2,a0);c.lineTo(p-lw*.2,a1);}
  c.lineWidth=lw*.3;c.strokeStyle='rgba(255,250,232,.38)';c.stroke();
  /* nœuds aux extrémités et nœud central */
  function knot(x,y,r){c.beginPath();c.arc(x+r*.25,y+r*.4,r,0,7);c.fillStyle='rgba(2,5,16,.5)';c.fill();
    var q=c.createRadialGradient(x-r*.3,y-r*.35,0,x,y,r);q.addColorStop(0,'#fbf5e4');q.addColorStop(.6,LINEN);q.addColorStop(1,'#a99a76');
    c.beginPath();c.arc(x,y,r,0,7);c.fillStyle=q;c.fill();}
  for(i=0;i<N;i++){p=this.g(i);knot(a0,p,lw*.95);knot(a1,p,lw*.95);knot(p,a0,lw*.95);knot(p,a1,lw*.95);}
  if(N%2){var m=this.g((N-1)/2);knot(m,m,lw*1.7);}
  /* points de croix garance aux coins de l'ourlet */
  c.lineCap='round';
  [[x0+hi,y0+hi],[x0+C-hi,y0+hi],[x0+hi,y0+C-hi],[x0+C-hi,y0+C-hi]].forEach(function(z){var e=h*.26;
    c.lineWidth=sw*2.2;c.strokeStyle='rgba(0,0,10,.5)';c.beginPath();c.moveTo(z[0]-e+.5,z[1]-e+.8);c.lineTo(z[0]+e+.5,z[1]+e+.8);c.moveTo(z[0]+e+.5,z[1]-e+.8);c.lineTo(z[0]-e+.5,z[1]+e+.8);c.stroke();
    c.lineWidth=sw*1.5;c.strokeStyle='#c4483a';c.beginPath();c.moveTo(z[0]-e,z[1]-e);c.lineTo(z[0]+e,z[1]+e);c.moveTo(z[0]+e,z[1]-e);c.lineTo(z[0]-e,z[1]+e);c.stroke();});
  this.cloth=cv;
  var rp=this.R*dpr;
  this.spr=[null,OrloArt.stoneCanvas(1,rp),OrloArt.stoneCanvas(2,rp),OrloArt.stoneCanvas(3,rp)];
  this.shd=OrloArt.shadowCanvas(rp);
};

/* ---------- boucle d'animation ---------- */
P.kick=function(){var self=this;if(!this.raf)this.raf=requestAnimationFrame(function(ts){self.loop(ts);});};
P.loop=function(ts){
  this.raf=0;var dt=this.prev?Math.min(50,ts-this.prev):16;this.prev=ts;this.now=ts;
  var list=this.anims.slice(),i;
  for(i=0;i<list.length;i++){var a=list[i],k=(ts-a.t0)/a.dur;if(k<0)continue;
    if(k>=1){a.fn(a.ease(1));var j=this.anims.indexOf(a);if(j>=0)this.anims.splice(j,1);a.res();}
    else a.fn(a.ease(k));}
  for(i=this.parts.length-1;i>=0;i--){var p=this.parts[i];p.life-=dt/p.max;if(p.life<=0){this.parts.splice(i,1);continue;}
    p.vy+=p.g*dt;p.vx*=p.drag;p.vy*=p.drag;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;}
  for(i=this.ripples.length-1;i>=0;i--)if(ts-this.ripples[i].t0>this.ripples[i].dur)this.ripples.splice(i,1);
  this.draw();
  if(this.anims.length||this.parts.length||this.ripples.length||this.pv||this.targets.length||this.shakeAmp)this.kick();
  else this.prev=0;
};
P.tween=function(delay,dur,fn,ease){var self=this;
  return new Promise(function(res){self.anims.push({t0:performance.now()+delay,dur:Math.max(1,dur),fn:fn,ease:ease||EASE.outC,res:res});self.kick();});};
P.wait=function(ms){return this.tween(ms,1,function(){});};
P.shake=function(a){this.shakeAmp=Math.max(this.shakeAmp,a*(RM.matches?0:1));this.shakeT0=performance.now();this.kick();};
P.ripple=function(x,y,col,o){o=o||{};this.ripples.push({x:x,y:y,col:col,t0:performance.now()+(o.delay||0),dur:o.dur||600,k:o.k||1,a:o.a==null?1:o.a,w:o.w||2});this.kick();};
P.burst=function(x,y,n,o){
  if(RM.matches)n=Math.ceil(n/3);
  for(var i=0;i<n;i++){var ang=(o.ang==null?Math.random()*Math.PI*2:o.ang+(Math.random()-.5)*(o.spread||1.6)),sp=(o.speed||.12)*(.4+Math.random());
    this.parts.push({x:x,y:y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp-(o.lift||0),g:o.g==null?.0003:o.g,drag:o.drag||.985,
      life:1,max:(o.life||600)*(.6+Math.random()*.6),kind:o.kind||'fiber',col:o.cols[i%o.cols.length],len:(o.len||this.S*.12)*(.5+Math.random()),
      rot:Math.random()*7,vr:(Math.random()-.5)*.02,size:(o.size||1.4)*(.6+Math.random()*.8)});}
  this.kick();};

/* ---------- état sans animation ---------- */
P.reset=function(b,last){
  this.anims.forEach(function(a){a.res();});this.anims=[];this.parts=[];this.ripples=[];
  this.stones.clear();this.cell=new Int32Array(this.N*this.N);
  for(var p=0;p<b.length;p++)if(b[p]){var id=this.nextId++;this.cell[p]=id;this.stones.set(id,this.mk(id,b[p],p));}
  this.last=last==null?-1:last;this.draw();};
P.mk=function(id,color,p){return{id:id,color:color,i:p%this.N,j:(p/this.N)|0,z:0,a:1,sc:1,ox:0,oy:0};};
P.setPreview=function(pv){
  if(pv){var self=this;pv.wob={};pv.trace.forEach(function(tr){if(tr[1]<0&&self.cell[tr[0]])pv.wob[self.cell[tr[0]]]=[DX[tr[2]],DY[tr[2]]];});}
  this.pv=pv;this.pvT0=performance.now();this.kick();this.draw();};
P.setTargets=function(t){this.targets=t||[];this.kick();this.draw();};

/* ---------- coup animé ---------- */
P.playMove=function(trace,p,color){
  var self=this,N=this.N,K=this.k(),S=this.S,proms=[];
  var nc=this.cell.slice(),i;
  for(i=0;i<trace.length;i++)nc[trace[i][0]]=0;
  var drop=Math.round(200*K),id=this.nextId++,s=this.mk(id,color,p);s.z=1.9;s.a=0;s.sc=1.04;
  this.stones.set(id,s);nc[p]=id;
  var px=this.g(p%N),py=this.g((p/N)|0);
  proms.push(this.tween(0,drop,function(k){s.z=1.9*(1-k);s.a=Math.min(1,k*3);s.sc=1.04-.04*k;},EASE.inQ).then(function(){
    if(color===3){self.ripple(px,py,'rgba(232,96,80,.9)',{k:1.4,w:3,dur:700});self.ripple(px,py,'rgba(232,96,80,.5)',{k:2.4,w:2,dur:900,delay:90});
      self.burst(px,py+self.R*.6,12,{cols:['#e0796d','#8e2219','#ddd3b8'],speed:.07,life:500,g:.0002});self.shake(2);}
    else{self.ripple(px,py,'rgba(232,222,196,.65)',{k:1.1,w:2,dur:520});
      self.burst(px,py+self.R*.5,7,{cols:['rgba(221,211,184,.8)','rgba(120,145,210,.7)'],speed:.05,life:420,g:.0002});}
    if(trace.length)self.shake(trace.some(function(x){return x[1]<0;})?0:1);
  }));
  trace.forEach(function(tr){
    var f=tr[0],to=tr[1],d=tr[2],st=self.stones.get(self.cell[f]);if(!st)return;
    var dist=Math.abs(f%N-p%N)+Math.abs(((f/N)|0)-((p/N)|0))-1,delay=drop+Math.round(dist*42*K);
    var i0=st.i,j0=st.j;
    if(to>=0){nc[to]=st.id;
      proms.push(self.tween(delay,Math.round(280*K),function(k){st.i=i0+DX[d]*k;st.j=j0+DY[d]*k;st.z=Math.max(0,Math.sin(Math.PI*Math.min(1,k)))*.14;},EASE.outBack));}
    else{
      proms.push(self.tween(delay,Math.round(260*K),function(k){st.i=i0+DX[d]*k*.9;st.j=j0+DY[d]*k*.9;st.z=k*.25;},EASE.outC).then(function(){
        var ex=self.g(i0+DX[d]*.72),ey=self.g(j0+DY[d]*.72);
        self.burst(ex,ey,18,{cols:['#ddd3b8','#e0796d','#7f9be0','#c9a964'],ang:ANG[d],spread:2.2,speed:.16,life:650,g:.00035});
        self.ripple(self.g(i0),self.g(j0),'rgba(224,110,95,.8)',{k:1.3,w:2.5,dur:600});
        self.shake(3.2);
        if(self.onEject){var pt=self.client(st.i,st.j);
          self.onEject(st.color,pt.x,pt.y,self.R*2,d);self.stones.delete(st.id);return;}
        return self.tween(0,Math.round(340*K),function(k){st.i=i0+DX[d]*(.9+.5*k);st.j=j0+DY[d]*(.9+.5*k);st.sc=1-.5*k;st.a=1-k;st.z=.25-k*.9;},EASE.inQ)
          .then(function(){self.stones.delete(st.id);});
      }));}
  });
  this.cell=nc;this.last=p;this.kick();
  return Promise.all(proms);
};
/* une rouge a bloqué une file : la rouge vibre, la file tremble */
P.flashBlocked=function(list,delay){
  var self=this,N=this.N;delay=delay==null?Math.round(220*this.k()):delay;
  list.forEach(function(b){
    var r=self.stones.get(self.cell[b.red]);
    self.ripple(self.g(b.red%N),self.g((b.red/N)|0),'rgba(240,110,90,.95)',{k:.9,w:3,dur:520,delay:delay});
    if(r)self.tween(delay,420,function(k){r.sc=1+.09*Math.sin(Math.PI*k);});
    b.cells.forEach(function(q,n){var s=self.stones.get(self.cell[q]);if(!s||q===b.red)return;
      self.tween(delay+n*20,420,function(k){var w=Math.sin(k*Math.PI*5)*(1-k)*.05;s.ox=DX[b.d]*w;s.oy=DY[b.d]*w;},EASE.lin);});
  });};
/* fin de partie : vague de sauts des pierres gagnantes + étincelles */
P.celebrate=function(color){
  var self=this,N=this.N,c=(N-1)/2;
  this.stones.forEach(function(s){if(color&&s.color!==color)return;
    var d=Math.hypot(s.i-c,s.j-c);
    [0,700].forEach(function(o){self.tween(o+d*90,520,function(k){s.z=Math.sin(Math.PI*k)*.85;},EASE.lin);});});
  for(var n=0;n<3;n++)(function(n){self.wait(n*260).then(function(){
    for(var k=0;k<14;k++){var x=self.g(Math.random()*(N-1)),y=self.g(Math.random()*(N-1));
      self.burst(x,y,1,{kind:'spark',cols:color===1?['#9fb3e8','#e6c987']:color===2?['#fff6dc','#e6c987']:['#e6c987'],speed:.03,lift:.05,g:-.00002,life:1100,size:2.2});}
  });})(n);
};

/* ---------- géométrie et pointeur ---------- */
P.cellAt=function(x,y){
  var r=this.box.getBoundingClientRect(),off=this.O-this.B;
  var u=(x-r.left-off)/this.S,v=(y-r.top-off)/this.S,i=Math.round(u),j=Math.round(v);
  if(i<0||j<0||i>=this.N||j>=this.N)return -1;
  if(Math.hypot(u-i,v-j)>.56)return -1;
  return j*this.N+i;};
P.client=function(i,j){var r=this.box.getBoundingClientRect(),off=-this.B;return{x:r.left+off+this.g(i),y:r.top+off+this.g(j)};};

/* ---------- dessin ---------- */
P.drawStone=function(c,s,x,y,alpha){
  var spr=this.spr[s.color],z=s.z,sz=spr.width/this.dpr*(1+Math.max(0,z)*.1)*s.sc;
  c.globalAlpha=alpha;c.drawImage(spr,x-sz/2,y-z*this.R*.55-sz/2,sz,sz);c.globalAlpha=1;};
P.chevron=function(c,x,y,d,col,n,sz){
  c.save();c.translate(x,y);c.rotate(ANG[d]);c.lineCap='round';c.lineJoin='round';
  for(var pass=0;pass<2;pass++){c.beginPath();
    for(var k=0;k<n;k++){var o=(k-(n-1)/2)*sz*.95;c.moveTo(o-sz*.55,-sz);c.lineTo(o+sz*.45,0);c.lineTo(o-sz*.55,sz);}
    c.lineWidth=pass?sz*.48:sz*.95;c.strokeStyle=pass?col:'rgba(6,8,18,.75)';c.stroke();}
  c.restore();};
P.draw=function(){
  if(!this.C||!this.cloth)return;
  var c=this.ctx,dpr=this.dpr,W=this.W,R=this.R,S=this.S,N=this.N,now=this.now=performance.now(),self=this,i;
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,this.cv.width,this.cv.height);
  var sx=0,sy=0;
  if(this.shakeAmp){var k=(now-this.shakeT0)/300;if(k>=1)this.shakeAmp=0;else{var a=this.shakeAmp*(1-k)*(1-k);sx=Math.sin(now*.09)*a;sy=Math.cos(now*.113)*a*.7;}}
  c.setTransform(dpr,0,0,dpr,sx*dpr,sy*dpr);
  c.drawImage(this.cloth,0,0,W,W);
  /* ondes sur le tissu */
  this.ripples.forEach(function(r){var k=(now-r.t0)/r.dur;if(k<0||k>1)return;var e=EASE.outC(k),rad=R*(.9+e*r.k);
    c.beginPath();c.ellipse(r.x,r.y+R*.08,rad,rad*.96,0,0,7);c.globalAlpha=(1-e)*r.a;c.strokeStyle=r.col;c.lineWidth=r.w*(1-e*.5);c.stroke();});
  c.globalAlpha=1;
  /* cibles (tutoriel) */
  var t=now/1000;
  this.targets.forEach(function(p){var x=self.g(p%N),y=self.g((p/N)|0),k=(t%1.5)/1.5;
    c.beginPath();c.arc(x,y,R*(.55+.75*k),0,7);c.strokeStyle='rgba(230,201,135,'+(1-k)*.9+')';c.lineWidth=2.2;c.stroke();
    c.beginPath();c.arc(x,y,R*.92,0,7);c.setLineDash([R*.22,R*.16]);c.lineDashOffset=-t*R*.6;c.strokeStyle='rgba(230,201,135,.95)';c.lineWidth=2;c.stroke();c.setLineDash([]);
    var g=c.createRadialGradient(x,y,0,x,y,R);g.addColorStop(0,'rgba(230,201,135,.28)');g.addColorStop(1,'rgba(230,201,135,0)');c.fillStyle=g;c.beginPath();c.arc(x,y,R,0,7);c.fill();});
  var pv=this.pv;
  /* pierres : ombres puis corps, triées par hauteur */
  var list=Array.from(this.stones.values()).sort(function(a,b){return a.z-b.z;});
  var shd=this.shd,ss=shd.width/dpr;
  list.forEach(function(s){if(s.a<=0)return;var x=self.g(s.i+s.ox),y=self.g(s.j+s.oy),z=Math.max(0,s.z),f=s.z<0?Math.max(0,1+s.z):1;
    var sz=ss*(1+z*.35)*s.sc;c.globalAlpha=s.a*f*Math.max(.35,1-z*.32)*.9;
    c.drawImage(shd,x+R*.16+z*R*.4-sz/2,y+R*.3+z*R*.55-sz/2,sz,sz);
    var cz=ss*.72*s.sc;c.globalAlpha=s.a*f*Math.max(0,1-z*1.6);c.drawImage(shd,x+R*.05-cz/2,y+R*.12-cz/2,cz,cz);});
  c.globalAlpha=1;
  /* halo garance sous les pierres qui sortiraient */
  if(pv){pv.trace.forEach(function(tr){if(tr[1]>=0)return;var x=self.g(tr[0]%N),y=self.g((tr[0]/N)|0),pl=.5+.5*Math.sin(t*6);
    var g=c.createRadialGradient(x,y,R*.8,x,y,R*1.45);g.addColorStop(0,'rgba(230,90,70,'+(.45+.3*pl)+')');g.addColorStop(1,'rgba(230,90,70,0)');
    c.fillStyle=g;c.beginPath();c.arc(x,y,R*1.45,0,7);c.fill();});}
  list.forEach(function(s){if(s.a<=0)return;var x=self.g(s.i+s.ox),y=self.g(s.j+s.oy);
    if(pv&&pv.wob&&pv.wob[s.id]){var w=pv.wob[s.id];x+=Math.sin(t*22)*R*.035*w[0];y+=Math.sin(t*22)*R*.035*w[1];}
    self.drawStone(c,s,x,y,s.a);});
  /* dernier coup */
  if(this.last>=0&&this.cell[this.last]){var ls=this.stones.get(this.cell[this.last]);
    if(ls&&Math.abs(ls.z)<.05){var lx=this.g(ls.i+ls.ox),ly=this.g(ls.j+ls.oy);
      c.beginPath();c.arc(lx,ly,R*.2,0,7);c.lineWidth=Math.max(1.4,R*.085);
      c.strokeStyle=ls.color===2?'rgba(38,50,84,.75)':ls.color===3?'rgba(255,220,200,.75)':'rgba(230,220,196,.8)';c.stroke();}}
  /* aperçu */
  if(pv){
    var p=pv.p,x=this.g(p%N),y=this.g((p/N)|0),age=Math.min(1,(now-this.pvT0)/160);
    var spr=this.spr[pv.color],sz=spr.width/dpr*(1.08-.08*age);
    c.globalAlpha=.55*age;c.drawImage(spr,x-sz/2,y-sz/2,sz,sz);c.globalAlpha=1;
    c.beginPath();c.arc(x,y,R*1.1,0,7);c.setLineDash([R*.26,R*.17]);c.lineDashOffset=-t*R*.9;
    c.strokeStyle=pv.color===3?'rgba(240,130,110,.95)':'rgba(230,201,135,.95)';c.lineWidth=Math.max(1.6,R*.08);c.stroke();c.setLineDash([]);
    var cs=Math.max(5,S*.125);
    pv.trace.forEach(function(tr){var f=tr[0],d=tr[2],fx=self.g(f%N),fy=self.g((f/N)|0);
      if(tr[1]<0){var pl=.5+.5*Math.sin(t*6);
        c.beginPath();c.arc(fx,fy,R*(1.04+.05*pl),0,7);c.strokeStyle='rgba(240,110,92,'+(.7+.3*pl)+')';c.lineWidth=Math.max(2,R*.11);c.stroke();
        var o=.68+.1*((t*1.6)%1);self.chevron(c,fx+DX[d]*S*o,fy+DY[d]*S*o,d,'#f08070',2,cs*1.05);}
      else{var o2=.5+.07*Math.sin(t*5);self.chevron(c,fx+DX[d]*S*o2,fy+DY[d]*S*o2,d,'#ecd08f',1,cs);}});
    (pv.blocked||[]).forEach(function(b){var bx=x+DX[b.d]*S*.5,by=y+DY[b.d]*S*.5,L=S*.2;
      c.save();c.translate(bx,by);c.rotate(ANG[b.d]);c.lineCap='round';
      c.beginPath();c.moveTo(0,-L);c.lineTo(0,L);c.lineWidth=S*.1;c.strokeStyle='rgba(6,8,18,.75)';c.stroke();c.lineWidth=S*.055;c.strokeStyle='#f08070';c.stroke();c.restore();
      var rx=self.g(b.red%N),ry=self.g((b.red/N)|0),pl=.5+.5*Math.sin(t*5);
      c.beginPath();c.arc(rx,ry,R*(1.05+.05*pl),0,7);c.strokeStyle='rgba(240,110,92,'+(.4+.4*pl)+')';c.lineWidth=2;c.stroke();});
  }
  /* particules */
  this.parts.forEach(function(q){var al=Math.max(0,q.life);
    if(q.kind==='spark'){var r2=q.size*(1+(1-al));var g=c.createRadialGradient(q.x,q.y,0,q.x,q.y,r2*3);g.addColorStop(0,q.col);g.addColorStop(1,'rgba(0,0,0,0)');
      c.globalAlpha=al;c.globalCompositeOperation='lighter';c.fillStyle=g;c.fillRect(q.x-r2*3,q.y-r2*3,r2*6,r2*6);c.globalCompositeOperation='source-over';}
    else{c.globalAlpha=al;c.strokeStyle=q.col;c.lineWidth=q.size*.7;c.lineCap='round';c.beginPath();
      c.moveTo(q.x-Math.cos(q.rot)*q.len/2,q.y-Math.sin(q.rot)*q.len/2);c.lineTo(q.x+Math.cos(q.rot)*q.len/2,q.y+Math.sin(q.rot)*q.len/2);c.stroke();}});
  c.globalAlpha=1;
};
return Board;
})();
