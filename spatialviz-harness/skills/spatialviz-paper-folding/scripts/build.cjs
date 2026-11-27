#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const [seed,level,mechanism,effect='any',...rest]=process.argv.slice(2);
if (!/^-?\d+$/.test(seed)||!Number.isSafeInteger(Number(seed))||!/^([012])$/.test(level)||!mechanism||rest.length) {
  throw Error('Usage: node build.cjs SEED LEVEL strip|parallel|crossed [any|crease|flap|outside|mixed]');
}
function bridge(...args) {
  return execFileSync(process.execPath,[path.join(__dirname,'construct.cjs'),...args],{encoding:'utf8',windowsHide:true}).trim();
}
const p={level:Number(level),mechanism,effect};
const title='Paper Folding / '+mechanism+' / seed '+seed;
const run=bridge('start','--title',title,'--task',title+' '+JSON.stringify(p),'--no-viewer');
console.log('Recorder run',run);
const config=path.join(run,'parameters.json'),task=path.join(run,'delivery.json');
fs.writeFileSync(config,JSON.stringify(p));
bridge('read','--run',run,'--file',path.join(__dirname,'../references/coverage.md'));
const c=JSON.parse(bridge('generate','--run',run,'--task',task,'--params',config,'--seed',seed));
const args=['--run',run,'--candidate',c.id];
const preview=JSON.parse(bridge('render',...args));
bridge('verify',...args);
const report=JSON.parse(fs.readFileSync(path.join(run,'verification.json')));
console.log(JSON.stringify({run,candidate:c.id,task,png:path.join(run,preview.artifactPath),verdict:report.verdict},null,2));

