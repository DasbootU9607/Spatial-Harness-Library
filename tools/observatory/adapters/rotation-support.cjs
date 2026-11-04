'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const D='All three other options are incorrect';
function make(dimension){
 const directory=path.resolve(__dirname,`../../../spatialviz-harness/skills/spatialviz-${dimension}d-rotation/scripts`);
 const Model=require(path.join(directory,'model.cjs')),Solver=require(path.join(directory,'solve.cjs')),Renderer=require(path.join(directory,'render.cjs'));
 const revision=crypto.createHash('sha256').update(fs.readFileSync(__filename));for(const file of ['model.cjs','solve.cjs','render.cjs'])revision.update(fs.readFileSync(path.join(directory,file)));
 const identity={id:`spatialviz-${dimension}d-rotation`,revision:revision.digest('hex')};
 const question=(mode,polarity)=>dimension===2?`Which ${mode==='colored'?'colored':'patterned'} grid can be obtained by rotating the original grid only, without reflection or other changes? The red corner and internal patterns belong to the grid. Choose A, B, C, or D.`:`Which cube model ${polarity==='can'?'can':'cannot'} be obtained by rotating the original model only, without reflection or structural changes? Use the paired views and complete layer diagrams. Choose A, B, C, or D.`;
 const rendering={...identity,...Renderer.config};
 function answer(geometry,options,polarity){const relations=options.slice(0,3).map(o=>Solver.compare(geometry,o.geometry));const qualifying=relations.map((r,i)=>(polarity==='can'?r.equivalent:!r.equivalent)?i:-1).filter(i=>i>=0);const index=qualifying.length?qualifying[0]:3;
  const explanations=relations.map((r,i)=>({label:'ABC'[i],equivalent:r.equivalent,qualifies:qualifying.includes(i),explanation:r.explanation+(polarity==='cannot'?` This ${r.equivalent?'does not satisfy':'satisfies'} the request for a model that cannot be obtained by rotation.`:'')}));
  explanations.push({label:'D',qualifies:qualifying.length===0,explanation:`D means none of A, B, C satisfies the question. ${qualifying.length} graphical option(s) satisfy it, so D is ${qualifying.length?'not selected':'selected'}.`});
  return {index,explanation:`Option ${'ABCD'[index]} is the unique option satisfying the ${polarity==='can'?'rotation-equivalent':'not rotation-equivalent'} condition.`,options:explanations,relations,qualifying};
 }
 function generate(seed=17,params={}){const m=Model.generate(seed,params),options=m.options.map((g,i)=>({label:'ABC'[i],type:'figure',geometry:g})).concat({label:'D',type:'text',text:D});const a=answer(m.geometry,options,m.polarity);return {schemaVersion:1,title:`${dimension}D rotation / ${dimension===2?m.parameters.mode:m.polarity==='can'?'find the matching solid':'find the changed solid'}`,description:'Newly constructed and independently verified rotation task.',category:'MentalRotation',taskType:`${dimension}d-rotation`,difficulty:{label:'Unranked',basis:'No human difficulty calibration; official source levels are not inherited.'},question:question(m.parameters.mode,m.polarity),polarity:m.polarity,geometry:m.geometry,options,answer:{index:a.index,explanation:a.explanation,options:a.options},generator:{...identity,seed,parameters:m.parameters,operations:m.operations},rendering:structuredClone(rendering),contract:{answerMode:'unique-A-C',graphicalOptions:3,textOptionD:D,properRotations:dimension===2?4:24,translation:true,reflection:false},verifier:{...identity},provenance:{sourceKind:'agent-authored',note:'Constructed example, separate from official reference questions.'}};}
 function verify(s,candidateId,fingerprints){
  const checks=[],check=(name,ok,detail)=>checks.push({name,verdict:ok?'passed':'failed',...(detail?{detail}:{} )});let result,visual;
  try{
   check('Supported task and question polarity',s.taskType===`${dimension}d-rotation`&&(dimension===2?s.polarity==='can':['can','cannot'].includes(s.polarity))&&s.question===question(s.generator?.parameters?.mode,s.polarity));
   const optionsOK=Array.isArray(s.options)&&s.options.length===4&&s.options.slice(0,3).every((o,i)=>o.label==='ABC'[i]&&o.type==='figure'&&o.geometry)&&s.options[3].label==='D'&&s.options[3].type==='text'&&s.options[3].text===D&&!s.options[3].geometry;
   check('Final A-C figures and D text semantics',optionsOK);
   const models=[s.geometry,...(optionsOK?s.options.slice(0,3).map(o=>o.geometry):[])],valid=optionsOK&&models.every(Solver.valid);
   check(dimension===2?'Bounded rectangular grids, motifs and corner coordinates':'Unique equal lattice cubes, bounded extent and face connectivity',valid);
   check('Explicit unique A-C rotation contract',JSON.stringify(s.contract)===JSON.stringify({answerMode:'unique-A-C',graphicalOptions:3,textOptionD:D,properRotations:dimension===2?4:24,translation:true,reflection:false}));
   check('Exact renderer and verifier revisions',JSON.stringify(s.rendering)===JSON.stringify(rendering)&&JSON.stringify(s.verifier)===JSON.stringify(identity)&&s.generator?.revision===identity.revision&&Number.isSafeInteger(s.generator?.seed));
   if(valid){
    if(dimension===2)check('Declared grid mode agrees with actual geometry',['colored','patterned'].includes(s.generator?.parameters?.mode)&&models.every(g=>s.generator.parameters.mode==='colored'?g.cells.every(c=>c.glyph.points.length===0):g.cells.some(c=>c.glyph.points.length>0)));
    check('Distinct displayed A-C options',new Set(models.slice(1).map(Solver.canonical)).size===3);
    result=answer(s.geometry,s.options,s.polarity);
    check('Independent rotation enumeration and unique final answer',result.qualifying.length===1&&result.qualifying[0]===s.answer?.index,`Qualifying labels: ${result.qualifying.map(i=>'ABC'[i]).join(', ')||'none'}.`);
    check('Per-option explanations agree with computed structural witnesses',JSON.stringify(s.answer?.options)===JSON.stringify(result.options)&&s.answer?.explanation===result.explanation);
    if(dimension===3){visual=models.map(Renderer.visualAudit);check('Complete layer encoding independently round-trips to all cubes',visual.every(v=>v.complete&&v.minimumCellPixels>=18),JSON.stringify(visual));}
    else check('Unoccluded geometry at declared minimum display size',Renderer.config.cellSize>=46,'Every cell, motif and external red corner is drawn; inspect the final SVG at full size.');
   }
  }catch(e){check('Well-formed supported specification',false,e.message);}
  return {schemaVersion:1,candidateId,testedFingerprints:fingerprints,verifier:identity,verdict:checks.every(c=>c.verdict==='passed')?'passed':'failed',checks,scope:`Independent ${dimension===2?'four planar':'24 proper spatial'} rotations, structural validity, option semantics and uniqueness, label/explanation consistency, exact rendering contract${dimension===3?' and complete layer encoding':''}. Geometry and diagram coverage do not replace recorded human/agent visual review; no difficulty claim.`};
 }
 return {identity,generate,verify,render:Renderer.render,answer,Solver,Model,Renderer};
}
function cli(adapter){const R=require('../runtime.cjs'),[spec,cid,fp,report]=process.argv.slice(2);const r=adapter.verify(R.read(spec),cid,R.read(fp));R.atomic(report,r);console.log(JSON.stringify({verdict:r.verdict,checks:r.checks}));process.exitCode=r.verdict==='passed'?0:1;}
module.exports={make,cli};
