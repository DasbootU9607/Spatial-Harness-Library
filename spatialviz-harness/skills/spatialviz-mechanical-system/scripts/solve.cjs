'use strict';
// Assemble instantaneous constraints in the stationary observer's frame.
// The solver has no dependency on the construction catalog, seed or stored key.
const sign=v=>Math.abs(v)<1e-8?0:Math.sign(v);
function solve(g){
 const names=Object.keys(g.components), rows=[], rules=[];
 const idx=n=>{const i=names.indexOf(n);if(i<0)throw Error('Unknown member '+n);return i};
 const equation=(terms,rhs=0)=>{const row=Array(names.length+1).fill(0);for(const [name,k] of terms)row[idx(name)]+=k;row[names.length]=rhs;rows.push(row)};
 const positive=['CW','right','down-right','down-left'],negative=['CCW','left','up-left','up-right'];
 if(!positive.includes(g.input)&&!negative.includes(g.input))throw Error('Unspecified driver sense');
 const direction=positive.includes(g.input)?1:-1;
 equation([[g.driver,1]],direction);
 const nonlinear=[],toothCounts=new Map();
 for(const j of g.joints){
  const [a,b,c]=j.ports,s=j.settings;let reason;
  const ratio=(v)=>equation([[b,1],[a,-v]]);
  switch(j.kind){
   case 'mesh':{
    const [x,y]=s.teeth,k=s.contact==='outside'?1:-1;
    if(!(x>0&&y>0)||!['outside','inside'].includes(s.contact)||(k<0&&x>=y))throw Error('Incompatible pitch circles');
    for(const [wheel,count] of [[a,x],[b,y]]){if(toothCounts.has(wheel)&&toothCounts.get(wheel)!==count)throw Error('Inconsistent tooth count on '+wheel);toothCounts.set(wheel,count);}
    const t=[[a,x],[b,k*y]];
    if(s.arm!=='frame')t.push([s.arm,-(x+k*y)]);
    equation(t);reason=(s.contact==='outside'?'External':'Internal')+' mesh '+a+'/'+b+' ('+x+'/'+y+' teeth) '+(s.arm==='frame'?'has fixed centers.':'uses spins relative to carrier '+s.arm+'.');break;
   }
   case 'parallel-guide':equation([[a,1]]);reason='The parallel linkage holds the orientation of '+a+' while its center travels on the arm.';break;
   case 'ground':equation([[a,1]]);reason=a+' is locked to the frame.';break;
   case 'key':ratio(1);reason='The solid key makes '+a+' and '+b+' rotate together.';break;
   case 'helix':ratio(-1);reason='Equal flank-normal speeds on the two unwrapped pitch surfaces require opposite rotation, since their CW motions cross a tooth in opposite senses.';break;
   case 'face':ratio(s.bank==='near'?1:-1);reason='At the tooth section the two rim tangents must coincide. The marked CW tangents '+(s.bank==='near'?'agree.':'oppose one another.');break;
   case 'index-tooth':ratio(-1);reason='The driving tooth is inside the follower pocket. The two external pitch arcs roll in opposite senses.';break;
   case 'roll':ratio(s.rail==='below'?1:-1);reason='The bottom contact has zero ground velocity. The center cancels the rotational velocity there.';break;
   case 'cord':ratio(s.side==='left'?1:-1);reason='The taut line follows the '+s.side+' tangent of drum '+a+'; CW there is '+(s.side==='left'?'up.':'down.');break;
   case 'racks':ratio(1);reason='Both engaged flanks have a horizontal normal. Matching horizontal speed fixes the sense along the oblique guide.';break;
   case 'stroke':ratio(1);reason='The captive pin sweeps both horizontal extremes each turn. The yoke stays on its horizontal guide.';break;
   case 'yoke':case 'rocker':ratio(s.pin==='top'?1:-1);reason='The top crank pin sweeps right under CW drive. The slot takes the transverse component '+(j.kind==='rocker'?'above the rocker pivot.':'along the horizontal slide.');break;
   case 'slide-arm':ratio((s.pin==='top'?1:-1)*(s.rail==='SE'?1:-1));reason='At '+s.pin+' dead vertical, the radial slot transmits horizontal velocity to the '+s.rail+' guide.';break;
   case 'index':equation([[c,s.lever],[a,-s.offset],[b,-s.orbit]]);reason='Add pin spin times its offset ('+s.offset+') to the moving axle speed (carrier rate times '+s.orbit+'). The radial output slot takes this tangential sum.';break;
   case 'inertia':ratio(-1);reason='With zero applied torque about the free axis, the housing must acquire angular momentum opposite to the driven pack.';break;
   case 'cams':case 'grooves':{
    const da=s.a[1]-s.a[0],db=s.b[1]-s.b[0];if(!da||!db)throw Error('Singular profile contact');
    ratio((j.kind==='cams'?-1:1)*da/db);
    reason='One positive angular increment changes the sampled radii by '+da+' and '+db+' mm. '+(j.kind==='cams'?'The two radii must sum to the fixed center distance.':'Both grooves must reach the same translating pin displacement.');break;
   }
   case 'ratchet':equation([[b,1]],1);reason='At least one drive stroke catches a steep tooth face. The holding pawl blocks CCW retreat over the return stroke.';break;
   case 'lug':case 'clutch':nonlinear.push(j);reason=j.kind==='lug'?'At the displayed phase only '+b+' presents a lug. CCW pushes its square face; CW retreats and the detent holds.':'The clutch locks for CW input. Its brake holds the loaded drum when the clutch overruns.';break;
   default:throw Error('Unknown connection '+j.kind);
  }
  rules.push({ports:j.ports,reason});
 }
 function reduce(){
  const mat=rows.map(r=>r.slice()),N=names.length,pivots=[];let p=0;
  for(let col=0;col<N;col++){
   const i=mat.findIndex((r,i)=>i>=p&&sign(r[col]));if(i<0)continue;
   [mat[p],mat[i]]=[mat[i],mat[p]];const v=mat[p][col];mat[p]=mat[p].map(x=>x/v);
   for(let k=0;k<mat.length;k++)if(k!==p){const f=mat[k][col];mat[k]=mat[k].map((x,j)=>x-f*mat[p][j]);}
   pivots.push(col);p++;
  }
  if(mat.some(r=>r.slice(0,N).every(v=>!sign(v))&&sign(r[N])))throw Error('Incompatible constraints');
  const result={};pivots.forEach((c,i)=>{if(mat[i].slice(0,N).every((v,j)=>j===c||!sign(v)))result[names[c]]=mat[i][N]});return result;
 }
 let values=reduce();
 while(nonlinear.length){
  const k=nonlinear.findIndex(j=>Number.isFinite(values[j.ports[0]]));if(k<0)throw Error('Undetermined engagement');
  const [j]=nonlinear.splice(k,1),[a,b]=j.ports,active=j.kind==='clutch'?values[a]>0:values[a]<0;
  equation([[b,1],[a,active?-1:0]]);values=reduce();
 }
 const motion=(name,kind)=>{
  if(!Object.hasOwn(values,name))throw Error('Underdetermined '+name);
  const s=sign(values[name]);if(!s)return 'stationary';
  const dirs={orbit:['CW','CCW'],spin:['CW','CCW'],horizontal:['right','left'],vertical:['up','down'],cycle:['horizontal reciprocation','horizontal reciprocation']};
  if(kind==='diagonal'){const rail=g.joints.find(j=>['racks','slide-arm'].includes(j.kind)&&j.ports[1]===name);if(!rail)throw Error('Missing guide');dirs.diagonal=(rail.settings.rail||rail.settings.guide)==='SE'?['down-right','up-left']:['down-left','up-right'];}
  return dirs[kind][s>0?0:1];
 };
 const result=g.targets.map(t=>motion(t.name,t.kind));
 const frameNotes=g.joints.filter(j=>j.kind==='mesh'&&j.settings.arm!=='frame').map(j=>{const [a,b]=j.ports,s=j.settings,k=s.contact==='outside'?'+':'−';return s.teeth[0]+' × ('+a+' − '+s.arm+') '+k+' '+s.teeth[1]+' × ('+b+' − '+s.arm+') = 0.';});
 const trace=['Drive '+g.driver+' '+g.input+'.',...rules.map(r=>r.reason+' '+r.ports.map(n=>n+' '+(values[n]===undefined?'free':sign(values[n])===0?'held':sign(values[n])>0?'positive':'negative')).join(', ')+'.'),...frameNotes,'The requested motion is '+result.join(' / ')+ ' (in listed output order).'];
 return {result,trace,values};
}
module.exports={solve};