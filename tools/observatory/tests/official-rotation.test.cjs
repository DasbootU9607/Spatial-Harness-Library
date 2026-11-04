'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const R=require('../runtime.cjs'),P=require('../../publish.cjs');
test('Official independent geometry and saved FreeCAD pixel regressions',()=>{
 const r=spawnSync(process.env.SPATIALVIZ_PYTHON||'python',['-m','unittest','discover','-s','spatialviz-harness/official-rotation','-p','test_*.py'],{cwd:R.ROOT,encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024});assert.equal(r.status,0,r.stdout+r.stderr);
});
test('Official generation requires a live shared run; no fallback',()=>{
 for(const dim of [2,3])assert.throws(()=>require(`../adapters/official-rotation-${dim}d.cjs`).generate(1,{}),/recorder/);
});
test('Published official tasks bind to the current verifier and reject tool drift',()=>{
 const cases=R.read(path.join(R.ROOT,'catalog/cases.json')).cases;
 for(const c of cases.filter(c=>c.harnessId==='spatialviz-harness')){
  const file=path.join(R.ROOT,c.harnessId,'site',c.taskArtifact),spec=R.read(file);
  if(spec.rendering?.presentation!=='official-single-view')continue;
  const adapter=require(`../adapters/official-rotation-${spec.dimension}d.cjs`),fp=R.fingerprints(spec,fs.readFileSync(file));
  const report=adapter.verify(spec,'regression',fp);assert.equal(report.verdict,'passed',JSON.stringify(report.checks.filter(c=>c.verdict!=='passed')));
  spec.verifier.revision='old';assert.equal(adapter.verify(spec,'regression',fp).verdict,'failed');
 }
});
test('Recorded PNG previews retain exact bytes and extension',()=>{
 const root=path.join(R.ROOT,'.harness/tests');fs.mkdirSync(root,{recursive:true});const dir=fs.mkdtempSync(path.join(root,'official-png-'));
 const bytes=Buffer.from('89504e470d0a1a0a','hex');fs.writeFileSync(path.join(dir,'preview.png'),bytes);
 const version={id:'v001',sha256:'spec',fingerprints:{rendering:'pixels'}};
 const events=[{type:'render.completed',candidateId:'v001',details:{specification:'spec',rendering:'pixels',artifactPath:'preview.png',sha256:R.sha(bytes),renderer:{id:'official',revision:'prior'}}}];
 const result=P.previewBytes(dir,version,events,{render(){throw Error('Do not redraw archived pixels');}});
 assert.deepEqual(result.bytes,bytes);assert.equal(result.extension,'png');assert.equal(result.renderer.revision,'prior');
});
