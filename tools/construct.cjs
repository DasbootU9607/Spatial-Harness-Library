#!/usr/bin/env node
'use strict';
const path=require('node:path'),fs=require('node:fs'),R=require('./observatory/runtime.cjs');
const args=process.argv.slice(2),command=args.shift();
const get=(key,fallback)=>{const i=args.indexOf('--'+key);return i<0?fallback:args[i+1];};
const need=k=>{const v=get(k);if(!v)throw Error('--'+k+' is required');return v;};
function adapter(){const id=get('adapter','rotation');if(!/^[a-z0-9-]+$/.test(id))throw Error('Invalid adapter');return require('./observatory/adapters/'+id+'.cjs');}
function verify(run,id){const a=adapter(),c=R.candidate(run,id),fp=path.join(run,'artifacts',id+'-fingerprints.json');R.atomic(fp,c.fingerprints);return R.execute(run,process.execPath,[require.resolve('./observatory/adapters/'+get('adapter','rotation')+'.cjs'),path.join(run,c.specPath),id,fp,path.join(run,'verification.json')],{candidateId:id,kind:'verification',report:path.join(run,'verification.json'),verifier:a.identity});}
function main(){
  if(command==='start')return R.start({task:need('task'),title:need('title'),harness:need('harness'),skill:get('skill'),runKind:get('kind','task-generation'),viewer:!args.includes('--no-viewer')});
  const run=need('run');
  if(command==='resume')return R.resume(run,need('task'));
  if(command==='read')return R.deliver(run,need('file'),{start:Number(get('start',1)),end:get('end')?Number(get('end')):undefined});
  if(command==='note')return R.note(run,R.read(need('file')),get('candidate'));
  if(command==='generate'){const a=adapter(),file=need('task');R.active(run);R.atomic(file,a.generate(Number(get('seed',17))));const c=R.save(run,file,{parentId:get('parent'),parentBasis:get('basis')});R.event(run,'build.saved',{generator:a.identity},{actionId:c.actionId,candidateId:c.id});return c;}
  if(command==='save')return R.save(run,need('task'),{parentId:get('parent'),parentBasis:get('basis')});
  if(command==='render')return R.render(run,need('candidate'),adapter());
  if(command==='verify'){const t=verify(run,need('candidate'));process.exitCode=t.verdict==='passed'?0:1;return t;}
  if(command==='exec'){const i=args.indexOf('--');if(i<0)throw Error('Supply -- command arguments');const r=R.execute(run,args[i+1],args.slice(i+2),{candidateId:get('candidate')});process.exitCode=r.exitCode;return r;}
  if(command==='review')return R.event(run,'visual.review',{review:need('review'),outcome:need('outcome')},{candidateId:need('candidate'),origin:'agent_statement',actor:'author'});
  if(command==='finish'){R.finish(run,need('candidate'),get('outcome','accepted'));if(args.includes('--local-only'))return {run,status:'sealed-local'};const publisher=require('./publish.cjs'),out=publisher.prepare({run,task:need('task'),skill:need('skill')});const result=publisher.publish(out,{prepareOnly:args.includes('--prepare-only')});if(args.includes('--prepare-only'))return result;return publisher.observe(result.commit,out.urls);}
  throw Error('Commands: start, resume, read, note, generate, save, render, verify, exec, review, finish');
}
if(require.main===module){Promise.resolve().then(main).then(value=>{if(value!==undefined)console.log(typeof value==='string'?value:JSON.stringify(value,null,2));}).catch(e=>{console.error(e.message);process.exitCode=1;});}
module.exports={verify};
