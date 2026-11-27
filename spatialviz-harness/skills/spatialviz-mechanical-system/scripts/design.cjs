'use strict';
const catalog=require('./catalog.cjs');
const original=['wind-left','wind-right','clutch-hoist'];
const spin=v=>v>0?'CW':v<0?'CCW':'stationary';
const travel=(v,pos,neg)=>v>0?pos:v<0?neg:'stationary';
function design(seed,p={}){
 if(!Number.isSafeInteger(seed))throw Error('Supply an integer seed');
 let state=seed>>>0;
 function pick(n){state=(Math.imul(state,1664525)+1013904223)>>>0;return Math.floor(state/4294967296*n);}
 const id=p.mechanism||'spur',entry=catalog.find(e=>e.id===id);
 if(!entry&&!original.includes(id))throw Error('Unknown mechanism '+id);
 if(Object.keys(p).some(k=>!['mechanism','direction','teeth','stage','bypass','drive','ratio','transfer'].includes(k)))throw Error('Unknown design parameter');
 const sense=p.direction||['CW','CCW'][pick(2)],d=sense==='CW'?1:-1;
 const n=p.teeth??(12+2*pick(12)),m=p.ratio??(2+pick(3));
 if(!['CW','CCW'].includes(sense)||!Number.isInteger(n)||n<8||n>64||!Number.isInteger(m)||m<2||m>4)throw Error('Invalid direction, teeth or ratio');
 if(p.transfer!==undefined && (id!=='clutch-hoist'||!['direct','idler'].includes(p.transfer)))throw Error('Invalid transfer');
 if(p.stage!==undefined&&!['lug-start','lug-half'].includes(id)||p.bypass!==undefined&&(id!=='clutch-hoist'||typeof p.bypass!=='boolean')||p.drive!==undefined&&(id!=='sliders'||!['P','Q'].includes(p.drive)))throw Error('Parameter does not apply to this mechanism');
 const joints=[],components={},targets=[],expected=[];
 const member=(name,kind='wheel')=>{components[name]=kind;return name};
 const j=(kind,ports,settings={})=>joints.push({kind,ports,settings});
 let driver='A',input=sense,scope='at the shown instant';
 const ask=(name,v,kind='spin')=>{targets.push({name,kind});expected.push(v)};
 const wheel=(...names)=>names.forEach(x=>member(x));
 const mesh=(a,b,inside=false,arm='frame',na=n,nb=n*m)=>j('mesh',[a,b],{teeth:[na,nb],contact:inside?'inside':'outside',arm});
 const key=(a,b)=>j('key',[a,b]);
 const face=(a,b,bank)=>j('face',[a,b],{bank,form:({'face-left':'left sector','face-right':'right sector','opposed-bevel':'opposed bevels',bevel:'bevel pair',crown:'crown and pinion',opposed:'double face wheel','face-train':'transfer pinion'})[id]});
 const cord=(a,b,side)=>j('cord',[a,b],{side});
 if(['sun-drive','ring-drive','index-arm'].includes(id)){
  wheel('S','P','R');member('H','carrier');mesh('S','P',false,'H',n,n);mesh('P','R',true,'H',n,3*n);
  const fixed=id==='ring-drive'?'S':'R';j('ground',[fixed]);driver=id==='sun-drive'?'S':id==='ring-drive'?'R':'H';
  if(id==='index-arm'){member('J','slotted rotor');j('index',['P','H','J'],{offset:1.5*n,orbit:2*n,lever:n});ask('J',spin(-d));}
  else {ask('P',spin(id==='sun-drive'?-d:d));ask('H',spin(d),'orbit');}
 }else if(id==='idler-orbit'||id==='twin-planets'){
  wheel('A','B','C');member('H','carrier');
  if(id==='idler-orbit'){mesh('A','B',false,'H',n,n);mesh('B','C',false,'H',n,n);j('ground',['A']);driver='B';}
  else {mesh('A','B',true,'H',n,4*n);mesh('C','B',true,'H',n,4*n);j('parallel-guide',['A']);driver='B';}
  ask('C','stationary');ask('H',spin(d),'orbit');
 }else if(id==='orbit-shaft'){
  wheel('A','B');member('H','carrier');member('K','pointer');mesh('A','B',false,'H');j('ground',['A']);key('B','K');driver='H';ask('K',spin(d));
 }else if(id==='ratchet'){
  member('A','oscillating arm');member('B','ratchet');j('ratchet',['A','B'],{stop:'CCW'});scope='over one outward and return stroke';ask('B','CW');
 }else if(['face-left','face-right','bevel','crown','face-train','opposed','opposed-bevel'].includes(id)){
  wheel('A','B');const first=['face-right','face-train','opposed','opposed-bevel'].includes(id)?'near':'far';
  face('A','B',first);let v=first==='near'?d:-d;
  if(id.startsWith('face-')&&id!=='face-train'){member('K','shaft');key('B','K');ask('K',spin(v));}
  else if(id==='face-train'){wheel('C');face('B','C','far');ask('C',spin(-v));}
  else if(id.startsWith('opposed')){wheel('C');face('A','C','far');ask('B',spin(v));ask('C',spin(-d));}
  else ask('B',spin(v));
 }else if(id==='rolling'){
  member('A');member('X','wheel center');j('roll',['A','X'],{rail:'below'});ask('X',travel(d,'right','left'),'horizontal');ask('A',spin(d));
 }else if(id==='cross-racks'){
  member('A','horizontal rack');member('B','inclined rack');input=travel(d,'right','left');j('racks',['A','B'],{guide:'SE',normal:'horizontal'});ask('B',travel(d,'down-right','up-left'),'diagonal');
 }else if(['worm-relay','helical-relay'].includes(id)){
  wheel('A','B','K','I','C');key('A','K');mesh('A','B');j('helix',['K','I'],{lead:'opposed'});
  let relay='I';if(id==='helical-relay'){member('J','shaft pinion');key('I','J');relay='J';}
  j('helix',[relay,'C'],{lead:'opposed'});ask('B',spin(-d));ask('C',spin(d));
 }else if(['spur','inside','intermittent','ring-relay','coaxial'].includes(id)){
  wheel('A','B');const inside=['inside','ring-relay'].includes(id);
  if(id==='intermittent')j('index-tooth',['A','B'],{phase:'in pocket'});else mesh('A','B',inside,'frame',n,n*m);
  if(id==='coaxial'){wheel('K','C');key('A','K');wheel('I');mesh('K','I');mesh('I','C',false,'frame',n*m,n*m);ask('B',spin(-d));ask('C',spin(d));}
  else if(id==='ring-relay'){wheel('C');mesh('C','B',true,'frame',n+2,n*m);ask('C',spin(d));}
  else ask('B',spin(inside?d:-d));
 }else if(['stroke','yoke','rocker'].includes(id)){
  member('A','crank');member('B',id==='rocker'?'rocker':'slider');
  j(id,['A','B'],{pin:'top',radius:n});if(id==='stroke')scope='over a complete turn';
  ask('B',id==='stroke'?'horizontal reciprocation':id==='rocker'?spin(d):travel(d,'right','left'),id==='stroke'?'cycle':id==='rocker'?'spin':'horizontal');
 }else if(id==='reaction'){
  member('A','rotor pack');member('B','free housing');j('inertia',['A','B'],{externalTorque:0});scope='as the balanced rotor pack starts accelerating';ask('B',spin(-d));
 }else if(id==='sliders'){
  member('P','slider');member('Q','slider');wheel('A','B');mesh('A','B');
  j('slide-arm',['A','P'],{rail:'SE',pin:'top'});j('slide-arm',['B','Q'],{rail:'SW',pin:'top'});
  driver=p.drive||'P';const target=driver==='P'?'Q':'P';
  input=driver==='P'?travel(d,'down-right','up-left'):travel(d,'down-left','up-right');
  ask(target,driver==='P'?travel(d,'down-left','up-right'):travel(d,'down-right','up-left'),'diagonal');
 }else if(id.startsWith('lug-')){
  member('A','sweep arm');wheel('B','C');mesh('B','C');
  const phase=p.stage??(id==='lug-start'?0:180);if(![0,180].includes(phase))throw Error('Stage must be 0 or 180');
  j('lug',['A',phase===0?'B':'C'],{phase,flank:'CCW'});ask('C',d>0?'stationary':phase===0?'CW':'CCW');
 }else if(id.startsWith('cam-')||id==='grooves'){
  wheel('A','B');const second=id==='cam-unlike'?1:-1;
  j(id==='grooves'?'grooves':'cams',['A','B'],{a:[n,n+2],b:id==='grooves'?[n,n+2*second]:[n+5,n+5+2*second]});
  if(id==='grooves')ask('B',spin(-d));else{member('W','weight');cord('B','W','left');ask('W',travel(-second*d,'up','down'),'vertical');}
 }else{
  wheel('A','B');member('D','drum');member('W','weight');if(p.transfer==='idler'){wheel('I');mesh('A','I');mesh('I','B',false,'frame',n*m,n);}else mesh('A','B');
  if(id==='clutch-hoist'&&!p.bypass)j('clutch',['B','D'],{locks:'CW'});else key('B','D');
  const side=id==='wind-right'?'right':'left';cord('D','W',side);
  const shaft=p.transfer==='idler'?d:-d;
  const v=id==='clutch-hoist'&&!p.bypass?Math.max(shaft,0):shaft;
  ask('W',travel(side==='left'?v:-v,'up','down'),'vertical');
 }
 return {id,entry,expected,geometry:{components,joints,driver,input,targets,scope},pick};
}
module.exports={design,original};