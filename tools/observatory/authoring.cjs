'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {randomInt} = require('node:crypto');
const R = require('./runtime.cjs');

function configuration(skill) {
  return R.read(path.join(skill, 'references', 'patterns.json'));
}

function source(skill, sourceId) {
  const type = configuration(skill).type;
  const original = R.read(path.join(R.ROOT, 'questions/data/spatialviz.json'))
    .find(q => q.type === type && q.sourceId === sourceId);
  if (!original) throw Error('Choose an official source ID from ' + type);
  return {id: original.id, sourceId, question: original.question, options: original.options,
    answer: original.answer, explanation: original.explanation, image: path.join(R.ROOT, 'questions', original.image)};
}

function guide({skill, choice, eligible, task, title, viewer, root, binding}) {
  const config = configuration(skill);
  const names = eligible === undefined ? Object.keys(config.choices) : eligible.split(',').map(s => s.trim());
  if (!names.length || new Set(names).size !== names.length || names.some(id => !Object.hasOwn(config.choices,id))) {
    throw Error('Eligible choices must be distinct supported IDs for this skill.');
  }
  const menu = names.map(id => ({id, label: config.choices[id].label}));
  if (!choice) return {choices:menu, random:'random'};
  const selected = choice === 'random' ? names[randomInt(names.length)] : choice;
  if (!names.includes(selected)) throw Error('Choice does not meet the eligible set: ' + selected);
  const run = R.start({task,title,harness:'spatialviz-harness',skill,viewer,root,binding});
  const entry = config.choices[selected];
  R.S.updateManifest(run, {authoring:{selected, skill:path.resolve(skill)}});
  R.event(run, 'choice.selected', {selection:selected, eligible:names, selectionMode:choice==='random'?'random':'specified'});
  const file = path.join(skill, 'references', 'patterns.json');
  const lines = fs.readFileSync(file,'utf8').split(/\r?\n/);
  const start = lines.indexOf('    "' + selected + '": {');
  const end = lines.findIndex((line,i) => i>start && /^    \},?$/.test(line));
  if (start < 0 || end < 0) throw Error('Cannot locate the selected pattern record.');
  let pattern;
  R.deliver(run, file, {start:start+1,end:end+1,delivery:'author',sink:text=>{pattern=text;}});
  return {run, selected, pattern, workflow:path.join(R.ROOT,'docs/spatialviz-authoring.md'),
    reference:deliverSource(run,entry.reference), targets:entry.targets,
    parameterDefaults:entry.defaults};
}

function settings(run) {
  const a = R.active(run).authoring;
  if (!a) throw Error('Start a guided authoring run with the guide command.');
  return {skill:a.skill, choice:configuration(a.skill).choices[a.selected]};
}

function deliverSource(run, sourceId) {
  const ref=source(settings(run).skill, sourceId);
  R.event(run,'reference.delivered',{sourceId,label:'Official question, choices, answer and explanation',
    sha256:R.sha([ref.question,ref.options,ref.answer,ref.explanation])});
  return ref;
}

function viewed(run, sourceId, observation) {
  const {skill} = settings(run);
  if (!observation?.trim()) throw Error('Describe the visible relationship you inspected in the original image.');
  const ref = source(skill,sourceId);
  if (!R.S.readRun(run).events.some(e=>e.type==='reference.delivered' && e.details.sourceId===sourceId)) {
    throw Error('Resolve this reference with source before inspecting and recording its original.');
  }
  // The observer attests to viewing. Resolving a path, reading metadata or hashing bytes cannot establish that.
  const digest=R.sha(fs.readFileSync(ref.image));
  R.event(run,'reference.viewed',{sourceId,sourceSha256:digest,observation},
    {actor:'author',origin:'agent_statement'});
  return {sourceId, imageSha256:digest};
}

const sentences = ['inference','condition','foil','evidence'];
function design(run, input, parentId) {
  const {choice} = settings(run);
  if (!choice.targets.includes(input.target)) throw Error('Choose a supported inference check: '+choice.targets.join(', '));
  for (const key of sentences) {
    if (typeof input[key] !== 'string' || !input[key].trim()) throw Error('Describe '+key+' for this instance.');
  }
  if (input.target === 'critical-joint' && (typeof input.joint !== 'string' || !input.joint.trim())) {
    throw Error('Name the decisive printed joint using its kind and ordered body IDs, for example cord:D/W.');
  }
  const state=R.S.readRun(run);
  if (parentId) R.candidate(run,parentId);
  const seen=[...new Set(state.events.filter(e=>e.type==='reference.viewed').map(e=>e.details.sourceId))];
  if (!seen.length) throw Error('Inspect a matching original and record its source ID and a visible observation first.');
  if (!seen.includes(choice.reference) && !input.referenceReason?.trim()) {
    throw Error('Explain how the inspected alternative represents this pattern in referenceReason.');
  }
  const details=Object.fromEntries(sentences.map(key=>[key,input[key].trim()]));
  Object.assign(details,{target:input.target,sourceIds:seen});
  if (input.joint) details.joint=input.joint;
  if (input.referenceReason) details.referenceReason=input.referenceReason;
  return R.event(run,'design.note',{design:details,goal:details.inference,reason:details.condition,
    change:details.foil,expectedChecks:[details.evidence]}, {actor:'author',origin:'agent_statement',candidateId:parentId||null});
}

function latestDesign(state) {
  const e=state.events.findLast(e=>e.type==='design.note' && e.details.design);
  if (!e) throw Error('Record inference, condition, closest foil and distinguishing evidence before generation.');
  return e;
}

function parameters(run,input) {
  const state=R.S.readRun(run);
  if (!state.manifest.authoring) return input;
  latestDesign(state);
  const {choice} = settings(run);
  const params={...choice.defaults,...input};
  for (const [key, allowed] of Object.entries(choice.accept || {})) {
    if (!allowed.includes(params[key])) throw Error('Selected '+state.manifest.authoring.selected+' requires '+key+' in '+allowed.join(', '));
  }
  if (choice.output && !params.system?.targets?.some(t=>t.kind===choice.output)) {
    throw Error('Supply your native system with a '+choice.output+' output. See references/freecad-authoring.md.');
  }
  return params;
}

const groups={
  'rotation-folding':['2d-rotation','3d-rotation','3view-projection','cube-reconstruction','cube-unfolding'],
  solids:['cross-sections','cube-assembly','cube-counting','mechanical-system'],
  motion:['paper-folding','arrow-movement','block-movement']
};
function assess(run,c,spec,report) {
  const state=R.S.readRun(run);
  const a=state.manifest.authoring;
  if (!a) return;
  const id=state.manifest.skill.id.replace(/^spatialviz-/,'');
  const checker=Object.keys(groups).find(group=>groups[group].includes(id));
  const note=state.events.find(e=>e.id===c.designId && e.type==='design.note');
  let result;
  try {
    if (!note?.details.design) throw Error('Missing candidate-bound design.');
    const {choice,skill}=settings(run);
    const adapter=R.read(path.join(skill,'skill.json')).adapter;
    if (spec.verifier?.id!==require('./adapters/'+adapter+'.cjs').identity.id) throw Error('Candidate uses a different domain verifier.');
    // Recheck the saved payload as well as command-line parameters (also covers imported candidates).
    const params=spec.generator?.parameters || {};
    for (const [key,allowed] of Object.entries(choice.accept||{})) {
      if (!allowed.includes(params[key])) throw Error('Candidate parameter '+key+' differs from the selected pattern.');
    }
    if(choice.output && !params.system?.targets?.some(t=>t.kind===choice.output)) throw Error('Candidate output differs from the selected mechanism.');
    result=require('./reasoning/'+checker+'.cjs').check(spec,note.details.design,
      {run,candidateId:c.id,skillId:id,specPath:path.join(run,c.specPath),report});
  } catch (e) {
    result={passed:false,feedback:e.message,evidence:null};
  }
  const check={name:'Declared reasoning: '+(note?.details.design?.target || 'unbound'),designId:c.designId,
    verdict:result.passed===true?'passed':'failed',evidence:result.evidence,feedback:result.feedback};
  report.checks.push(check);
  if (check.verdict==='failed') report.verdict='failed';
}
module.exports={guide,source,deliverSource,viewed,design,settings,parameters,latestDesign,assess};
