'use strict';
const fs=require('node:fs'),path=require('node:path'),R=require('./observatory/runtime.cjs');
const root=R.ROOT;
function discover(){
 const config=R.read(path.join(root,'catalog/harnesses.json')),cases=R.read(path.join(root,'catalog/cases.json')).cases,skills=[],official=[];
 for(const h of config.harnesses){
  const dir=path.join(root,h.id,'skills');if(fs.existsSync(dir))for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name,'skill.json');if(!fs.existsSync(file))continue;const s=R.read(file);if(s.status==='complete'){if(!fs.existsSync(path.join(dir,e.name,'SKILL.md')))throw Error('Missing completed skill');skills.push({...s,source:`https://github.com/DasbootU9607/Spatial-Harness-Library/tree/main/${h.id}/skills/${e.name}`,install:`node tools/install.cjs --harness ${h.id} --destination YOUR_SKILLS_DIRECTORY`});}}
  if(h.collection){const source=R.read(path.join(root,'questions/data',h.collection+'.json'));h.officialCount=source.length;h.categories=[...new Set(source.map(s=>s.category))];h.tracks=Object.fromEntries([...new Set(source.map(s=>s.track))].map(t=>[t,source.filter(s=>s.track===t).length]));const refs=new Set(skills.filter(s=>s.harnessId===h.id).flatMap(s=>s.officialReferences||[]));for(const s of source.filter((s,i)=>i===0||refs.has(s.id)))official.push({id:s.id,harnessId:h.id,sourceKind:'official',title:s.type+' · '+(s.level||s.sourceId),description:s.question,thumbnail:'../questions/'+s.image,taskUrl:'../questions/#/'+h.collection+'?case='+encodeURIComponent(s.id),category:s.category,taskType:s.type,difficulty:s.level,source:s.provenance});}
 }
 const maze=R.read(path.join(root,'maze-harness/site/data/catalog.json'));
 for(const s of maze.skills)if(!skills.some(x=>x.id===s.id&&x.harnessId==='maze-harness'))skills.push({...s,harnessId:'maze-harness',status:'complete',officialReferences:s.officialCases,install:'node tools/install.cjs --harness maze-harness --destination YOUR_SKILLS_DIRECTORY'});
 for(const c of maze.cases){const item={...c,harnessId:'maze-harness',skillIds:[c.skill],sourceKind:c.kind==='official'?'official':'agent-authored',taskType:'maze',taskUrl:`player.html?world=${c.world}&room=${c.room}`,processUrl:c.process?`process.html?case=${c.id}`:null,taskArtifact:c.map,solution:c.witness,legacy:true};if(c.kind==='official')official.push(item);else cases.push(item);}
 config.harnesses.find(h=>h.id==='maze-harness').officialCount=256;
 return {schemaVersion:1,harnesses:config.harnesses,skills,cases,official};
}
function build(out){
 const data=discover(),shared=path.join(out,'shared');fs.cpSync(path.join(root,'shared'),shared,{recursive:true});
 fs.cpSync(path.join(root,'maze-harness/site/assets/fonts'),path.join(shared,'fonts'),{recursive:true});
 const revision=R.sha(JSON.stringify(data)+['exhibition.css','exhibition.js','process.js'].map(f=>fs.readFileSync(path.join(root,'shared',f))).join('')).slice(0,16);
 fs.copyFileSync(path.join(shared,'process.js'),path.join(shared,`process.${revision}.js`));
 fs.writeFileSync(path.join(shared,'exhibition.js'),fs.readFileSync(path.join(shared,'exhibition.js'),'utf8').replace("'./process.js'",`'./process.${revision}.js'`).replace("'../shared/catalog.json'",`'../shared/catalog.json?v=${revision}'`));
 R.atomic(path.join(shared,'catalog.json'),data);
 const html=(h,page)=>`<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${h.description}"><title>${h.name} · Spatial Harness Library</title><link rel="stylesheet" href="../shared/exhibition.css?v=${revision}"><script type="module" src="../shared/exhibition.js?v=${revision}"></script></head><body data-harness="${h.id}" data-page="${page}"><a class="skip" href="#main">Skip to content</a><header id="header"></header><main id="main" tabindex="-1"><p role="status">Loading the exhibition…</p></main><footer id="footer"></footer><div id="notice" role="status"></div></body></html>\n`;
 for(const h of data.harnesses){const dir=path.join(out,h.id);for(const [file,page] of [['index.html','home'],['skill.html','skill'],['task.html','task'],['build.html','process']])fs.writeFileSync(path.join(dir,file),html(h,page));if(!h.legacy)fs.writeFileSync(path.join(dir,'process.html'),html(h,'process'));}
 // Existing source browsers retain their routes and behavior; share the typography and shell styling.
 for(const file of ['questions/index.html','questions/sources.html']){const full=path.join(out,file);let text=fs.readFileSync(full,'utf8');text=text.replace('</head>',`<link rel="stylesheet" href="../shared/exhibition.css?v=${revision}"><script type="module" src="../shared/question-shell.js?v=${revision}"></script></head>`);fs.writeFileSync(full,text);}
 for(const file of fs.readdirSync(path.join(out,'maze-harness')).filter(x=>x.endsWith('.html')&&!['index.html','skill.html','task.html','build.html','process-player.html'].includes(x))){const full=path.join(out,'maze-harness',file);fs.writeFileSync(full,fs.readFileSync(full,'utf8').replace('</head>',`<link rel="stylesheet" href="../shared/exhibition.css?v=${revision}"></head>`));}
 return data;
}
module.exports={discover,build};
