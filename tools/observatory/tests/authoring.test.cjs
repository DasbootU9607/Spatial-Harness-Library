'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const R=require('../runtime.cjs');
const A=require('../authoring.cjs');
const P=require('../projection.cjs');

const skillRoot=path.join(R.ROOT,'spatialviz-harness/skills');
const catalog=R.read(path.join(R.ROOT,'questions/data/spatialviz.json'));
const temporary=path.join(R.ROOT,'.harness/tests');
fs.mkdirSync(temporary,{recursive:true});

test('every offered choice resolves a corresponding official image and only lists supported generator presets',()=>{
  for(const pkg of fs.readdirSync(skillRoot)){
    const dir=path.join(skillRoot,pkg);
    const config=R.read(path.join(dir,'references/patterns.json'));
    const menu=A.guide({skill:dir});
    assert.ok(menu.choices.length>=2);
    for(const {id} of menu.choices){
      const opt=config.choices[id], original=catalog.find(x=>x.sourceId===opt.reference);
      assert.equal(original?.type,config.type,id+' '+opt.reference);
      assert.ok(fs.statSync(path.join(R.ROOT,'questions',original.image)).size>0);
      assert.ok(opt.observed && opt.construct && opt.targets.length);
      for(const [key,values] of Object.entries(opt.accept)){
        assert.ok(values.includes(opt.defaults[key]),id+' '+key);
      }
    }
  }
});

test('a freshly installed skill lists choices; constrained random records its choice and never fabricates an image inspection',()=>{
  const dest=fs.mkdtempSync(path.join(temporary,'installed-'));
  const pkg='spatialviz-2d-rotation';
  execFileSync(process.execPath,[path.join(R.ROOT,'tools/install.cjs'),'--harness','spatialviz-harness','--skill',pkg,'--destination',dest]);
  const skill=path.join(dest,pkg);
  const bridge=path.join(skill,'scripts/construct.cjs');
  const menu=JSON.parse(execFileSync(process.execPath,[bridge,'guide'],{encoding:'utf8'}));
  assert.deepEqual(menu.choices.map(x=>x.id),['colored','patterned','geometric']);
  const options={skill,choice:'random',eligible:'patterned',task:path.join(dest,'question.json'),title:'Protocol test',
    viewer:false,root:dest,binding:{runtime:null,sessionId:'test'}};
  assert.throws(()=>A.guide({...options,eligible:'nope'}),/supported/);
  assert.throws(()=>A.guide({...options,choice:'colored'}),/eligible/);
  const {run,reference}=A.guide(options);
  assert.equal(reference.sourceId,'MentalRotation/2DRotation/Level1/1-2-3');
  const initial=P.project(run).events;
  assert.equal(initial.filter(e=>e.type==='reference.viewed').length,0);
  assert.deepEqual(initial.find(e=>e.type==='choice.selected').details.eligible,['patterned']);
  assert.equal(initial.find(e=>e.type==='resource.read').details.delivery,'author');
  assert.throws(()=>A.parameters(run,{}),/before generation/);
  const input={target:'motif-orientation',inference:'Track the tilted pair after the quarter turn.',
    condition:'The corner and the occupied cells match both choices.',
    foil:'The pair keeps its initial axis in the reflected option.',
    evidence:'Ignoring the pair axis must leave both options.'};
  assert.throws(()=>A.design(run,input),/original/);
  assert.throws(()=>A.viewed(run,'VisualPenetration/CubeCounting/Level0/0-3-3-3-7','x'),/2DRotation/);
  A.viewed(run,reference.sourceId,'Test attestation for the pair and corner.');
  assert.throws(()=>A.design(run,{...input,evidence:''}),/evidence/);
  assert.throws(()=>A.design(run,{...input,target:'third-view-essential'}),/supported/);
  const first=A.design(run,input);
  const params=A.parameters(run,{rows:2});
  assert.equal(params.mode,'patterned');
  assert.throws(()=>A.parameters(run,{mode:'colored'}),/requires mode/);
  const spec=R.read(path.join(R.ROOT,'spatialviz-harness/site/records/authored-f3e2bb897cc215f0aba5f0a0/task.json'));
  R.atomic(options.task,spec);
  const v1=R.save(run,options.task);
  assert.equal(v1.designId,first.id);
  const next=A.design(run,{...input,condition:'The corner and both rectangular dimensions agree.'},v1.id);
  const v2=R.save(run,options.task,{parentId:v1.id,parentBasis:'Revise the stated condition.'});
  assert.equal(v2.designId,next.id);
  assert.equal(R.candidate(run,v1.id).designId,first.id);
  const report={checks:[],verdict:'passed'};
  A.assess(run,v2,spec,report);
  assert.equal(report.checks[0].verdict,'passed');
  assert.equal(report.checks[0].designId,next.id);
  assert.deepEqual(P.project(run).events.find(e=>e.id===next.id).details.design.sourceIds,[reference.sourceId]);
  const invoke=(command,...args)=>execFileSync(process.execPath,[bridge,command,'--run',run,...args],
    {encoding:'utf8',stdio:['ignore','pipe','pipe']});
  assert.throws(()=>invoke('generate','--task',options.task),/Keep the previous candidate/);
  invoke('verify','--candidate',v2.id);
  // A review entered before a preview exists cannot attest to that rendered candidate.
  invoke('review','--candidate',v2.id,'--outcome','passed','--review','Premature test observation.');
  assert.throws(()=>R.finish(run,v2.id),/Inspect the final preview/);
  invoke('render','--candidate',v2.id);
  assert.throws(()=>R.finish(run,v2.id),/Inspect the final preview/);
  invoke('review','--candidate',v2.id,'--outcome','passed','--review','Dot rows in B have a different axis from A.');
  assert.equal(JSON.parse(invoke('finish','--candidate',v2.id,'--local-only')).status,'sealed-local');

});
