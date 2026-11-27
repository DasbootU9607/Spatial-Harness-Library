'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const R=require('../runtime.cjs');
const root=path.join(R.ROOT,'spatialviz-harness');
const directory=path.join(root,'paper-folding');
const source=R.read(path.join(directory,'source.json'));
const python=process.env.SPATIALVIZ_PYTHON || 'python';
const hash=crypto.createHash('sha256').update(fs.readFileSync(__filename));
for(const name of ['generate.py','verify.py','plan.py','evidence.py','source.py','source.json',
  '../skills/spatialviz-paper-folding/references/audit_images.py','../skills/spatialviz-paper-folding/references/observations.json',
  '../official-folding/artwork.py','../official-rotation/upstream.py','../official-rotation/assets/DejaVuSans-Bold.ttf']){
  hash.update(name).update(fs.readFileSync(path.join(directory,name)));
}
for(const [file,digest] of Object.entries(source.files)){
  if(R.sha(fs.readFileSync(path.join(root,'vendor/SpatialViz-Bench-c27f9111a267',file)))!==digest)throw Error('Changed upstream source: '+file);
}
const identity={id:'official-paper-folding',revision:hash.digest('hex')};
function generate(seed,parameters,{run}){
  if(!Number.isSafeInteger(seed))throw Error('Expected integer seed');
  const output=path.join(run,'paper-'+crypto.randomUUID());
  const input=output+'.json';
  R.atomic(input,parameters);
  const result=R.execute(run,python,['-B',path.join(directory,'generate.py'),String(seed),input,output],{kind:'official-paper-folding-generation'});
  if(result.exitCode!==0)throw Error('Generation failed. Inspect the recorded command and workspace '+output);
  const s=R.read(path.join(output,'task.json'));
  s.generator={...identity,seed,parameters};
  s.rendering={...identity,...s.rendering,format:'png'};
  s.verifier=identity;
  return s;
}
function render(s){
  const bytes=Buffer.from(s.rendering.image.pngBase64,'base64');
  if(R.sha(bytes)!==s.rendering.image.sha256)throw Error('Changed PNG');
  return bytes;
}
module.exports={generate,render,identity,imageFormat:{extension:'png',mediaType:'image/png'}};
if(require.main===module){
  const [spec,id,fp,out]=process.argv.slice(2);
  const cmd=spawnSync(python,['-B',path.join(directory,'verify.py'),spec,id,fp,out],{windowsHide:true,stdio:'inherit'});
  if(!fs.existsSync(out))throw Error(cmd.error?.message || 'No verification report');
  const s=R.read(spec),report=R.read(out);
  const ok=s.taskType==='PaperFolding'&&s.provenance.generationMethod==='SpatialViz-Bench official Paper Folding Matplotlib/Pillow pipeline'&&
    s.provenance.sourceRevision===source.revision&&JSON.stringify(s.provenance.manifest)===JSON.stringify(source)&&
    ['generator','rendering','verifier'].every(k=>s[k].id===identity.id&&s[k].revision===identity.revision);
  report.checks.push({name:'Pinned modeling, drawing, dispatch, assets and verification source',verdict:ok?'passed':'failed'});
  if(!ok || cmd.status!==0)report.verdict='failed';
  R.atomic(out,report);
  process.exitCode=report.verdict==='passed'?0:1;
}

