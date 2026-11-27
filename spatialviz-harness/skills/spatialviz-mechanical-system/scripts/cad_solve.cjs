'use strict';
const {solve}=require('./solve.cjs');
const match=(value,re)=>{const m=re.exec(value);if(!m)throw Error('Unreadable printed condition: '+value);return m.slice(1)};
function readPrinted(p){
 const [driver,input]=match(p.drive,/^Drive (\w+) (CW|CCW) in the front view\.$/);
 const [list,period]=match(p.ask,/^Find (.+) (at the shown instant|over a complete turn)\.$/);
 const targets=list.split(' and ').map(s=>{const [name,kind]=match(s,/^(\w+) \((frame spin|carried-axle orbit|horizontal travel|vertical travel|cycle)\)$/);return {name,kind:({'frame spin':'spin','carried-axle orbit':'orbit','horizontal travel':'horizontal','vertical travel':'vertical'}[kind]||kind)}});
 const joints=[],components={};const add=(kind,ports,settings={})=>{ports.forEach(x=>components[x]=true);joints.push({kind,ports,settings})};
 const guides=new Set();
 for(const s of p.facts){
  if(s.includes('external mesh')){
   const [a,n,b,m,arm]=match(s,/^(\w+) (\d+)T \/ (\w+) (\d+)T : external mesh on (\w+)\.$/);
   if(arm!=='frame')components[arm]=true;add('mesh',[a,b],{teeth:[+n,+m],contact:'outside',arm});
  }else if(s.includes('keyed'))add('key',match(s,/^(\w+) and (\w+) are keyed to one shaft\.$/));
  else if(s.includes('taut')){const [w,side,d]=match(s,/^(\w+) hangs from the taut (left|right) tangent of (\w+)\.$/);add('cord',[d,w],{side});}
  else if(s.includes('bolted'))add('ground',match(s,/^(\w+) is bolted to the fixed frame\.$/));
  else if(s.startsWith('Top pin'))add(period==='over a complete turn'?'stroke':'yoke',match(s,/^Top pin on (\w+) runs in the vertical slot of (\w+)\.$/),{pin:'top'});
  else if(s.startsWith('Two horizontal'))guides.add(match(s,/^Two horizontal frame guides locate (\w+)\.$/)[0]);
  else throw Error('Unrecognized printed connection: '+s);
 }
 for(const j of joints)if(['yoke','stroke'].includes(j.kind)&&!guides.has(j.ports[1]))throw Error('Missing frame guide');
 const solved=solve({components,joints,driver,input,targets});
 const expected=solved.result.map((v,i)=>targets.length===1?v:targets[i].name+' '+v).join(' / ');
 const options=p.options.map((s,i)=>{const [l,v]=match(s,/^([A-D])  (.+)$/);if(l!=='ABCD'[i])throw Error('Printed option order');return {label:l,text:v,matches:v===expected}});
 if(new Set(options.map(o=>o.text)).size!==4||options.filter(o=>o.matches).length!==1)throw Error('The final sheet must have one matching option');
 return {driver,input,targets,joints,result:solved.result,trace:solved.trace,options,index:options.findIndex(o=>o.matches)};
}
module.exports={readPrinted};
