'use strict';
const {solve}=require('./solve.cjs');

const kinds=new Set('gear ring carrier shaft drum crank rocker slider rack weight rotor housing cam groove wheel ratchet arm'.split(' '));
const linear=new Set(['slider','rack','weight']);
const ids=/^[A-Z][A-Z0-9]{0,3}$/;
const intervals={instant:'at the shown instant',turn:'over a complete turn',stroke:'over one outward and return stroke',start:'as the drive accelerates from rest'};
const motionSets={spin:['CW','CCW','stationary','translates'],orbit:['CW','CCW','stationary','translates'],horizontal:['right','left','stationary','rotates'],vertical:['up','down','stationary','rotates'],diagonal:['down-right','up-left','down-left','up-right','stationary'],cycle:['horizontal reciprocation','stationary','continuous rotation','vertical reciprocation']};
function requireThat(ok,message){if(!ok)throw Error(message);}
function keys(object,allowed,label){
 requireThat(object&&typeof object==='object'&&!Array.isArray(object),'Expected '+label+' object');
 for(const k of Object.keys(object))requireThat(allowed.includes(k),'Unknown '+label+' field '+k);
}
function boundedText(v,max,label){requireThat(typeof v==='string'&&v.trim().length>0&&v.length<=max&&!/[\x00-\x1f<>]/.test(v),'Invalid '+label);}
function sameCenter(a,b){return Math.hypot(a.at[0]-b.at[0],a.at[1]-b.at[1])<0.035;}
const forms={
 mesh:['arm'],key:[],sleeve:[],ground:[],'parallel-guide':[],cord:['side'],clutch:['locks'],face:['bank','form'],helix:[],
 'index-tooth':[],roll:[],racks:[],yoke:['radius'],rocker:['radius'],stroke:['radius'],'slide-arm':['rail'],inertia:[],index:['offset','orbit','lever'],cams:['a','b'],grooves:['a','b'],ratchet:[],lug:['phase']
};
function validate(system){
 keys(system,['title','intent','references','members','connections','input','targets','interval','choices'],'system');
 boundedText(system.title,72,'title');boundedText(system.intent,320,'design intent');
 const interval=system.interval??'instant';
 requireThat(Object.hasOwn(intervals,interval),'Unknown observation interval');
 const members=system.members;
 keys(members,Object.keys(members||{}),'members');
 const names=Object.keys(members);
 requireThat(names.length>=2,'An assembly requires at least two members');
 for(const [name,m] of Object.entries(members)){
  requireThat(ids.test(name),'Use a short uppercase body ID: '+name);keys(m,['kind','at','teeth','radius'],'member '+name);
  requireThat(kinds.has(m.kind),'Unknown mechanical body '+m.kind);
  requireThat(Array.isArray(m.at)&&m.at.length===3&&m.at.every(Number.isFinite)&&Number.isInteger(m.at[2]),'Expected [x,y,integer plane] on '+name);
  if(['gear','ring'].includes(m.kind))requireThat(Number.isInteger(m.teeth)&&m.teeth>=6&&m.teeth<=240,name+' needs 6–240 teeth');
  else requireThat(m.teeth===undefined,'Only toothed wheels take teeth');
  if(m.radius!==undefined)requireThat(!m.teeth&&Number.isFinite(m.radius)&&m.radius>0,'Invalid radius on '+name);
  if(m.kind==='drum')requireThat(m.radius>0,'Specify the drum winding radius');
 }
 const g={components:Object.fromEntries(names.map(n=>[n,members[n].kind])),joints:[],driver:system.input?.member,input:system.input?.motion,targets:system.targets,scope:intervals[interval]};
 keys(system.input,['member','motion'],'input');
 requireThat(names.includes(g.driver),'Missing input body');
 requireThat(Array.isArray(system.connections)&&system.connections.length>0,'Specify mechanical connections');
 const edges=[],supports=new Map(),pairs=new Set(),gears=new Set(['gear','ring']);
 for(const conn of system.connections){
  const {kind,ports}=conn;
  requireThat(Object.hasOwn(forms,kind),'Unknown joint '+kind);keys(conn,['kind','ports',...forms[kind]],kind);
  const arity=['ground','parallel-guide'].includes(kind)?1:kind==='index'?3:2;
  requireThat(Array.isArray(ports)&&ports.length===arity&&ports.every(n=>names.includes(n))&&new Set(ports).size===arity,'Invalid ports on '+kind);
  const [a,b,c]=ports,[u,v]=ports.map(n=>members[n]),s={};
  const spin=m=>m&&!linear.has(m.kind);
  const pair=ports.slice().sort().join('/'),pairId=kind+' '+pair;
  requireThat(!pairs.has(pairId),'Duplicate '+pairId);pairs.add(pairId);
  const need=(ok,why)=>requireThat(ok,kind+' '+ports.join('/')+' — '+why);
  const rotary=()=>need(ports.every(n=>spin(members[n])),'rotating ports required');
  const guide=()=>need(spin(u)&&linear.has(v.kind),'rotor to translating follower required');
  switch(kind){
   case 'mesh':{
    need(gears.has(u.kind)&&gears.has(v.kind)&&u.kind!=='ring','order external pinion first');
    const inner=v.kind==='ring',span=(inner?v.teeth-u.teeth:u.teeth+v.teeth)/2;
    need(span>0&&u.at[2]===v.at[2]&&Math.abs(Math.hypot(u.at[0]-v.at[0],u.at[1]-v.at[1])-span)<.035,'pitch circles must be tangent in the same plane (distance '+span+')');
    const arm=conn.arm??'frame';need(arm==='frame'||(members[arm]?.kind==='carrier'&&!ports.includes(arm)),'unknown carrier');
    Object.assign(s,{contact:inner?'inside':'outside',teeth:[u.teeth,v.teeth],arm});
    for(const n of ports){if(!supports.has(n))supports.set(n,new Set());supports.get(n).add(arm);}
    break;
   }
   case 'key':case 'sleeve':case 'clutch':case 'inertia':
    rotary();need(sameCenter(u,v)&&u.at[2]!==v.at[2],'coaxial members require the same x/y in distinct planes');
    if(kind==='clutch'){need(['CW','CCW'].includes(conn.locks),'give locking direction');s.locks=conn.locks;}
    if(kind==='inertia'){need(interval==='start','use the start interval');s.externalTorque=0;}
    break;
   case 'ground':case 'parallel-guide':rotary();break;
   case 'cord':{
    need(u.kind==='drum'&&v.kind==='weight'&&['left','right'].includes(conn.side),'drum to weight and a winding side required');
    need(Math.abs(v.at[0]-u.at[0]-(conn.side==='left'?-1:1)*u.radius)<.035&&u.at[2]===v.at[2]&&v.at[1]>u.at[1]+u.radius,'weight must be below the selected tangent in the drum plane');
    s.side=conn.side;break;
   }
   case 'face':rotary();need(['near','far'].includes(conn.bank)&&['bevel pair','crown and pinion','opposed bevels','left sector','right sector','transfer pinion','double face wheel'].includes(conn.form),'specify contact form and CW tangent bank');Object.assign(s,{bank:conn.bank,form:conn.form});break;
   case 'helix':rotary();s.lead='opposed';break;
   case 'index-tooth':rotary();s.phase='in pocket';break;
   case 'roll':guide();s.rail='below';break;
   case 'racks':need(u.kind==='rack'&&v.kind==='rack','two guided racks required');Object.assign(s,{guide:'SE',normal:'horizontal'});break;
   case 'rocker':case 'stroke':case 'yoke':
    if(kind==='rocker')rotary();else guide();need(conn.radius>0&&Number.isFinite(conn.radius),'positive crank radius required');
    need(kind!=='stroke'||interval==='turn','full turn required');Object.assign(s,{pin:'top',radius:conn.radius});break;
   case 'slide-arm':guide();need(['SE','SW'].includes(conn.rail),'SE or SW rail required');Object.assign(s,{rail:conn.rail,pin:'top'});break;
   case 'index':rotary();for(const n of forms.index){need(Number.isFinite(conn[n])&&conn[n]>0,'positive '+n+' required');s[n]=conn[n];}break;
   case 'cams':case 'grooves':rotary();for(const n of ['a','b']){need(Array.isArray(conn[n])&&conn[n].length===2&&conn[n].every(x=>Number.isFinite(x)&&x>0)&&conn[n][0]!==conn[n][1],'two distinct positive sampled radii required');s[n]=conn[n];}if(kind==='grooves')need(s.a[0]===s.b[0],'common pin must have the same starting radius');break;
   case 'ratchet':rotary();need(interval==='stroke','full stroke required');s.stop='CCW';break;
   case 'lug':rotary();need([0,180].includes(conn.phase),'specify current lug phase');Object.assign(s,{phase:conn.phase,flank:'CCW'});break;
  }
  edges.push([...ports,...(s.arm&&s.arm!=='frame'?[s.arm]:[])]);
  g.joints.push({kind,ports:ports.slice(),settings:s});
 }
 // A ground lock cannot arrest translation of an orbiting axle while leaving its carrier moving.
 for(const [n,arms] of supports){
  const moving=[...arms].filter(a=>a!=='frame'&&!sameCenter(members[a],members[n]));
  requireThat(!moving.length||(arms.size===1&&!g.joints.some(j=>j.kind==='ground'&&j.ports[0]===n)),'Conflicting axle support on '+n);
 }
 for(let i=0;i<names.length;i++)for(const other of names.slice(i+1)){
  const n=names[i],u=members[n],v=members[other];if(!gears.has(u.kind)||!gears.has(v.kind)||u.at[2]!==v.at[2])continue;
  const dist=Math.hypot(u.at[0]-v.at[0],u.at[1]-v.at[1]),mesh=g.joints.some(j=>j.kind==='mesh'&&j.ports.includes(n)&&j.ports.includes(other));
  if(mesh)continue;
  const inner=u.kind==='ring'||v.kind==='ring';const outside=dist>(u.teeth+v.teeth)/2+.04;
  requireThat(outside||(inner&&dist<Math.abs(u.teeth-v.teeth)/2-.04),'Unspecified contact or interference between '+n+' and '+other);
 }
 requireThat(Array.isArray(g.targets)&&g.targets.length>0&&new Set(g.targets.map(t=>t.name)).size===g.targets.length,'Supply distinct named targets');
 function allowed(n){
  const m=members[n];if(!m)return [];
  if(!linear.has(m.kind))return m.kind==='carrier'?['spin','orbit']:['spin'];
  const dirs=new Set();
  for(const j of g.joints){const i=j.ports.indexOf(n);if(i<0)continue;
   if(j.kind==='cord')dirs.add('vertical');if(j.kind==='stroke')dirs.add('cycle');
   if(j.kind==='slide-arm'||j.kind==='racks'&&i===1)dirs.add('diagonal');
   if(['yoke','roll'].includes(j.kind)||j.kind==='racks'&&i===0)dirs.add('horizontal');
  }
  requireThat(dirs.size===1,'Missing or conflicting linear guide on '+n);return [...dirs];
 }
 for(const t of g.targets){keys(t,['name','kind'],'target');requireThat(allowed(t.name).includes(t.kind),'Invalid output quantity on '+t.name);}
 const driveKind=allowed(g.driver)[0];
 requireThat((motionSets[driveKind]||[]).includes(g.input)&&!['stationary','translates','rotates'].includes(g.input),'Input direction is incompatible with its port');
 if(driveKind==='diagonal'){
  const joint=g.joints.find(j=>j.ports[1]===g.driver&&['racks','slide-arm'].includes(j.kind));
  const rail=joint?.settings.rail||joint?.settings.guide;
  requireThat((rail==='SE'?['down-right','up-left']:['down-left','up-right']).includes(g.input),'Driver is off its guide');
 }
 // Projected ratios for direction-only sections must not decide a balance of rates.
 const qualitative=new Set(['helix','face','index-tooth','roll','cord','racks','yoke','rocker','slide-arm','inertia','stroke','ratchet','lug']);
 for(const j of g.joints){
  if(j.kind==='ratchet')requireThat(j.ports[0]===g.driver,'Specify the complete input stroke on the pawl arm');
  if(j.kind==='stroke')requireThat(j.ports[0]===g.driver,'Specify the complete turn on the crank');
  if(j.kind==='inertia')requireThat(j.ports[0]===g.driver&&g.joints.filter(k=>k.ports.includes(j.ports[1])&&k.kind!=='sleeve').length===1,'Free reaction housing must be torque-isolated at startup');
  if(!qualitative.has(j.kind))continue;
  const reached=new Set([j.ports[1]]),rest=g.joints.filter(k=>k!==j&&k.kind!=='sleeve');
  for(let i=0;i<names.length;i++)for(const k of rest){
   const ns=k.settings.arm&&k.settings.arm!=='frame'?[...k.ports,k.settings.arm]:k.ports;
   if(ns.some(n=>reached.has(n)))ns.forEach(n=>reached.add(n));
  }
  requireThat(!reached.has(j.ports[0]),'Qualitative contact cannot close a speed-ratio loop');
  requireThat(!rest.some(k=>k.kind==='index'&&k.ports.some(n=>reached.has(n))),'Magnitude required at the slotted summing lever');
 }
 const seen=new Set([g.driver]);for(let i=0;i<names.length;i++)for(const e of edges)if(e.some(n=>seen.has(n)))e.forEach(n=>seen.add(n));
 requireThat(names.every(n=>seen.has(n)),'Isolated component without a visible mounting');
 requireThat((system.references??[]).every(r=>/^MentalAnimation\/MechanicalSystem\/Level[01]\/(?:[0-9]|[1-3][0-9])$/.test(r)),'Invalid source reference');
 requireThat(Array.isArray(system.choices)&&system.choices.length===4,'Supply four hypotheses, each with a rationale');
 for(const choice of system.choices){keys(choice,['motions','reason'],'choice');boundedText(choice.reason,360,'choice explanation');requireThat(Array.isArray(choice.motions)&&choice.motions.length===g.targets.length&&choice.motions.every((m,i)=>motionSets[g.targets[i].kind].includes(m)),'Invalid choice motion tuple');}
 requireThat(new Set(system.choices.map(c=>JSON.stringify(c.motions))).size===4,'Duplicate options');
 return g;
}
function buildSystem(system,seed){
 requireThat(Number.isSafeInteger(seed),'Integer seed required');
 const g=validate(system),solution=solve(g);
 const choices=system.choices.slice();let state=seed>>>0;
 for(let i=3;i>0;i--){state=(Math.imul(state,1664525)+1013904223)>>>0;const j=Math.floor(state/2**32*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
 const options=choices.map((c,i)=>({label:'ABCD'[i],type:'text',text:c.motions.map((m,j)=>g.targets.length===1?m:g.targets[j].name+' '+m).join(' / ')}));
 const index=choices.findIndex(c=>JSON.stringify(c.motions)===JSON.stringify(solution.result));requireThat(index>=0,'No option matches the physical solution');
 const question='Drive '+g.driver+' '+g.input+'. Determine '+g.targets.map(t=>t.name+' ('+t.kind+')').join(' and ')+' '+g.scope+'.';
 return {schemaVersion:1,title:system.title,description:system.intent,category:'MentalAnimation',taskType:'MechanicalSystem',difficulty:{label:'Unranked',basis:'Author-designed assembly'},geometry:g,assembly:system.members,question,polarity:'positive',options,answer:{index,explanation:solution.trace.join(' '),options:choices.map((c,i)=>({label:'ABCD'[i],explanation:(i===index?'This tuple matches the derived motions. ':g.targets.flatMap((t,k)=>c.motions[k]===solution.result[k]?[]:[t.name+' is '+solution.result[k]+', while this choice gives '+c.motions[k]+'. ']).join(''))+c.reason}))},contract:{answerUnique:true,scope:g.scope},provenance:{sourceKind:'agent-authored',generationMethod:'Spatial Harness mechanical contact schematics',sourceRevision:'c27f9111a2674f2ea03e2ca1f5833326cf1eec1a',series:'system-design',references:system.references??[]}};
}
module.exports={buildSystem,validate,intervals};