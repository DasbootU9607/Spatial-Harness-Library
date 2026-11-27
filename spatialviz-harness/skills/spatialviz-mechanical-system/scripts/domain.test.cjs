'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {generate,verify}=require('./task.cjs'),{figure}=require('./figure.cjs'),{readPlate}=require('./read-plate.cjs'),{solve}=require('./solve.cjs');
const ids=[...require('./catalog.cjs').map(x=>x.id),...require('./design.cjs').original];
const make=(mechanism,direction='CW',extra={})=>generate(119,{mechanism,direction,...extra});
const read=q=>solve(readPlate(figure(q)).geometry).result;
test('Every family has one matching printed choice in both driver senses and at both tooth limits',()=>{
 for(const mechanism of ids)for(const direction of ['CW','CCW'])for(const teeth of [8,64]){
  const q=make(mechanism,direction,{teeth});const plate=readPlate(figure(q)),result=solve(plate.geometry).result;
  const answer=require('./task.cjs').fmt(result,plate.geometry.targets);
  assert.deepEqual(plate.options.map((v,i)=>v===answer?i:-1).filter(i=>i>=0),[q.answer.index],mechanism);
 }
});
test('Cord rethread preserves all upstream connections, changes the image and reverses load travel',()=>{
 const l=make('wind-left'),r=make('wind-right');assert.deepEqual(l.geometry.joints.slice(0,-1),r.geometry.joints.slice(0,-1));
 assert.deepEqual(l.geometry.components,r.geometry.components);assert.deepEqual(read(l),['down']);assert.deepEqual(read(r),['up']);assert.notEqual(figure(l),figure(r));
});
test('Overrun needs a brake; a rigid bypass lowers the same load, while a relay idler lifts it',()=>{
 assert.deepEqual(read(make('clutch-hoist')),['stationary']);assert.deepEqual(read(make('clutch-hoist','CW',{bypass:true})),['down']);assert.deepEqual(read(make('clutch-hoist','CW',{transfer:'idler'})),['up']);
});
test('Planet reference, equal-wheel cancellation and changed tooth count',()=>{
 assert.deepEqual(read(make('sun-drive')),['CCW','CW']);assert.deepEqual(read(make('ring-drive')),['CW','CW']);
 const g=readPlate(figure(make('idler-orbit'))).geometry;assert.deepEqual(solve(g).result,['stationary','CW']);
 g.joints[1].settings.teeth[1]*=2;assert.deepEqual(solve(g).result,['CW','CW']);
});
test('Grounding, connection loss, and inconsistent closed loops',()=>{
 const g=readPlate(figure(make('sun-drive'))).geometry;g.joints.pop();assert.throws(()=>solve(g),/Underdetermined/);
 const h=make('spur').geometry;h.joints.push({kind:'key',ports:['A','B'],settings:{}});assert.throws(()=>solve(h),/Incompatible/);
});
test('Repeated wheel identity carries one tooth count across detail views',()=>{
 const g=readPlate(figure(make('clutch-hoist','CW',{transfer:'idler'}))).geometry;
 g.joints[1].settings.teeth[0]+=1;assert.throws(()=>solve(g),/Inconsistent tooth count/);
});
test('One-sided engagement and common-pin constraints',()=>{
 assert.deepEqual(read(make('lug-start','CCW')),['CW']);assert.deepEqual(read(make('lug-half','CCW')),['CCW']);assert.deepEqual(read(make('lug-half','CW')),['stationary']);
 assert.deepEqual(read(make('grooves')),['CCW']);assert.deepEqual(read(make('cam-like')),['up']);assert.deepEqual(read(make('cam-unlike')),['down']);
 assert.deepEqual(read(make('sliders','CW',{drive:'Q'})),['down-right']);
});
test('A changed key is rejected and a hidden takeoff side cannot be decoded',()=>{
 const q=make('wind-right');q.answer.index=(q.answer.index+1)%4;
 assert.equal(verify(q,{revision:'test'},'v',{}).verdict,'failed');
 assert.throws(()=>readPlate(figure(q).replace('right tangent and carries W.','tangent and carries W.')),/Unreadable/);
});
test('Missing contact and visible slope corruption affect the independently recovered result',()=>{
 const q=make('wind-right');let svg=figure(q).replace('right tangent and carries W.','left tangent and carries W.');
 assert.deepEqual(solve(readPlate(svg).geometry).result,['down']);
 assert.throws(()=>solve(readPlate(figure(q).replace('Keyed shaft','Unmarked part')).geometry),/Underdetermined/);
});