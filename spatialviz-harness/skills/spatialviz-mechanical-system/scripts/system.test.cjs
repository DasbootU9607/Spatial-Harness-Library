'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {generate,verify}=require('./task.cjs'),{figure}=require('./figure.cjs'),{inspect}=require('./inspect.cjs');
const joint=(kind,...ports)=>({kind,ports});
const gear=(x,y,plane,teeth)=>({kind:'gear',at:[x,y,plane],teeth});
const fixture=()=>({title:'Travel at a winding line',intent:'Distinguish pitch contact from torque transmission at a hub.',members:{A:gear(0,0,0,20),B:gear(30,0,0,40),D:{kind:'drum',at:[30,0,1],radius:10},W:{kind:'weight',at:[40,24,1]}},connections:[joint('mesh','A','B'),joint('key','B','D'),{...joint('cord','D','W'),side:'right'}],input:{member:'A',motion:'CW'},targets:[{name:'W',kind:'vertical'}],choices:['up','down','stationary','rotates'].map(m=>({motions:[m],reason:'Test the winding line hypothesis '+m+'.'}))});
function picture(s,seed=33){return figure(generate(seed,{system:s}));}
test('Authored contact sections decode from the plate across shafts, guides, profiles and one-sided engagements',()=>{
 const rows=[
  ['face','wheel','wheel','spin','CCW',{bank:'far',form:'crown and pinion'}],['helix','wheel','wheel','spin','CCW',{}],
  ['index-tooth','wheel','wheel','spin','CCW',{}],['roll','wheel','slider','horizontal','right',{}],['racks','rack','rack','diagonal','down-right',{}],
  ['yoke','crank','slider','horizontal','right',{radius:6}],['rocker','crank','rocker','spin','CW',{radius:6}],
  ['stroke','crank','slider','cycle','horizontal reciprocation',{radius:6},'turn'],['slide-arm','arm','slider','diagonal','up-right',{rail:'SW'}],
  ['inertia','rotor','housing','spin','CCW',{},'start'],['ratchet','arm','ratchet','spin','CW',{},'stroke'],
  ['lug','arm','wheel','spin','stationary',{phase:180}],['cams','cam','cam','spin','CW',{a:[22,23],b:[29,28]}],
  ['grooves','groove','groove','spin','CCW',{a:[23,22],b:[23,24]}]
 ];
 for(const [kind,first,second,quantity,result,fields,interval='instant'] of rows){
  const coax=kind==='inertia',s=fixture();
  s.members={A:{kind:first,at:[0,0,0]},B:{kind:second,at:coax?[0,0,1]:[20,0,0]}};
  s.connections=[{...joint(kind,'A','B'),...fields}];s.interval=interval;s.input.motion=kind==='racks'?'right':'CW';s.targets=[{name:'B',kind:quantity}];
  const options={spin:['CW','CCW','stationary','translates'],horizontal:['right','left','stationary','rotates'],diagonal:['down-right','up-left','up-right','down-left'],cycle:['horizontal reciprocation','vertical reciprocation','stationary','continuous rotation']};
  s.choices=options[quantity].map(v=>({motions:[v],reason:'Compare the observed motion to '+v+'.'}));
  assert.deepEqual(inspect(picture(s)).result,[result],kind);
 }
});
test('Authored input has no selector or supplied key and rotates option placement reproducibly',()=>{
 const s=fixture();assert.deepEqual(inspect(picture(s)).result,['up']);assert.equal(picture(s),picture(s));
 assert.notDeepEqual(inspect(picture(s,3001)).choices,inspect(picture(s,8046)).choices);
 const q=generate(12,{system:s}),identity={revision:'test'};for(const k of ['generator','rendering','verifier'])q[k]=identity;
 assert.equal(verify(q,identity,'v1',{},figure(q)).verdict,'passed');
 q.answer.index=(q.answer.index+1)%4;assert.equal(verify(q,identity,'v1',{},figure(q)).verdict,'failed');
});
test('Changing a single connection to an overrunning hub changes both printed figure and derived output',()=>{
 const a=fixture(),b=structuredClone(a);b.connections[1]={...joint('clutch','B','D'),locks:'CW'};
 assert.deepEqual(inspect(picture(a)).result,['up']);assert.deepEqual(inspect(picture(b)).result,['stationary']);assert.notEqual(picture(a),picture(b));
 b.connections[1].locks='CCW';assert.deepEqual(inspect(picture(b)).result,['up']);
});
test('Missing contact proof, displaced flag or conflicting visible tangent fails without consulting a spec',()=>{
 const svg=picture(fixture());
 assert.throws(()=>inspect(svg.replace('right tangent and carries W.','left tangent and carries W.')),/side/);
 assert.throws(()=>inspect(svg.replace('Solid key joins both hubs.','Unspecified hub mounting.')),/Missing key/);
 assert.throws(()=>inspect(svg.replace('stroke="#688681"','stroke="none"')),/pitch circles/);
 assert.throws(()=>inspect(svg.replace('stroke="#a04418" stroke-width="1.3"','stroke="none"')),/flag/);
});
test('Underconstrained sleeves and impossible or ambiguous placements fail before acceptance',()=>{
 const s=fixture();s.connections[1].kind='sleeve';assert.throws(()=>picture(s),/Underdetermined/);
 s.connections[1].kind='key';s.members.B.at[0]++;assert.throws(()=>picture(s),/pitch/);
 s.members.B.at[0]--;s.members.W.at[0]--;assert.throws(()=>picture(s),/tangent/);
});
test('Free same-axis hubs may have independently established motions',()=>{
 const s=fixture();s.connections[1].kind='sleeve';s.connections.push(joint('ground','D'));assert.deepEqual(inspect(picture(s)).result,['stationary']);
});
test('Installed authors’ recorded systems retain the reference-frame result and one-field intervention',()=>{
 const frame=require('../assets/systems/frame.json'),before=require('../assets/systems/before.json'),after=require('../assets/systems/after.json');
 const baseline=inspect(picture(frame,311));assert.deepEqual(baseline.result,['CCW','CCW']);
 assert.ok(Math.abs(baseline.values.P+2/9)<1e-9);assert.ok(Math.abs(baseline.values.H+2/3)<1e-9);
 const edited=structuredClone(before);edited.connections[0].bank='near';assert.deepEqual(edited,after);
 const pre=inspect(picture(before,419)),post=inspect(picture(after,419));
 assert.deepEqual(pre.choices.map(c=>c.value),post.choices.map(c=>c.value));
 assert.deepEqual(pre.result,['stationary','right']);assert.deepEqual(post.result,['CW','right']);
 assert.notEqual(pre.values.B,post.values.B);assert.equal(pre.values.K,post.values.K);
});
test('The selected face seat must agree with the tangent arrows and the assembly contact',()=>{
 const s=fixture();s.members={A:{kind:'wheel',at:[0,0,0]},B:{kind:'wheel',at:[0,20,0]}};
 s.connections=[{...joint('face','A','B'),bank:'near',form:'double face wheel'}];s.targets=[{name:'B',kind:'spin'}];
 s.choices=['CW','CCW','stationary','translates'].map(x=>({motions:[x],reason:'Hypothesis '+x}));
 const a=picture(s);assert.deepEqual(inspect(a).result,['CW']);
 assert.throws(()=>inspect(a.replace('B CW  →','B CW  ←')),/seat/);
 s.connections[0].bank='far';assert.deepEqual(inspect(picture(s)).result,['CCW']);
});
test('Authored input refuses an answer field, duplicate options, impossible target and missing correct tuple',()=>{
 const s=fixture();s.answer=0;assert.throws(()=>picture(s),/Unknown system field/);delete s.answer;
 s.choices[0]=s.choices[1];assert.throws(()=>picture(s),/Duplicate/);
 const t=fixture();t.targets[0].kind='spin';assert.throws(()=>picture(t),/Invalid output/);
 const u=fixture();u.targets.unshift({name:'D',kind:'spin'});for(const c of u.choices)c.motions.unshift('stationary');assert.throws(()=>picture(u),/No option/);
});
