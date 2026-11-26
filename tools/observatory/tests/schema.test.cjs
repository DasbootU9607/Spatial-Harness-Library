'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const R=require('../runtime.cjs'),{validate}=require('../../schema.cjs');
test('public event schema accepts future types without requiring private clocks',()=>{const schema=R.read(path.join(R.ROOT,'shared/schemas/event.schema.json'));const event={id:'e000001',seq:1,runId:'test',type:'future.event',actor:'tool',origin:'historical',actionId:null,candidateId:null,details:{},evidenceRefs:[]};assert.equal(validate(event,schema),event);assert.throws(()=>validate({...event,recordedAt:new Date().toISOString()},schema));assert.throws(()=>validate({...event,seq:0},schema));delete event.id;assert.throws(()=>validate(event,schema));});
test('usage schema rejects invented complete totals',()=>{const schema=R.read(path.join(R.ROOT,'shared/schemas/usage.schema.json'));assert.throws(()=>validate({schemaVersion:2,scopeComplete:true,tokens:{total_tokens:0}},schema));});
