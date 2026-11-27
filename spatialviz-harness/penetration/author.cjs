'use strict';
const fs=require('node:fs');
const path=require('node:path');
const R=require('../../tools/observatory/runtime.cjs');
const P=require('../../tools/publish.cjs');

module.exports=function author(skill,args) {
  const kind=path.basename(skill).replace(/^spatialviz-/,'');
  const adapter=require('../../tools/observatory/adapters/penetration-'+kind+'.cjs');
  const [action,...flags]=args;
  function arg(name,defaultValue) {
    const i=flags.indexOf('--'+name);
    if (i>=0 && i+1<flags.length) return flags[i+1];
    if (defaultValue!==undefined) return defaultValue;
    throw Error('Missing --'+name);
  }
  if (action==='test') {
    const r=require('node:child_process').spawnSync(process.env.SPATIALVIZ_PYTHON||'python',
      ['-B',path.join(__dirname,'tests.py'),kind],{stdio:'inherit'});
    process.exitCode=r.status??1;
    return;
  }
  const out=path.resolve(arg('out'));
  const task=path.join(out,'task.json'),receipt=path.join(out,'record.json');
  if (action==='accept') {
    const {run,id,verdict}=R.read(receipt);
    if (verdict!=='passed') throw Error('A passing verification is required');
    const review=arg('review');
    R.event(run,'visual.review',{review,outcome:'passed'},{candidateId:id,origin:'agent_statement',actor:'author'});
    R.finish(run,id);
    const sourceSkill=path.join(R.ROOT,'spatialviz-harness','skills',path.basename(skill));
    const prepared=P.prepare({run,task,skill:sourceSkill});
    R.atomic(path.join(out,'delivery.json'),prepared);
    if (!flags.includes('--stage')) {
      const pushed=P.publish(prepared);
      return P.observe(pushed.commit,prepared.urls);
    }
    return;
  }
  if (action==='solve') {
    const r=require('node:child_process').spawnSync(process.env.SPATIALVIZ_PYTHON||'python',
      ['-B',path.join(__dirname,'engine.py'),'verify',kind,task,path.join(out,'independent.json')],{stdio:'inherit'});
    if (r.status!==0) throw Error('Solver failed');
    const result=R.read(path.join(out,'independent.json'));
    console.log(JSON.stringify(result,null,2));
    process.exitCode=result.verdict==='passed'?0:1;
    return;
  }
  if (!['generate','revise'].includes(action)) throw Error('Choose generate, revise, solve, test or accept');
  const prior=action==='revise'?R.read(receipt):null;
  if (prior) {
    R.active(prior.run);
    const archive=path.join(out,prior.id);
    fs.mkdirSync(archive);
    for (const filename of ['task.json','question.png','record.json','verification.json'])
      fs.copyFileSync(path.join(out,filename),path.join(archive,filename));
  } else if (fs.existsSync(out) && fs.readdirSync(out).length) throw Error('Choose an empty output folder');
  fs.mkdirSync(out,{recursive:true});
  const run=prior?.run||R.start({task,title:'Author '+kind,harness:'spatialviz-harness',skill,benchmark:'SpatialViz-Bench',
    category:'VisualPenetration',taskType:kind,viewer:false});
  const reference=path.join(skill,'references','design.md');
  R.deliver(run,reference,{sink:()=>{}});
  const params=flags.includes('--params')?R.read(arg('params')):{};
  if (flags.includes('--mechanism')) params.mechanism=arg('mechanism');
  R.note(run,{goal:'Generate a new '+kind+' question',change:'Construct '+(params.mechanism||'the default mechanism'),
    sources:['Official inventory and design notes'],expectedChecks:['Independent geometry','Media review']});
  const spec=adapter.generate(Number(arg('seed')) ,params,{run});
  R.atomic(task,spec);
  const candidate=R.save(run,task,prior?{parentId:prior.id,parentBasis:arg('basis')} : {});
  R.event(run,'build.saved',{generator:adapter.identity},{candidateId:candidate.id});
  const preview=R.render(run,candidate.id,adapter);
  fs.copyFileSync(path.join(run,preview.artifactPath),path.join(out,'question.png'));
  const fp=path.join(run,'artifacts','inputs.json'),report=path.join(run,'verification.json');
  R.atomic(fp,candidate.fingerprints);
  const result=R.execute(run,process.execPath,[require.resolve('../../tools/observatory/adapters/penetration-'+kind+'.cjs'),
    path.join(run,candidate.specPath),candidate.id,fp,report],
    {candidateId:candidate.id,kind:'verification',report,verifier:adapter.identity});
  fs.copyFileSync(report,path.join(out,'verification.json'));
  R.atomic(receipt,{run,id:candidate.id,verdict:result.verdict,seed:spec.generator.seed,parameters:params});
  console.log(kind, candidate.id,result.verdict,out);
  process.exitCode=result.verdict==='passed'?0:1;
};
