/* Web Worker : calcule le coup de l'IA sans bloquer l'interface. */
importScripts('engine.js');
onmessage=function(e){
  var d=e.data,s=d.state;
  Engine.configure(d.n);
  s.b=Int8Array.from(s.b);
  var r=Engine.search(s,d.opts);
  r.gid=d.gid;
  postMessage(r);
};
