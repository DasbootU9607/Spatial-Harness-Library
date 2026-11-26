'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const R = require('../runtime.cjs');
const dir = path.join(R.ROOT, 'spatialviz-harness/official-projection');
const vendor = path.join(dir, '../vendor/SpatialViz-Bench-c27f9111a267');
const manifest = R.read(path.join(dir, 'source.json'));
const hash = crypto.createHash('sha256').update(fs.readFileSync(__filename));
for (const name of ['generate.py','gui_job.py','parameters.py','verify.py','drawing.py','cubes.py','pixels.py','source.json',
                    '../official-rotation/assets/DejaVuSans-Bold.ttf','../official-rotation/upstream.py']) {
  hash.update(name).update(fs.readFileSync(path.join(dir,name)));
}
// Only these shared functions participate. Independent edits to rotation motifs
// should preserve the identity of an unchanged projection verifier.
for (const [file,names] of [['image_audit.py',['image_record','decode','crop_box']],['runner.py',['runtime','sha']]]) {
  const source=fs.readFileSync(path.join(dir,'../official-rotation',file),'utf8').replaceAll('\r\n','\n');
  for (const name of names) {
    const block=source.split(/^(?=def |if __name__)/m).find(section=>section.startsWith('def '+name+'('));
    if (!block) throw Error('Missing shared projection dependency '+name);
    hash.update(file).update(block.trim());
  }
}
for (const [name,digest] of Object.entries(manifest.files)) {
  if (R.sha(fs.readFileSync(path.join(vendor,name))) !== digest) throw Error('Upstream source changed: '+name);
}
const identity = {id:'official-projection',revision:hash.digest('hex')};
const python = process.env.SPATIALVIZ_PYTHON || 'python';
function generate(seed, parameters, {run}) {
  if (!Number.isSafeInteger(seed)) throw Error('A safe integer seed is required');
  R.active(run);
  const folder = path.resolve(run,'projection-'+crypto.randomUUID());
  const params = folder+'-params.json';
  R.atomic(params, parameters);
  const command = R.execute(run,python,[path.join(dir,'generate.py'),String(seed),params,folder],{kind:'official-freecad-generation'});
  if (command.exitCode !== 0) throw Error('Projection generation failed. Inspect the recorded command and retained outputs in '+folder);
  const s = R.read(path.join(folder,'task.json'));
  s.generator = {...identity,seed,parameters};
  s.rendering = {...identity,format:'png',...s.rendering};
  s.verifier = identity;
  return s;
}
function render(s) {
  const bytes = Buffer.from(s.rendering.image.pngBase64,'base64');
  if (R.sha(bytes)!==s.rendering.image.sha256) throw Error('Invalid final PNG digest');
  return bytes;
}
module.exports = {identity, generate, render, imageFormat:{extension:'png',mediaType:'image/png'}};
if (require.main===module) {
  const [spec,id,fp,out]=process.argv.slice(2);
  const result=spawnSync(python,[path.join(dir,'verify.py'),spec,id,fp,out],{stdio:'inherit',windowsHide:true});
  if (!fs.existsSync(out)) throw Error(result.error?.message || 'Missing projection verifier report');
  const s=R.read(spec), report=R.read(out);
  const valid=['generator','rendering','verifier'].every(k=>s[k]?.revision===identity.revision && s[k]?.id===identity.id) &&
    s.provenance.sourceRevision===manifest.revision && JSON.stringify(s.provenance.manifest)===JSON.stringify(manifest);
  report.checks.push({name:'Current projection adapter and pinned upstream manifest',verdict:valid?'passed':'failed'});
  if (!valid || result.status!==0) report.verdict='failed';
  R.atomic(out,report);
  process.exitCode=report.verdict==='passed'?0:1;
}
