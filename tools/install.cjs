#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const R=require('./observatory/runtime.cjs');
const args=process.argv.slice(2),get=k=>args[args.indexOf('--'+k)+1];
const harness=get('harness'),destination=get('destination');
if(!harness||!destination||!R.read(path.join(R.ROOT,'catalog/harnesses.json')).harnesses.some(h=>h.id===harness))throw Error('Supply --harness and --destination');
const root=path.resolve(destination),source=path.join(R.ROOT,harness,'skills');
fs.mkdirSync(root,{recursive:true});
for(const e of fs.readdirSync(source,{withFileTypes:true})){
 if(!e.isDirectory()||!fs.existsSync(path.join(source,e.name,'SKILL.md')))continue;
 const out=path.join(root,e.name);if(fs.existsSync(out))throw Error('Existing skill preserved: '+out+'; select a new destination or update it explicitly.');
 fs.cpSync(path.join(source,e.name),out,{recursive:true});
}
// Local binding only; distributed packages do not contain machine-specific paths.
R.atomic(path.join(root,'.harness-library.json'),{schemaVersion:1,root:R.ROOT});
R.atomic(path.join(root,'.mazebench-observatory.json'),{runtime:path.join(R.ROOT,'maze-harness/tools/authoring-observatory'),runsRoot:path.join(R.ROOT,'.harness/maze-runs'),viewer:true});
console.log('Skills installed. Keep this library checkout available for the shared runtime and publication tools.');
