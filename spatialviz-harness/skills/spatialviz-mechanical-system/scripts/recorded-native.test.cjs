'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{test}=require('node:test'),assert=require('node:assert/strict');
const {readNative}=require('./read-native.cjs');
test('Shipped FCStd and viewport bytes match the measured assembly, and each shipped PNG alone gives its published answer',()=>{
 const root=path.resolve(__dirname,'../../../..'),cases=require(path.join(root,'catalog/cases.json')).cases;
 let count=0;
 for(const c of cases.filter(c=>c.harnessId==='spatialviz-harness'&&c.taskType==='MechanicalSystem')){
  const site=path.join(root,c.harnessId,'site'),file=path.join(site,c.taskArtifact),q=JSON.parse(fs.readFileSync(file));if(q.provenance.generationMethod!=='Spatial Harness original FreeCAD assembly')continue;
  const dir=path.dirname(file),n=q.provenance.native;count++;
  for(const [name,expected] of [['assembly.FCStd',n.modelSha256],['geometry.json',n.geometrySha256],['front-view.png',n.frontViewSha256],['assembly-view.png',n.assemblyViewSha256]]){
   const bytes=fs.readFileSync(path.join(dir,name));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),expected);
   if(name.endsWith('FCStd'))assert.equal(bytes.subarray(0,2).toString(),'PK');
  }
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'system.json'))),q.generator.parameters.system);
  const decoded=readNative(path.join(site,c.thumbnail));assert.equal(decoded.index,q.answer.index);assert.equal(decoded.options.filter(o=>o.matches).length,1);
 }
 assert.ok(count>=4,'The published representative assemblies must be present');
});
