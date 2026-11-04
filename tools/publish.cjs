#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const R=require('./observatory/runtime.cjs'),P=require('./observatory/projection.cjs');
const repo='DasbootU9607/Spatial-Harness-Library',remote='https://github.com/'+repo+'.git',base='https://dasbootu9607.github.io/Spatial-Harness-Library/';
function command(bin,args,cwd=R.ROOT){const r=spawnSync(bin,args,{cwd,encoding:'utf8',windowsHide:true,maxBuffer:64*1024*1024});if(r.status!==0)throw Error(`${bin} ${args[0]} failed: ${r.stderr||r.stdout||r.error}`);return r.stdout.trim();}
function locked(fn){const lock=path.join(R.ROOT,'catalog/.publish-lock');const wait=new Int32Array(new SharedArrayBuffer(4)),end=Date.now()+15000;while(true){try{fs.mkdirSync(lock);break;}catch(e){if(e.code!=='EEXIST'||Date.now()>end)throw Error('Catalog locked by another publisher');Atomics.wait(wait,0,0,30);}}try{return fn();}finally{fs.rmdirSync(lock);}}
function previewBytes(run,version,events,adapter){
  const recorded=events.findLast(e=>e.type==='render.completed'&&e.candidateId===version.id&&e.details.specification===version.sha256&&e.details.rendering===version.fingerprints.rendering);
  if(recorded){const file=path.resolve(run,recorded.details.artifactPath),relative=path.relative(run,file);if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Preview path escapes run');const bytes=fs.readFileSync(file);if(R.sha(bytes)!==recorded.details.sha256)throw Error('Recorded preview bytes changed');return {bytes,renderer:recorded.details.renderer,origin:'recorded-render',extension:path.extname(file).slice(1)};}
  const original=R.read(path.join(run,version.specPath));
  if(original.rendering?.revision!==adapter.identity.revision)return null;
  return {bytes:adapter.render(original),renderer:adapter.identity,origin:'delivery-render',extension:adapter.imageFormat?.extension||'svg'};
}
function prepare({run,task,skill}){
  const checked=P.audit(run,task),m=checked.run.manifest,c=checked.candidate,harness=m.harness;
  if(!R.read(path.join(R.ROOT,'catalog/harnesses.json')).harnesses.some(h=>h.id===harness))throw Error('Unknown harness');
  const skillDir=path.resolve(skill),meta=R.read(path.join(skillDir,'skill.json'));
  if(meta.status!=='complete'||meta.harnessId!==harness||m.skill?.id!==path.basename(skillDir)||m.skill?.sha256!==R.sha(fs.readFileSync(path.join(skillDir,'SKILL.md'))))throw Error('Completed matching skill and recorded source fingerprint required');
  if(meta.requiresVisualReview){const review=checked.run.events.findLast(e=>e.type==='visual.review'&&e.candidateId===c.id);if(review?.details?.outcome!=='passed')throw Error('This skill requires a passed visual review of the exact final candidate');}
  const spec=R.read(task);
  if(JSON.stringify(P.safe(spec))!==JSON.stringify(spec))throw Error('Task contains private fields; fix the public specification before authoring');
  const adapter=require('./observatory/adapters/'+meta.adapter+'.cjs');
  if(checked.test.verifier.revision!==adapter.identity.revision)throw Error('Verifier revision changed; run fresh verification');
  const id='authored-'+c.sha256.slice(0,24),relative=`${harness}/site/records/${id}`,dir=path.join(R.ROOT,relative);
  const urls={task:base+harness+'/task.html?id='+id,skill:base+harness+'/skill.html?id='+meta.id,process:base+harness+'/process.html?id='+id};
  return locked(()=>{
    const catalogFile=path.join(R.ROOT,'catalog/cases.json'),catalog=R.read(catalogFile),old=catalog.cases.find(x=>x.id===id&&x.harnessId===harness);
    if(old){if(old.contentSha256!==c.sha256)throw Error('Immutable identity collision');return {case:old,urls,run,prepared:true,repeated:true,paths:['catalog/cases.json',relative]};}
    fs.mkdirSync(dir,{recursive:true});
    const process=checked.process;process.caseId=id;
    const previews=[];
    for(const version of checked.run.candidates){
      if(version.previewUnavailable)continue;
      let source;try{source=previewBytes(run,version,checked.run.events,adapter);}catch{continue;}
      if(!source)continue;const bytes=source.bytes;
      if(!['png','svg'].includes(source.extension))throw Error('Unsupported preview format');
      const asset=`${version.id}-${R.sha(bytes).slice(0,16)}.${source.extension}`;
      fs.writeFileSync(path.join(dir,asset),bytes,{flag:'wx'});
      const preview={candidateId:version.id,specification:version.sha256,rendering:version.fingerprints.rendering,renderer:source.renderer,sha256:R.sha(bytes),path:`records/${id}/${asset}`,origin:source.origin};
      previews.push(preview);process.candidates.find(x=>x.id===version.id).preview=preview;
    }
    if(!previews.some(x=>x.candidateId===c.id))throw Error('Final preview unavailable');
    fs.copyFileSync(task,path.join(dir,'task.json'));
    R.atomic(path.join(dir,'process.json'),process);fs.writeFileSync(path.join(dir,'events.csv'),P.csv(process));
    R.atomic(path.join(dir,'verification.json'),process.tests.find(x=>x.id===checked.test.id));
    R.atomic(path.join(dir,'delivery.json'),{schemaVersion:1,runId:m.id,caseId:id,createdAt:new Date().toISOString(),kind:'prepared-public-export',previews,taskSha256:c.sha256,processSha256:R.sha(fs.readFileSync(path.join(dir,'process.json')))});
    const item={schemaVersion:1,id,harnessId:harness,skillIds:[meta.id],sourceKind:spec.provenance?.sourceKind||'agent-authored',sourceCaseIds:meta.officialReferences||[],category:spec.category,taskType:spec.taskType,difficulty:spec.difficulty||null,title:spec.title,description:spec.description,contentSha256:c.sha256,thumbnail:previews.find(x=>x.candidateId===c.id).path,taskArtifact:`records/${id}/task.json`,verification:{verdict:'passed',candidateId:c.id,fingerprints:c.fingerprints,report:`records/${id}/verification.json`},build:{runId:m.id,candidateId:c.id,usage:process.usage},process:`records/${id}/process.json`,eventsCsv:`records/${id}/events.csv`};
    catalog.cases.push(item);R.atomic(catalogFile,catalog);
    return {case:item,urls,run,prepared:true,repeated:false,paths:['catalog/cases.json',relative,path.relative(R.ROOT,skillDir).replaceAll('\\','/')]};
  });
}
function synchronize(){
  if(command('git',['remote','get-url','origin']).replace(/\.git$/,'')!==remote.replace(/\.git$/,''))throw Error('Unexpected origin remote');
  command('git',['fetch','origin','main']);
  const head=command('git',['rev-parse','HEAD']),upstream=command('git',['rev-parse','origin/main']);
  if(head!==upstream){const ancestor=spawnSync('git',['merge-base','--is-ancestor','origin/main','HEAD'],{cwd:R.ROOT});if(ancestor.status!==0)return {advanced:true};}
  return {advanced:false};
}
function validate(cwd=R.ROOT){
  command(process.execPath,['tools/check.cjs'],cwd);
  const directory=path.join(R.ROOT,'.harness','publication-check-'+crypto.randomUUID());
  command(process.execPath,['.github/scripts/build-pages.cjs',path.join(directory,'Spatial-Harness-Library')],cwd);
  command(process.execPath,['tools/browser-check.cjs','--root',directory,'--out',path.join(directory,'browser'),'--engine',path.resolve(R.ROOT,'../MazeBenchEngine')],cwd);
}
function reconcile(prepared,paths,prepareOnly){
  const checkout=path.join(R.ROOT,'.harness/publications',crypto.randomUUID());fs.mkdirSync(path.dirname(checkout),{recursive:true});
  command('git',['worktree','add','--detach',checkout,'origin/main']);
  for(const relative of paths){
    if(path.isAbsolute(relative)||relative.split(/[\\/]/).includes('..'))throw Error('Publication path escapes repository');
    const target=path.join(checkout,relative),source=path.join(R.ROOT,relative);
    if(relative==='catalog/cases.json'){
      const upstream=fs.existsSync(target)?R.read(target):{schemaVersion:1,cases:[]};
      for(const c of R.read(source).cases){const old=upstream.cases.find(x=>x.id===c.id&&x.harnessId===c.harnessId);if(old&&old.contentSha256!==c.contentSha256)throw Error('Concurrent immutable case identity conflict');if(!old)upstream.cases.push(c);}
      R.atomic(target,upstream);continue;
    }
    const conflicts=command('git',['diff','--name-only','HEAD...origin/main','--',relative]);
    if(conflicts)throw Error('Concurrent changes need reconciliation in retained checkout '+checkout+': '+conflicts);
    if(fs.existsSync(source)){fs.mkdirSync(path.dirname(target),{recursive:true});fs.cpSync(source,target,{recursive:true});}
  }
  validate(checkout);if(prepareOnly)return {...prepared,state:'prepared-and-checked',checkout};
  command('git',['add','--',...paths],checkout);
  if(command('git',['diff','--cached','--name-only'],checkout))command('git',['commit','-m','Publish verified harness construction and process evidence'],checkout);
  const commit=command('git',['rev-parse','HEAD'],checkout);command('git',['push','origin','HEAD:main'],checkout);
  const receipt={...prepared,state:'pushed',commit,checkout};R.atomic(path.join(R.ROOT,'.harness/deliveries',commit+'.json'),receipt);return receipt;
}
function publish(prepared,{prepareOnly=false,paths=prepared.paths}={}){
  const sync=synchronize();if(sync.advanced)return reconcile(prepared,paths,prepareOnly);
  validate();if(prepareOnly)return {...prepared,state:'prepared-and-checked'};
  if(command('git',['diff','--cached','--name-only']))throw Error('Unrelated staged changes must be preserved; use an isolated publication checkout');
  command('git',['add','--',...paths]);
  if(command('git',['diff','--cached','--name-only']))command('git',['commit','-m','Publish verified harness construction and process evidence']);
  const commit=command('git',['rev-parse','HEAD']);command('git',['push','origin','HEAD:main']);
  const receipt={...prepared,state:'pushed',commit};R.atomic(path.join(R.ROOT,'.harness/deliveries',commit+'.json'),receipt);
  // Deployment observation is restartable, with no new commit or duplicate registration.
  return receipt;
}
async function observe(commit,urls){
  let runs=[];for(let i=0;i<12;i++){runs=JSON.parse(command('gh',['run','list','--repo',repo,'--commit',commit,'--workflow','pages.yml','--json','databaseId,status,conclusion,headSha,url']));if(runs.length)break;await new Promise(r=>setTimeout(r,5000));}
  if(!runs.length)throw Error('No Pages workflow found for pushed commit');
  const run=runs[0];let status=run;
  for(let i=0;i<120&&status.status!=='completed';i++){await new Promise(r=>setTimeout(r,5000));status=JSON.parse(command('gh',['run','view',String(run.databaseId),'--repo',repo,'--json','status,conclusion,url,headSha']));}
  if(status.conclusion!=='success'||status.headSha!==commit)throw Error('Pages deployment not successful: '+JSON.stringify(status));
  for(const url of Object.values(urls)){const response=await fetch(url);if(!response.ok)throw Error('Public URL failed: '+url);}
  const receipt={state:'deployed',commit,workflow:status.url,urls,checkedAt:new Date().toISOString()};R.atomic(path.join(R.ROOT,'.harness/deliveries',commit+'.deployed.json'),receipt);return receipt;
}
if(require.main===module){const args=process.argv.slice(2),get=k=>args[args.indexOf('--'+k)+1];(async()=>{
 if(args.includes('--observe'))return observe(get('observe'),JSON.parse(fs.readFileSync(get('urls'),'utf8')));
 if(args.includes('--harness')&&get('harness')==='maze-harness'){
   const filtered=args.filter((x,i)=>x!=='--harness'&&args[i-1]!=='--harness');
   const options=require('../maze-harness/scripts/sync-site.cjs').parseArgs(filtered);
   synchronize();
   const result=require('../maze-harness/scripts/publish-site.cjs').publish({...options,'prepare-only':true});
   if(options['prepare-only']){validate();return {...result,state:'prepared-and-checked'};}
   const prepared={paths:['maze-harness/site',...(options.skill?['maze-harness/skills/mazebench-'+options.skill.replace(/^mazebench-/, '')]:[])],urls:{harness:base+'maze-harness/'}};
   const pushed=publish(prepared);return observe(pushed.commit,prepared.urls);
 }
 const p=prepare({run:get('run'),task:get('task'),skill:get('skill')});const result=publish(p,{prepareOnly:args.includes('--prepare-only')});console.log(JSON.stringify(result,null,2));if(!args.includes('--prepare-only'))return observe(result.commit,p.urls);return result;
})().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.message);process.exitCode=1;});}
module.exports={prepare,publish,synchronize,validate,observe,previewBytes};
