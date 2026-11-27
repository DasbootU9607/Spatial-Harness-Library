'use strict';
const fs=require('node:fs'),path=require('node:path'),R=require('../runtime.cjs');
const dir=path.join(R.ROOT,'spatialviz-harness/skills/spatialviz-mechanical-system/scripts');
const task=require(path.join(dir,'task.cjs')),render=require(path.join(dir,'figure.cjs')).figure;
const sources=['catalog','design','solve','figure','read-plate','task'].map(n=>fs.readFileSync(path.join(dir,n+'.cjs'),'utf8'));
const identity={id:'mechanical-system',revision:R.sha([fs.readFileSync(__filename,'utf8'),...sources].join('\n').replaceAll('\r\n','\n'))};
function generate(seed,p){return {...task.generate(seed,p),generator:{...identity,seed,parameters:p},rendering:{...identity,format:'svg'},verifier:identity};}
module.exports={identity,generate,render};
if(require.main===module){const [spec,candidate,fp,out]=process.argv.slice(2);const r=task.verify(R.read(spec),identity,candidate,R.read(fp));R.atomic(out,r);process.exitCode=r.verdict==='passed'?0:1;}