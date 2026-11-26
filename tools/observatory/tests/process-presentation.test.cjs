'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const R=require('../runtime.cjs');
const model=import('data:text/javascript;base64,'+fs.readFileSync(path.join(R.ROOT,'shared/process-model.js')).toString('base64'));

test('process presentation retains every published record and version without changing evidence',async()=>{
 const {timelineEvents,versionResult}=await model;
 for(const c of R.read(path.join(R.ROOT,'catalog/cases.json')).cases){
  const p=R.read(path.join(R.ROOT,c.harnessId,'site',c.process)),original=JSON.stringify(p),nodes=timelineEvents(p);
  assert.deepEqual(nodes.map(n=>n.id),p.events.map(e=>e.id));
  assert.deepEqual(nodes.map(n=>n.ordinal),p.events.map(e=>e.seq));
  const final=p.candidates.find(c=>c.id===p.manifest.finalCandidateId);
  assert.equal(versionResult(p,final),'passed');
  assert(nodes.some(n=>n.isKey&&p.events.find(e=>e.id===n.id)?.candidateId===final.id));
  assert.equal(JSON.stringify(p),original);
 }
});

test('version verdicts require the exact candidate and fingerprint, including later failures',async()=>{
 const {versionResult}=await model,candidate={id:'v1',sha256:'current'};
 const tests=[{candidateId:'v1',testedFingerprints:{specification:'old'},verdict:'passed'},{candidateId:'v2',testedFingerprints:{specification:'current'},verdict:'passed'}];
 assert.equal(versionResult({tests},candidate),'unknown');
 tests.push({candidateId:'v1',testedFingerprints:{specification:'current'},verdict:'passed'});
 assert.equal(versionResult({tests},candidate),'passed');
 tests.push({candidateId:'v1',testedFingerprints:{specification:'current'},verdict:'failed'});
 assert.equal(versionResult({tests},candidate),'failed');
});

test('successful command exit does not replace a failed or unknown verification',async()=>{
 const {timelineEvents}=await model;
 const nodes=timelineEvents({events:[{id:'start',seq:1,type:'command.started',details:{}},{id:'exit',seq:2,type:'command.completed',details:{exitCode:0}},{id:'report',seq:3,type:'test.completed',details:{verdict:'failed',checks:[]}},{id:'future',seq:4,type:'future.event',details:{}}]});
 assert.equal(nodes[0].status,null);
 assert.equal(nodes[1].statusLabel,'Process exited 0');
 assert.equal(nodes[2].status,'failed');
 assert.equal(nodes[2].isKey,true);
 assert.equal(nodes[3].status,null);
});
