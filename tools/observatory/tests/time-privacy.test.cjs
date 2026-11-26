'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const R=require('../runtime.cjs'),P=require('../projection.cjs');
const {withoutAbsoluteTimes,assertNoAbsoluteTimes,hasAbsoluteTime}=require('../time-privacy.cjs');

test('public projection removes nested clocks while retaining durations, counters and source order',()=>{
 const privateData={createdAt:'2026-11-04T06:58:20.526Z',elapsedMs:5216,events:[{id:'e1',seq:1,at:1731111111111,recordedAt:null,details:{scope:'Checked at 2026-11-04T14:58:20+08:00',durationSeconds:5.216}}],facts:[{label:'Requested at',value:'2026-11-04T06:58:20.526Z'},{label:'Tool round-trip (ms)',value:'5216'}],usage:{observedTokens:{total_tokens:123},observations:[{observedAt:'2026-11-04 06:58:20',count:3}]}},before=JSON.stringify(privateData);
 const published=withoutAbsoluteTimes(privateData);assertNoAbsoluteTimes(published);
 assert.equal(JSON.stringify(privateData),before);
 assert.deepEqual(published.events.map(e=>[e.id,e.seq]),[['e1',1]]);
 assert.equal(published.elapsedMs,5216);assert.equal(published.events[0].details.durationSeconds,5.216);
 assert.deepEqual(published.facts,[{label:'Tool round-trip (ms)',value:'5216'}]);
 assert.equal(published.usage.observedTokens.total_tokens,123);
 assert.deepEqual(withoutAbsoluteTimes(published),published);
 assert.throws(()=>assertNoAbsoluteTimes({timestamp:1731111111111}));
 assert.throws(()=>assertNoAbsoluteTimes({note:'2026-11-04T06:58:20.526Z'}));
 assert.throws(()=>assertNoAbsoluteTimes({scope:'From 10:21:33 to 11:03:03 on 2026-10-24'}));
});

test('private collection remains intact while JSON and CSV exports omit absolute times',()=>{
 const root=path.join(R.ROOT,'.harness/tests');fs.mkdirSync(root,{recursive:true});const dir=fs.mkdtempSync(path.join(root,'privacy-'));
 const run=R.start({root:dir,task:path.join(dir,'task.json'),title:'Privacy regression',harness:'spatialviz-harness',binding:{runtime:null,sessionId:'synthetic'},viewer:false});
 R.note(run,{goal:'Recorded at 2026-11-04T06:58:20.526Z',expectedChecks:['No absolute time in public records']});
 const privateBytes=fs.readFileSync(path.join(run,'events.jsonl')),original=R.S.readRun(run),published=P.project(run);
 assert(hasAbsoluteTime(privateBytes.toString()));assertNoAbsoluteTimes(published);
 assert.deepEqual(fs.readFileSync(path.join(run,'events.jsonl')),privateBytes);
 assert.deepEqual(published.events.map(e=>e.id),original.events.map(e=>e.id));
 assert.equal(published.usage.elapsedMs,original.tokenUsage.elapsedMs);
 assert.equal(hasAbsoluteTime(P.csv(published)),false);
 assert.equal(P.csv(published).split('\n')[0].includes('recordedAt'),false);
 assert.equal(published.manifest.sealed,false);
});

test('all checked-in public build files exclude absolute activity times',()=>{
 assert(require('../../redact-public-times.cjs').check()>=70);
});
