'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const R=require('../runtime.cjs'),{validate}=require('../../schema.cjs');
test('event schema accepts unknown future types and null occurrence times without dropping identity',()=>{const schema=R.read(path.join(R.ROOT,'shared/schemas/event.schema.json'));const event={id:'e000001',seq:1,runId:'test',at:null,recordedAt:new Date().toISOString(),type:'future.event',actor:'tool',origin:'historical',actionId:null,candidateId:null,details:{},evidenceRefs:[]};assert.equal(validate(event,schema),event);assert.throws(()=>validate({...event,seq:0},schema));delete event.id;assert.throws(()=>validate(event,schema));});
test('usage schema rejects invented complete totals',()=>{const schema=R.read(path.join(R.ROOT,'shared/schemas/usage.schema.json'));assert.throws(()=>validate({schemaVersion:2,scopeComplete:true,tokens:{total_tokens:0}},schema));});
