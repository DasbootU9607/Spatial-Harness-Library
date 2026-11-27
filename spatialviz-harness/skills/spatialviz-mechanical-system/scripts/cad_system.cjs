'use strict';
const {buildSystem}=require('./system.cjs');
const {readPrinted}=require('./cad_solve.cjs');
const supported=new Set(['mesh','key','ground','cord','yoke','stroke']);
function prepare(system,seed){
 if(!system||!system.cad)throw Error('A formal system requires cad.moduleMm and cad.tiltDeg.');
 const original=structuredClone(system),{cad,...design}=structuredClone(system);
 if(Object.keys(cad).some(k=>!['moduleMm','tiltDeg'].includes(k))||!Number.isFinite(cad.moduleMm)||cad.moduleMm<1||cad.moduleMm>4||!Number.isFinite(cad.tiltDeg)||cad.tiltDeg<0||cad.tiltDeg>55)throw Error('CAD module must be 1–4 mm and view tilt 0–55 degrees');
 for(const j of design.connections||[]){
  if(!supported.has(j.kind))throw Error('No FreeCAD construction for '+j.kind);
  if(j.kind==='cord'){
   const [d,w]=j.ports.map(n=>design.members[n]);
   if(d&&w&&w.at[0]===null)w.at[0]=d.at[0]+(j.side==='left'?-1:1)*d.radius;
  }
 }
 for(const [n,v] of Object.entries(design.members||{})){
  if(!['gear','crank','carrier','weight','slider','drum'].includes(v.kind))throw Error('No FreeCAD body for '+v.kind);
  if(v.kind==='gear'&&(v.teeth<12||v.teeth>90))throw Error('Use 12–90 teeth in this native profile range.');
  if(v.at[2]<0||v.at[2]>5)throw Error('Mount '+n+' in an axial plane from 0 through 5.');
 }
 if(!['CW','CCW'].includes(design.input.motion))throw Error('Native front-view driver requires CW or CCW');
 const q=buildSystem(design,seed);
 const actual={...design,cad};const t=q.geometry.targets;
 const worksheet={title:q.title,members:Object.keys(design.members),drive:'Drive '+q.geometry.driver+' '+q.geometry.input+' in the front view.',
  ask:'Find '+t.map(x=>x.name+' ('+({orbit:'carried-axle orbit',spin:'frame spin',horizontal:'horizontal travel',vertical:'vertical travel'}[x.kind]||x.kind)+')').join(' and ')+' '+q.geometry.scope+'.',options:q.options};
 return {original,actual,q,worksheet};
}
module.exports={prepare,readPrinted};
