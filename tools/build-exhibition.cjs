'use strict';
const fs=require('node:fs'),path=require('node:path'),R=require('./observatory/runtime.cjs');
const root=R.ROOT;
const sourceManifest=require('../spatialviz-harness/penetration/official-source.json');
const penetrationModules={CrossSection:'cross_section',CubeAssembly:'cube_assembly',CubeCounting:'cube_counting'};
function hasPenetrationReceipt(task){
 const receipt=task.provenance?.officialTools;
 const module=penetrationModules[task.taskType];
 const entry='create_visual_penetration/create_'+module+'.py';
 const compositor='create_composite_image_'+task.taskType;
 return Boolean(module && receipt?.revision===sourceManifest.revision && receipt.modelEntry===entry
  && receipt.freecadLaunches?.some(name=>/^freecad(?:\.exe)?$/i.test(name))
  && receipt.compositor===compositor && receipt.observedFunctions?.[compositor]>0
  && receipt.compositeSha256===task.rendering?.sha256
  && [entry,'utils.py','visual_penetration_tasks_utils.py'].every(file=>receipt.sourceFiles?.[file]===sourceManifest.files[file])
  && receipt.nativeFiles?.some(item=>/\.FCStd$/i.test(item.file)));
}
function discover(){
 const config=R.read(path.join(root,'catalog/harnesses.json')),cases=R.read(path.join(root,'catalog/cases.json')).cases,skills=[],official=[];
 for(const h of config.harnesses){
  const dir=path.join(root,h.id,'skills');if(fs.existsSync(dir))for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name,'skill.json');if(!fs.existsSync(file))continue;const s=R.read(file);if(s.status==='complete'){if(!fs.existsSync(path.join(dir,e.name,'SKILL.md')))throw Error('Missing completed skill');skills.push({...s,source:`https://github.com/DasbootU9607/Spatial-Harness-Library/tree/main/${h.id}/skills/${e.name}`,install:`node tools/install.cjs --harness ${h.id} --skill ${e.name} --destination YOUR_SKILLS_DIRECTORY`});}}
  if(h.collection){
   const source=R.read(path.join(root,'questions/data',h.collection+'.json'));h.officialCount=source.length;h.categories=[...new Set(source.map(s=>s.category))];h.tracks=Object.fromEntries([...new Set(source.map(s=>s.track))].map(t=>[t,source.filter(s=>s.track===t).length]));
   const refs=new Set(skills.filter(s=>s.harnessId===h.id).flatMap(s=>s.officialReferences||[]));
   for(const c of cases.filter(c=>c.harnessId===h.id)){
    for(const id of c.sourceCaseIds || [])refs.add(id);
   }
   for(const s of source.filter((s,i)=>i===0||refs.has(s.id)))official.push({id:s.id,...(h.id==='spatialviz-harness'?{sourceId:s.sourceId}:{}),harnessId:h.id,sourceKind:'official',title:s.type+' · '+(s.level||s.sourceId),description:s.question,thumbnail:'../questions/'+s.image,taskUrl:'../questions/#/'+h.collection+'?case='+encodeURIComponent(s.id),category:s.category,taskType:s.type,difficulty:s.level,source:s.provenance});
  }
 }
 // Keep archived routes intact and expose independently verified mechanical plates.
 for(const c of cases){
  if(c.harnessId!=='spatialviz-harness')continue;
  const task=R.read(path.join(root,c.harnessId,'site',c.taskArtifact));
  c.generationMethod=task.provenance?.generationMethod||'Legacy JavaScript/SVG generator';
  const movementTools={ArrowMoving:'SpatialViz-Bench Arrow Moving models and Matplotlib',BlockMoving:'SpatialViz-Bench Block Moving model and FreeCAD'};
  const usesRecordedTool=(c.generationMethod==='SpatialViz-Bench official FreeCAD + OpenCV/Pillow pipeline'
   && (task.category!=='VisualPenetration' || hasPenetrationReceipt(task)))
   || (task.taskType==='PaperFolding' && c.generationMethod==='SpatialViz-Bench official Paper Folding Matplotlib/Pillow pipeline')
   || (task.taskType==='MechanicalSystem' && task.verifier?.id==='mechanical-system' && c.generationMethod==='Spatial Harness original FreeCAD assembly'
       && task.provenance.native?.renderer==='FreeCADGui activeView.saveImage' && task.rendering?.format==='png'
       && ['assembly.FCStd','front-view.png','assembly-view.png','system.json','geometry.json'].every(f=>fs.existsSync(path.join(root,c.harnessId,'site',path.dirname(c.taskArtifact),f)))
       && R.sha(fs.readFileSync(path.join(root,c.harnessId,'site',path.dirname(c.taskArtifact),'assembly.FCStd')))===task.provenance.native.modelSha256)
   || c.generationMethod===movementTools[task.taskType];
  c.exhibit=c.verification?.verdict==='passed' && usesRecordedTool && Boolean(task.provenance?.sourceRevision);
 }
 for(const archived of cases.filter(c=>c.supersededBy)){
   const replacement=cases.find(c=>c.harnessId===archived.harnessId&&c.id===archived.supersededBy);
   if(!replacement?.exhibit || replacement.supersededBy || replacement.id===archived.id || replacement.taskType!==archived.taskType) throw Error('Invalid replacement for '+archived.id);
   archived.exhibit=false;
 }
 const selection = R.read(path.join(root, 'catalog/spatialviz-showcase.json'));
 const selected = new Set(), runs = new Set();
 const spatialSkills = skills.filter(s => s.harnessId === 'spatialviz-harness');
 const sources = new Map(official.filter(q => q.harnessId === 'spatialviz-harness').map(q => [q.sourceId, q]));
 if (Object.keys(selection).length !== spatialSkills.length) throw Error('The SpatialViz showcase must cover each completed skill.');
 for (const skill of spatialSkills) {
   const groups = selection[skill.id] || [];
   const size = groups.flatMap(group => group.cases).length;
   if (size < 1 || size > 5 || new Set(groups.map(group => group.pattern)).size !== groups.length)
     throw Error('Expected one to five exhibits grouped by distinct patterns for ' + skill.name);
   const patterns = R.read(path.join(root, skill.harnessId, 'skills', skill.packageName, 'references/patterns.json'));
   skill.showcaseGroups = groups.map(group => {
     const pattern = patterns.choices[group.pattern];
     const representative = sources.get(pattern?.reference);
     if (!representative || representative.taskType !== patterns.type || !group.label?.trim() || !group.cases?.length)
       throw Error('Missing representative or label for ' + skill.id + '/' + group.pattern);
     for (const id of group.cases) {
       const item = cases.find(c => c.id === id && c.harnessId === skill.harnessId);
       if (!item?.exhibit || !item.skillIds.includes(skill.id) || selected.has(id) || !item.build?.runId || runs.has(item.build.runId))
         throw Error('Invalid showcase case or repeated construction run: ' + id);
       const record = R.read(path.join(root, skill.harnessId, 'site', item.process));
       const choice = record.events.findLast(event => event.type === 'choice.selected');
       if (record.caseId !== id || record.manifest.id !== item.build.runId || (choice && choice.details.selection !== group.pattern))
         throw Error('Recorded build or pattern mismatch for ' + id);
       item.viewedReferenceIds = [...new Set(record.events.filter(event => event.type === 'reference.viewed')
         .map(event => sources.get(event.details.sourceId)).filter(ref => ref?.taskType === patterns.type).map(ref => ref.id))];
       selected.add(id);
       runs.add(item.build.runId);
     }
     return {...group, representativeId: representative.id};
   });
 }
 for(const c of cases.filter(c=>c.harnessId==='spatialviz-harness'))c.exhibit=selected.has(c.id);
 const maze=R.read(path.join(root,'maze-harness/site/data/catalog.json'));
 for(const s of maze.skills)if(!skills.some(x=>x.id===s.id&&x.harnessId==='maze-harness'))skills.push({...s,harnessId:'maze-harness',status:'complete',officialReferences:s.officialCases,install:'node tools/install.cjs --harness maze-harness --destination YOUR_SKILLS_DIRECTORY'});
 for(const c of maze.cases){const item={...c,harnessId:'maze-harness',skillIds:[c.skill],sourceKind:c.kind==='official'?'official':'agent-authored',taskType:'maze',taskUrl:`player.html?world=${c.world}&room=${c.room}`,processUrl:c.process?`process.html?case=${c.id}`:null,taskArtifact:c.map,solution:c.witness,legacy:true};if(c.kind==='official')official.push(item);else cases.push(item);}
 config.harnesses.find(h=>h.id==='maze-harness').officialCount=256;
 return {schemaVersion:1,harnesses:config.harnesses,skills,cases:require('./observatory/time-privacy.cjs').withoutAbsoluteTimes(cases),official};
}
function build(out){
 const data=discover(),shared=path.join(out,'shared');fs.cpSync(path.join(root,'shared'),shared,{recursive:true});
 fs.cpSync(path.join(root,'maze-harness/site/assets/fonts'),path.join(shared,'fonts'),{recursive:true});
 const revision=R.sha(JSON.stringify(data)+['exhibition.css','exhibition.js','process.js','process.css','process-model.js','build-summary.js','question-shell.js'].map(f=>fs.readFileSync(path.join(root,'shared',f))).join('')+['process-orbit.js','process-orbit.css','process.css'].map(f=>fs.readFileSync(path.join(root,'maze-harness/site',f))).join('')+['index.html','app.js','reader.css'].map(f=>fs.readFileSync(path.join(root,'questions',f))).join('')).slice(0,16);
 fs.writeFileSync(path.join(shared,`process.${revision}.js`),fs.readFileSync(path.join(shared,'process.js'),'utf8').replace("'./process-model.js'",`'./process-model.js?v=${revision}'`).replace("'../maze-harness/process-orbit.js'",`'../maze-harness/process-orbit.js?v=${revision}'`));
 fs.writeFileSync(path.join(shared,'exhibition.js'),fs.readFileSync(path.join(shared,'exhibition.js'),'utf8').replace("'./process.js'",`'./process.${revision}.js'`).replace("'../shared/catalog.json'",`'../shared/catalog.json?v=${revision}'`));
 R.atomic(path.join(shared,'catalog.json'),data);
 const html=(h,page)=>`<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${h.description}"><title>${h.name} · Spatial Harness Library</title><link rel="stylesheet" href="../shared/exhibition.css?v=${revision}">${page==='process'?`<link rel="stylesheet" href="../maze-harness/process.css?v=${revision}"><link rel="stylesheet" href="../maze-harness/process-orbit.css?v=${revision}"><link rel="stylesheet" href="../shared/process.css?v=${revision}">`:''}<script type="module" src="../shared/exhibition.js?v=${revision}"></script></head><body data-harness="${h.id}" data-page="${page}"><a class="skip" href="#main">Skip to content</a><header id="header"></header><main id="main" tabindex="-1"><p role="status">Loading the exhibition…</p></main><footer id="footer"></footer><div id="notice" role="status"></div></body></html>\n`;
 for(const h of data.harnesses){const dir=path.join(out,h.id);for(const [file,page] of [['index.html','home'],['skill.html','skill'],['task.html','task'],['build.html','process']])fs.writeFileSync(path.join(dir,file),html(h,page));if(!h.legacy)fs.writeFileSync(path.join(dir,'process.html'),html(h,'process'));}
 // Existing source browsers retain their routes and behavior; share the typography and shell styling.
 for(const file of ['questions/index.html','questions/sources.html']){const full=path.join(out,file);let text=fs.readFileSync(full,'utf8');text=text.replace(/src="app\.js(?:\?[^"]*)?"/,`src="app.js?v=${revision}"`).replace(/href="reader\.css(?:\?[^"]*)?"/,`href="reader.css?v=${revision}"`);text=text.replace('</head>',`<link rel="stylesheet" href="../shared/exhibition.css?v=${revision}"><script type="module" src="../shared/question-shell.js?v=${revision}"></script></head>`);fs.writeFileSync(full,text);}
 for(const file of fs.readdirSync(path.join(out,'maze-harness')).filter(x=>x.endsWith('.html')&&!['index.html','skill.html','task.html','build.html','process-player.html'].includes(x))){const full=path.join(out,'maze-harness',file);fs.writeFileSync(full,fs.readFileSync(full,'utf8').replace('</head>',`<link rel="stylesheet" href="../shared/exhibition.css?v=${revision}"></head>`));}
 return data;
}
module.exports={discover,build};
