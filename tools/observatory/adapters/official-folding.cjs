'use strict';
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const R = require('../runtime.cjs');
const directory = path.join(R.ROOT, 'spatialviz-harness/official-folding');
const vendor = path.join(directory,'../vendor/SpatialViz-Bench-c27f9111a267');
const manifest = R.read(path.join(directory,'source.json'));
const python = process.env.SPATIALVIZ_PYTHON || 'python';
function adapter(task,id,entry) {
  const hash=crypto.createHash('sha256').update(fs.readFileSync(__filename)).update(fs.readFileSync(entry));
  for(const name of ['geometry.py','motifs.py','design.py','gui_job.py','pipeline.py','answer.py','artwork.py','generate.py','verify.py','source.json','../official-rotation/upstream.py','../official-rotation/assets/DejaVuSans-Bold.ttf']) {
    hash.update(name).update(fs.readFileSync(path.join(directory,name)));
  }
  for (const [file,expected] of Object.entries(manifest.files)) {
    if(R.sha(fs.readFileSync(path.join(vendor,file)))!==expected) throw Error('Upstream digest mismatch '+file);
  }
  const identity={id,revision:hash.digest('hex')};
  function generate(seed,parameters,{run}) {
    if(!Number.isSafeInteger(seed)) throw Error('Expected integer seed');
    const output=path.resolve(run,'fold-'+crypto.randomUUID());
    const params=output+'.json';
    R.atomic(params,parameters);
    const command=R.execute(run,python,['-B',path.join(directory,'generate.py'),task,String(seed),params,output],{kind:'official-freecad-generation'});
    if(command.exitCode!==0) throw Error('Folding generation failed. Retained workspace: '+output);
    const spec=R.read(path.join(output,'task.json'));
    spec.generator={...identity,seed,parameters};
    spec.rendering={...identity,...spec.rendering,format:'png'};
    spec.verifier=identity;
    return spec;
  }
  function render(s) {
    const data=Buffer.from(s.rendering.image.pngBase64,'base64');
    if(R.sha(data)!==s.rendering.image.sha256) throw Error('Changed PNG');
    return data;
  }
  function cli() {
    const [file,id,fp,out]=process.argv.slice(2);
    const proc=spawnSync(python,['-B',path.join(directory,'verify.py'),file,id,fp,out],{stdio:'inherit',windowsHide:true});
    if(!fs.existsSync(out)) throw Error(proc.error?.message || 'Missing verifier report');
    const s=R.read(file),report=R.read(out);
    const ok=s.taskType===task && ['generator','rendering','verifier'].every(k=>s[k].revision===identity.revision && s[k].id===identity.id) && s.provenance.sourceRevision===manifest.revision && JSON.stringify(s.provenance.manifest)===JSON.stringify(manifest);
    report.checks.push({name:'Current domain adapter and pinned source bytes',verdict:ok?'passed':'failed'});
    if(!ok || proc.status!==0) report.verdict='failed';
    R.atomic(out,report);
    process.exitCode=report.verdict==='passed'?0:1;
  }
  return {identity,generate,render,cli,imageFormat:{extension:'png',mediaType:'image/png'}};
}
module.exports={adapter};

