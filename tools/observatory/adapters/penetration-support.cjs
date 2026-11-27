'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const R = require('../runtime.cjs');

const families = {
  'cross-sections': ['cross_native.py','cross_freecad.py','create_cross_section.py'],
  'cube-assembly': ['assembly_native.py','assembly_job.py','create_cube_assembly.py'],
  'cube-counting': ['count_native.py','count_cad.py','create_cube_counting.py']
};

exports.create = function(kind, entry, main) {
  const directory = path.join(R.ROOT,'spatialviz-harness/penetration');
  const script = path.join(directory,'engine.py');
  const manifest = R.read(path.join(directory,'official-source.json'));
  const source = path.join(directory,'../vendor/SpatialViz-Bench-'+manifest.revision.slice(0,12),'create_freecad');
  const python = process.env.SPATIALVIZ_PYTHON || 'python';
  const [module,macro,model] = families[kind];
  const sources = ['create_visual_penetration/'+model,'visual_penetration_tasks_utils.py','utils.py'];
  const hash = crypto.createHash('sha256');
  for (const file of [__filename,entry,script,path.join(directory,module),path.join(directory,macro),
         path.join(directory,'official-source.json'),path.join(directory,'../skills/spatialviz-'+kind,'scripts/domain.py')]) {
    hash.update(fs.readFileSync(file,'utf8').replaceAll('\r\n','\n'));
  }
  for (const name of sources) {
    const bytes=fs.readFileSync(path.join(source,name));
    if (R.sha(bytes)!==manifest.files[name]) throw Error('Pinned upstream file changed: '+name);
    hash.update(bytes);
  }
  const identity={id:'penetration-'+kind,revision:hash.digest('hex')};
  function generate(seed,params,{run,nativeFolder}) {
    if (!Number.isSafeInteger(seed)) throw Error('Supply an integer seed');
    const folder=nativeFolder||fs.mkdtempSync(path.join(run,'native-'));
    fs.mkdirSync(folder,{recursive:true});
    const input=path.join(folder,'input.json'),out=path.join(folder,'native.json');
    R.atomic(input,params);
    for (const name of sources) R.deliver(run,path.join(source,name),{sink:()=>{}});
    const job=R.execute(run,python,['-B',script,'generate',kind,String(seed),input,out],
      {kind:'FreeCAD '+model+' and SpatialViz official option composition'});
    if (job.exitCode) throw Error('Official generation failed. Retained native files and command output: '+folder);
    const s=R.read(out),receipt=R.read(path.join(folder,'official-tools.json'));
    const native=receipt.nativeFiles.filter(a=>a.file.toLowerCase().endsWith('.fcstd'));
    R.note(run,{goal:'Bind the published pixels to the official tool execution',
      sources:[model,'visual_penetration_tasks_utils.py',receipt.compositor],
      change:'Observed '+receipt.freecadLaunches.length+' FreeCAD launch(es); saved '+native.length+' native document(s).',
      reason:'The PNG SHA-256 at the official compositor return was '+receipt.compositeSha256+'.',
      expectedChecks:['Native artifact digests and observed functions are in the task provenance.']});
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
    r.checks.push({name:'Current official-tool adapter and verifier revisions',verdict:matched?'passed':'failed'});
    if (!matched) r.verdict='failed';
    R.atomic(report,{...r,candidateId:id,testedFingerprints:R.read(fp),verifier:identity,
      scope:'Native FreeCAD evidence, original compositor output, per-option geometry and final media.'});
    process.exitCode=r.verdict==='passed'?0:1;
  }
  return {identity,generate,render,imageFormat:{extension:'png',mediaType:'image/png'}};
};
