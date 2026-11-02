/* Web Worker : calcule le coup de l'IA (et l'analyse de partie) sans bloquer l'interface. */
importScripts('engine.js');
onmessage=function(e){
  var d=e.data,s=d.state;
  Engine.configure(d.n);
  s.b=Int8Array.from(s.b);
  if(d.type==='analyze'){
    var a=Engine.analyze(s,d.played,{depth:d.depth});
    a.type='analyze';a.id=d.id;a.gid=d.gid;
    postMessage(a);return;
  }
  var r=Engine.search(s,d.opts);
  r.gid=d.gid;
  postMessage(r);
};
