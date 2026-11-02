/* Orlo — moteur de règles et IA (negamax alpha-beta, approfondissement itératif).
   Utilisable dans le navigateur (global Engine), dans un Web Worker (importScripts) et sous Node (require). */
var Engine=(function(){
"use strict";
var N=0,NN=0,RED=3,REDOFF=100,TARGET=5,MAXMOVES=120;
var DX=[1,-1,0,0],DY=[0,0,1,-1];
var step=[],DIST=null,chain=new Int8Array(16);
function configure(n){if(n===N)return;N=n;NN=n*n;step=[];
  for(var d=0;d<4;d++){var arr=new Int8Array(NN);
    for(var p=0;p<NN;p++){var x=p%N+DX[d],y=(p/N|0)+DY[d];arr[p]=(x>=0&&x<N&&y>=0&&y<N)?y*N+x:-1;}
    step.push(arr);}
  DIST=new Int8Array(NN);
  for(p=0;p<NN;p++){var px=p%N,py=p/N|0;DIST[p]=Math.min(px,py,N-1-px,N-1-py);}}
configure(7);

function newState(reds){if(reds==null)reds=4;return{b:new Int8Array(NN),toPlay:1,reds:[0,reds,reds],lost:[0,0,0],moves:0,winner:0,last:-1};}
function clone(s){return{b:Int8Array.from(s.b),toPlay:s.toPlay,reds:s.reds.slice(),lost:s.lost.slice(),moves:s.moves,winner:s.winner,last:s.last};}
function verdict(s){return s.lost[1]<s.lost[2]?1:s.lost[2]<s.lost[1]?2:3;}

/* trace : liste [de, vers (-1 = sortie), direction] */
function play(s,m,trace){
  if(s.winner)return false;
  var c=s.toPlay,o=3-c,b=s.b,p,i;
  if(m>=REDOFF){p=m-REDOFF;if(p<0||p>=NN||b[p]!==0||s.reds[c]<=0)return false;b[p]=RED;s.reds[c]--;}
  else{
    p=m;if(p<0||p>=NN||b[p]!==0)return false;
    for(var d=0;d<4;d++){
      var st=step[d],q=st[p],len=0;
      while(q>=0&&b[q]!==0){if(b[q]===RED){len=-1;break;}chain[len++]=q;q=st[q];}
      if(len<=0)continue;
      var last=chain[len-1],dest=st[last];
      if(dest<0){s.lost[b[last]]++;if(trace)trace.push([last,-1,d]);}
      else{b[dest]=b[last];if(trace)trace.push([last,dest,d]);}
      for(i=len-2;i>=0;i--){var f=chain[i];b[st[f]]=b[f];if(trace)trace.push([f,st[f],d]);}
      b[chain[0]]=0;
    }
    b[p]=c;
  }
  s.moves++;s.last=m;s.toPlay=o;
  if(s.lost[o]>=TARGET)s.winner=c;
  else if(s.lost[c]>=TARGET)s.winner=o;
  else if(s.moves>=MAXMOVES)s.winner=verdict(s);
  else{var empty=false;for(i=0;i<NN;i++)if(b[i]===0){empty=true;break;}if(!empty)s.winner=verdict(s);}
  return true;
}
function genMoves(s){var b=s.b,c=s.toPlay,list=[],p,d;
  for(p=0;p<NN;p++)if(b[p]===0)list.push(p);
  if(s.reds[c]>0&&s.moves>=2){
    for(p=0;p<NN;p++){if(b[p]!==0)continue;
      for(d=0;d<4;d++){var q=step[d][p];if(q>=0&&(b[q]===1||b[q]===2)){list.push(p+REDOFF);break;}}}}
  return list;}

var PV=[-48,-14,6,14,16];
function evalState(s,c){var o=3-c,b=s.b,v=(s.lost[o]-s.lost[c])*1000+(s.reds[c]-s.reds[o])*30;
  for(var p=0;p<NN;p++){var w=b[p];if(w===c)v+=PV[DIST[p]];else if(w===o)v-=PV[DIST[p]];}
  return v;}
var WIN=100000,nodes=0,deadline=0,STOP={};
function terminalScore(s,ply){if(s.winner===3)return 0;return s.winner===s.toPlay?WIN-ply:-WIN+ply;}
function negamax(s,depth,alpha,beta,ply){
  if((++nodes&1023)===0&&Date.now()>deadline)throw STOP;
  if(s.winner)return terminalScore(s,ply);
  if(depth===0)return evalState(s,s.toPlay);
  var ms=genMoves(s),kids=[],i;
  for(i=0;i<ms.length;i++){var t=clone(s);play(t,ms[i]);
    kids.push({t:t,k:t.winner?-terminalScore(t,ply+1):-evalState(t,t.toPlay)});}
  if(!kids.length)return evalState(s,s.toPlay);
  kids.sort(function(a,b){return b.k-a.k;});
  var best=-Infinity;
  for(i=0;i<kids.length;i++){
    var v=-negamax(kids[i].t,depth-1,-beta,-alpha,ply+1);
    if(v>best)best=v;if(v>alpha)alpha=v;if(alpha>=beta)break;}
  return best;}
function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.random()*(i+1)|0,t=a[i];a[i]=a[j];a[j]=t;}return a;}
/* opts : {ms, maxDepth} */
function search(s,opts){
  nodes=0;deadline=Date.now()+opts.ms;
  var root=shuffle(genMoves(s)).map(function(m){var t=clone(s);play(t,m);return{m:m,t:t,v:t.winner?-terminalScore(t,1):-evalState(t,t.toPlay)};});
  root.sort(function(a,b){return b.v-a.v;});
  var bestM=root[0].m,bestV=root[0].v,depthDone=1;
  try{
    for(var depth=2;depth<=opts.maxDepth;depth++){
      var alpha=-Infinity,curBest=null;
      for(var i=0;i<root.length;i++){var r=root[i];
        var v=-negamax(r.t,depth-1,-Infinity,-alpha,1);r.v=v;
        if(v>alpha){alpha=v;curBest=r;}}
      root.sort(function(a,b){return b.v-a.v;});
      bestM=curBest.m;bestV=alpha;depthDone=depth;
      if(Math.abs(alpha)>WIN/2)break;}
  }catch(e){if(e!==STOP)throw e;}
  return{move:bestM,score:bestV,depth:depthDone,nodes:nodes};}

/* Analyse d'un coup joué, à profondeur fixe (pas de limite de temps, sauf filet opts.ms) :
   meilleur coup + sa valeur, valeur exacte du coup joué au même horizon. Scores du point de vue du joueur au trait. */
function analyze(s,played,opts){
  var depth=opts.depth||4;nodes=0;deadline=Date.now()+(opts.ms||20000);
  var best=null,bestV=-Infinity,pv=null;
  try{
    var r=search(s,{ms:opts.ms||20000,maxDepth:depth});best=r.move;bestV=r.score;
    deadline=Date.now()+(opts.ms||20000);
    if(played!=null){var t=clone(s);play(t,played);pv=t.winner?-terminalScore(t,1):-negamax(t,depth-1,-Infinity,Infinity,1);}
  }catch(e){if(e!==STOP)throw e;}
  if(pv!=null&&pv>bestV){bestV=pv;best=played;}
  return{best:best,bestScore:bestV,playedScore:pv};}
return{get N(){return N;},get NN(){return NN;},configure:configure,REDOFF:REDOFF,TARGET:TARGET,MAXMOVES:MAXMOVES,newState:newState,clone:clone,play:play,search:search,analyze:analyze,WIN:WIN};
})();
if(typeof module!=="undefined"&&module.exports)module.exports=Engine;
