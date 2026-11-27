'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const R = require('../runtime.cjs');

exports.create = function(kind, entry, main) {
  const directory = path.join(R.ROOT, 'spatialviz-harness/penetration');
  const script = path.join(directory,'engine.py');
  const python = process.env.SPATIALVIZ_PYTHON || 'python';
  const hash = crypto.createHash('sha256');
  for (const file of [__filename,entry,script,path.join(directory,'diagram.py'),
      path.join(directory,'../skills/spatialviz-'+kind,'scripts/domain.py')]) {
    hash.update(fs.readFileSync(file,'utf8').replaceAll('\r\n','\n'));
  }
  const identity={id:'penetration-'+kind,revision:hash.digest('hex')};
  function generate(seed,params,{run}) {
    if (!Number.isSafeInteger(seed)) throw Error('Supply an integer seed');
    const folder=fs.mkdtempSync(path.join(run,'model-'));
    const input=path.join(folder,'input.json'),out=path.join(folder,'native.json');
    R.atomic(input,params);
    const job=R.execute(run,python,['-B',script,'generate',kind,String(seed),input,out],{kind:'parametric-generation'});
    if (job.exitCode) throw Error('Generation failed. See the recorder command.');
    const s=R.read(out);
    Object.assign(s.generator,identity);
    Object.assign(s.rendering,identity);
    s.verifier=identity;
    return s;
  }
  function render(s) {
    const bytes=Buffer.from(s.rendering.pngBase64,'base64');
    if (R.sha(bytes)!==s.rendering.sha256) throw Error('Question PNG digest mismatch');
    return bytes;
  }
  if (main) {
    const [spec,id,fp,report]=process.argv.slice(2);
    const proof=path.join(path.dirname(report),id+'-solver-evidence.json');
    const result=spawnSync(python,['-B',script,'verify',kind,spec,proof],{stdio:'inherit',windowsHide:true});
    if (result.status!==0) throw Error('Independent checker failed');
    const r=R.read(proof),s=R.read(spec);
    const matched=['generator','verifier','rendering'].every(k=>s[k].revision===identity.revision && s[k].id===identity.id);
    r.checks.push({name:'Matching renderer and checker revisions',verdict:matched?'passed':'failed'});
    if (!matched) r.verdict='failed';
    R.atomic(report,{...r,candidateId:id,testedFingerprints:R.read(fp),verifier:identity,
      scope:'Independent geometry, all choices, unique answer and reconstruction of final media.'});
    process.exitCode=r.verdict==='passed'?0:1;
  }
  return {identity,generate,render,imageFormat:{extension:'png',mediaType:'image/png'}};
};
