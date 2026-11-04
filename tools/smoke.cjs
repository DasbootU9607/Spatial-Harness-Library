'use strict';
// Real current-client fixture. Protocol tests use separate synthetic bindings.
const fs=require('node:fs'),path=require('node:path'),R=require('./observatory/runtime.cjs'),A=require('./observatory/adapters/rotation.cjs');
const dir=path.join(R.ROOT,'.harness/smoke'),task=path.join(dir,'task.json'),skill=path.join(R.ROOT,'spatialviz-harness/skills/spatialviz-discrete-rotation');
if(fs.existsSync(path.join(dir,'state.json')))throw Error('Smoke already exists; resume explicitly rather than overwrite its history.');
fs.mkdirSync(dir,{recursive:true});
const run=R.start({task,title:'Quarter-turn construction · current-client smoke',harness:'spatialviz-harness',skill,benchmark:'SpatialViz-Bench',category:'MentalRotation',taskType:'discrete-rotation-demo'});
R.atomic(path.join(dir,'state.json'),{run,task,skill});
R.deliver(run,path.join(skill,'references/construction.md'));
R.note(run,{goal:'Exercise candidate revision and exact verification in a bounded demonstration.',sources:['Packaged discrete quarter-turn construction contract'],change:'Create a seeded figure and intentionally incorrect answer for the first verification attempt.',reason:'Check that failed evidence remains visible and cannot be accepted.',expectedChecks:['First answer check fails','Corrected revision passes independently']});
const first=A.generate(17);first.answer.index=(first.answer.index+1)%4;R.atomic(task,first);const c1=R.save(run,task);R.render(run,c1.id,A);
function verify(c){const fp=path.join(dir,c.id+'-fingerprints.json');R.atomic(fp,c.fingerprints);return R.execute(run,process.execPath,[require.resolve('./observatory/adapters/rotation.cjs'),path.join(run,c.specPath),c.id,fp,path.join(dir,'verification.json')],{candidateId:c.id,kind:'verification',report:path.join(dir,'verification.json'),verifier:A.identity});}
if(verify(c1).verdict!=='failed')throw Error('The negative control did not fail');
R.note(run,{goal:'Deliver the verified quarter-turn task.',sources:['Failed v001 report'],change:'Correct the designated answer without changing geometry or option order.',reason:'The independent rotation matrix identifies the unique matching option.',expectedChecks:['Unique answer','Exact generator replay','Version-bound rendering']},c1.id);
R.atomic(task,A.generate(17));const c2=R.save(run,task,{parentId:c1.id,parentBasis:'Explicit answer correction following failed v001 verification'});const preview=R.render(run,c2.id,A);if(verify(c2).verdict!=='passed')throw Error('Corrected candidate failed');
R.atomic(path.join(dir,'state.json'),{run,task,skill,candidateId:c2.id,preview});console.log(JSON.stringify({run,candidateId:c2.id,preview:path.join(run,preview.artifactPath)}));
