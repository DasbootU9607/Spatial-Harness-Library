#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const skill = path.resolve(__dirname,'..');
const metadata = JSON.parse(fs.readFileSync(path.join(skill,'skill.json'),'utf8'));
const [seed,family,mode,layout] = process.argv.slice(2);
if (!/^-?\d+$/.test(seed) || !Number.isSafeInteger(Number(seed)) || !family || !mode || (layout!==undefined && !/^(10|[0-9])$/.test(layout))) {
  throw Error('Usage: node scripts/build.cjs SEED FAMILY MODE [LAYOUT_0_TO_10]');
}
function bridge(...args) {
  return execFileSync(process.execPath,[path.join(__dirname,'construct.cjs'),...args],{encoding:'utf8',windowsHide:true}).trim();
}
const params = {family,mode,...(layout===undefined?{}:{layout:Number(layout)})};
const title = metadata.name+' / '+family+' / '+mode;
const run = bridge('start','--title',title,'--task',title+' seed '+seed+' parameters '+JSON.stringify(params),'--no-viewer');
console.log('Recorder run',run);
const config = path.join(run,'parameters.json'), file = path.join(run,'delivery.json');
fs.writeFileSync(config,JSON.stringify(params,null,2));
bridge('read','--run',run,'--file',path.join(skill,'references/coverage.md'));
const candidate = JSON.parse(bridge('generate','--run',run,'--task',file,'--params',config,'--seed',seed));
const args = ['--run',run,'--candidate',candidate.id];
const preview = JSON.parse(bridge('render',...args));
bridge('verify',...args);
const report = JSON.parse(fs.readFileSync(path.join(run,'verification.json'),'utf8'));
console.log(JSON.stringify({run,candidate:candidate.id,task:file,png:path.join(run,preview.artifactPath),verdict:report.verdict},null,2));

