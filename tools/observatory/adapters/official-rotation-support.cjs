'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const R=require('../runtime.cjs');
const directory=path.join(R.ROOT,'spatialviz-harness/official-rotation');
const python=()=>process.env.SPATIALVIZ_PYTHON||'python';
const D='All three other options are incorrect';
function make(dimension){
 const hash=crypto.createHash('sha256').update(fs.readFileSync(__filename));
 for(const name of fs.readdirSync(directory).filter(n=>n.endsWith('.py')&&!n.startsWith('test_')).sort())hash.update(name).update(fs.readFileSync(path.join(directory,name)));
 hash.update(fs.readFileSync(path.join(directory,'assets/DejaVuSans-Bold.ttf')));
 const vendor=path.join(R.ROOT,'spatialviz-harness/vendor/SpatialViz-Bench-c27f9111a267'),manifest=R.read(path.join(vendor,'SOURCE.json'));
 hash.update(fs.readFileSync(path.join(vendor,'SOURCE.json')));
 for(const [name,digest] of Object.entries(manifest.files)){const bytes=fs.readFileSync(path.join(vendor,name));if(R.sha(bytes)!==digest)throw Error('Official source bytes changed: '+name);hash.update(bytes);}
 const identity={id:`spatialviz-official-${dimension}d-rotation`,revision:hash.digest('hex')};
 function specification(result){
  const {checks,rejections,...data}=result;
  return {schemaVersion:1,...data,title:`${dimension}D rotation / ${dimension===2?data.parameters.mode:data.polarity} / official FreeCAD`,description:'New construction through the pinned official FreeCAD modeling and image-composition pipeline.',category:'MentalRotation',taskType:`${dimension}d-rotation`,difficulty:{label:'Unranked',basis:'No human calibration; official difficulty levels are not inherited.'},geometry:data.pipeline.views[0].geometry,options:data.pipeline.views.slice(1).map(v=>({label:v.label,type:'figure',geometry:v.geometry})).concat({label:'D',type:'text',text:D}),generator:{...identity,seed:data.seed,parameters:data.parameters,objectSeed:data.objectSeed,selectionSeed:data.pipeline.selectionSeed},rendering:{...identity,format:'png',presentation:'official-single-view',image:data.pipeline.finalImage},contract:{answerMode:'unique-A-C',graphicalOptions:3,textOptionD:D,properRotations:dimension===2?4:24,reflection:false},verifier:identity,provenance:{sourceKind:'agent-authored',generationMethod:'SpatialViz-Bench official FreeCAD + OpenCV/Pillow pipeline',sourceRevision:manifest.revision,note:'New objects; original benchmark source questions and previous JavaScript/SVG records remain separate.'}};
 }
 function verify(spec,candidateId,fingerprints){
  const temporaryRoot=path.join(R.ROOT,'.harness/verification');fs.mkdirSync(temporaryRoot,{recursive:true});
  const temporary=fs.mkdtempSync(path.join(temporaryRoot,'official-'));
  try{
   const input=path.join(temporary,'task.json'),fp=path.join(temporary,'fingerprints.json'),out=path.join(temporary,'verification.json');R.atomic(input,spec);R.atomic(fp,fingerprints);
   const result=spawnSync(python(),[path.join(directory,'verify.py'),input,candidateId,fp,out],{encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});
   if(!fs.existsSync(out))throw Error('Independent Python verifier unavailable: '+(result.error?.message||result.stderr||result.stdout));
   const report=R.read(out),current=spec.dimension===dimension&&spec.taskType===`${dimension}d-rotation`&&['generator','rendering','verifier'].every(k=>spec[k]?.id===identity.id&&spec[k]?.revision===identity.revision)&&Number.isSafeInteger(spec.seed);
   report.checks.push({name:'Exact current official adapter revision and dimension',verdict:current?'passed':'failed'});
   report.verifier=identity;report.verdict=current&&result.status===0&&report.checks.every(c=>c.verdict==='passed')?'passed':'failed';return report;
  }finally{fs.rmSync(temporary,{recursive:true,force:true});}
 }
 function generate(seed=81,parameters={},context){
  if(!Number.isSafeInteger(seed))throw Error('Seed must be a safe integer');
  if(!context?.run)throw Error('Start the shared recorder before official FreeCAD generation.');
  const run=context.run;R.active(run);
  const output=path.join(run,'official-generation-'+crypto.randomUUID()),params=output+'-parameters.json';R.atomic(params,parameters);
  const command=R.execute(run,python(),[path.join(directory,'generate.py'),'--dimension',String(dimension),'--seed',String(seed),'--params',params,'--out',output],{kind:'official-freecad-generation'});
  let parent=null;
  // Each fully composited failed candidate gets the same immutable save/render/test boundaries.
  for(const file of fs.existsSync(output)?fs.readdirSync(output).filter(n=>/^rejected-.*\.json$/.test(n)).sort():[]){
   const draft=specification(R.read(path.join(output,file))),target=path.join(output,file+'.task.json');R.atomic(target,draft);
   const c=R.save(run,target,{parentId:parent,parentBasis:parent?'Official resampling after independent rejection':null});parent=c.id;
   R.render(run,c.id,{identity,imageFormat:{extension:'png'},render});
   const fp=path.join(output,c.id+'-fingerprints.json');R.atomic(fp,c.fingerprints);
   R.execute(run,process.execPath,[path.join(__dirname,`official-rotation-${dimension}d.cjs`),target,c.id,fp,path.join(output,c.id+'-verification.json')],{candidateId:c.id,kind:'verification',report:path.join(output,c.id+'-verification.json'),verifier:identity});
  }
  const rejections=fs.existsSync(path.join(output,'rejections.json'))?R.read(path.join(output,'rejections.json')):[];
  R.note(run,{goal:'Accept an official single-view rotation question',change:'Ran the official FreeCAD application and generate_data dispatch with recorded source patches.',reason:rejections.length?JSON.stringify(rejections):'First construction passed independent checks.',expectedChecks:'Independent geometry, source-to-image correspondence, exact composition and separate visual review.'});
  if(command.exitCode!==0)throw Error('Official FreeCAD pipeline failed; commands and rejected artifacts remain in the run. No fallback was used.');
  if(parent){context.parentId=parent;context.parentBasis='Resampled official construction after recorded independent failures';}
  return specification(R.read(path.join(output,'result.json')));
 }
 function render(spec){const bytes=Buffer.from(spec.rendering.image.pngBase64,'base64');if(R.sha(bytes)!==spec.rendering.image.sha256)throw Error('PNG digest mismatch');return bytes;}
 return {identity,imageFormat:{extension:'png',mediaType:'image/png'},generate,verify,render,specification};
}
function cli(adapter){const [spec,cid,fp,out]=process.argv.slice(2),report=adapter.verify(R.read(spec),cid,R.read(fp));R.atomic(out,report);console.log(JSON.stringify({verdict:report.verdict,checks:report.checks}));process.exitCode=report.verdict==='passed'?0:1;}
module.exports={make,cli};
