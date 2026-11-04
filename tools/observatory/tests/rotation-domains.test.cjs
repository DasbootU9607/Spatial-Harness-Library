'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const A=require('../adapters/rotation-2d.cjs'),B=require('../adapters/rotation-3d.cjs');
const clone=x=>JSON.parse(JSON.stringify(x)),passed=(a,s)=>a.verify(s,'test',{}).verdict==='passed';
test('Planar solver exchanges rectangular bounds and rotates cell, motif and marker together',()=>{
 const c=(n,points=[])=>({color:A.Solver.PALETTE[n],glyph:{kind:'dots',points}});
 const g={rows:2,cols:3,cells:[c(0,[[-2,0],[2,0]]),c(1),c(2),c(3),c(4),c(0)],marker:[3,0]};
 const expected={rows:3,cols:2,cells:[c(3),c(0,[[0,-2],[0,2]]),c(4),c(1),c(0),c(2)],marker:[2,3]};
 assert.equal(A.Solver.compare(g,expected).rotation,90);assert.deepEqual(A.Model.rotate(g),expected);
 const wrong=clone(expected);wrong.cells[1].glyph.points=[[-2,0],[2,0]];assert.equal(A.Solver.compare(g,wrong).equivalent,false);
 wrong.cells[1]=expected.cells[1];wrong.marker=[0,3];assert.equal(A.Solver.compare(g,wrong).equivalent,false);
 let r=g;for(let i=0;i<4;i++)r=A.Model.rotate(r);assert.equal(A.Solver.canonical(r),A.Solver.canonical(g));
});
test('Symmetric decorated grids and harmless motif representations are equivalent',()=>{
 const g={rows:2,cols:2,cells:Array.from({length:4},()=>({color:A.Solver.PALETTE[0],glyph:{kind:'dots',points:[]}})),marker:[0,0]};
 assert(A.Solver.compare(g,A.Model.mirror(g)).equivalent);
 const h=clone(g);h.cells[0].glyph={kind:'polygon',points:[[-2,-1],[2,0],[-2,1]]};const k=clone(h);k.cells[0].glyph.points.reverse();assert.equal(A.Solver.canonical(h),A.Solver.canonical(k));
 const p=A.generate(31,{mode:'patterned'});const q=clone(p.geometry);q.cells.forEach(c=>{if(c.glyph.kind==='dots')c.glyph.points.reverse();});assert(A.Solver.compare(p.geometry,q).equivalent);
});
test('Spatial solver enumerates exactly 24 determinant-positive rotations',()=>{
 const m=B.Solver.matrices;assert.equal(m.length,24);assert.equal(new Set(m.map(JSON.stringify)).size,24);
 const determinant=a=>a[0][0]*(a[1][1]*a[2][2]-a[1][2]*a[2][1])-a[0][1]*(a[1][0]*a[2][2]-a[1][2]*a[2][0])+a[0][2]*(a[1][0]*a[2][1]-a[1][1]*a[2][0]);
 for(const r of m)assert.equal(determinant(r),1);
 const p=B.generate(17).geometry;for(const r of m){const q=B.Solver.transform(p,r).map(v=>v.map((x,i)=>x+[11,-7,22][i]));assert(B.Solver.compare(p,q).equivalent);}
});
test('Achiral mirrors are accepted as equivalent; chiral reflections and count-preserving edits are not',()=>{
 const cube=Array.from({length:8},(_,i)=>[i%2,Math.floor(i/2)%2,Math.floor(i/4)]);assert(B.Solver.compare(cube,cube.map(([x,y,z])=>[-x,y,z])).equivalent);
 const p=B.generate(21,{distractors:['mirror','move']});
 p.generator.operations.forEach((op,i)=>{const q=p.options[i].geometry;assert.equal(q.length,p.geometry.length);assert.equal(B.Solver.compare(p.geometry,q).equivalent,op.kind==='rotation');});
});
test('Seeded families vary geometry and answer position across all advertised mutations',()=>{
 const positions=new Set(),shapes=new Set();
 for(let seed=0;seed<48;seed++){
  const mode=seed%2?'colored':'patterned',methods=mode==='colored'?['mirror','swap']:['orientation','marker'];
  const p=A.generate(seed,{rows:2+seed%4,cols:2+Math.floor(seed/4)%4,mode,distractors:methods});assert(passed(A,p));assert.deepEqual(p,A.generate(seed,p.generator.parameters));positions.add(p.answer.index);shapes.add(A.Solver.canonical(p.geometry));
  for(const polarity of ['can','cannot']){const methods=['add','delete','move','mirror'],distractors=polarity==='can'?[methods[seed%4],methods[(seed+1)%4]]:[methods[seed%4]];const q=B.generate(seed,{cubes:6+seed%7,polarity,distractors});assert(passed(B,q));assert.deepEqual(q,B.generate(seed,q.generator.parameters));positions.add(q.answer.index);}
 }
 assert.equal(positions.size,3);assert(shapes.size>40);
});
test('Generator rejects unsupported or silently ignored parameters',()=>{
 for(const params of [{rows:6},{mode:'photo'},{mode:'colored',distractors:['orientation','mirror']},{extra:1}])assert.throws(()=>A.generate(1,params));
 for(const params of [{cubes:13},{polarity:'positive'},{distractors:['delete']},{camera:'custom'}])assert.throws(()=>B.generate(1,params));
 assert.throws(()=>A.generate(1.5));assert.throws(()=>B.generate(NaN));
});
test('Verifier recomputes from geometry rather than trusting operation labels',()=>{
 for(const a of [A,B]){const p=a.generate(17);p.generator.operations=p.generator.operations.map(()=>({kind:'imagined-label'}));assert(passed(a,p));const q=clone(p);q.answer.index=(q.answer.index+1)%3;assert(!passed(a,q));}
});
test('Multiple solutions, zero solutions, duplicate displays and changed final labels fail',()=>{
 for(const a of [A,B]){
  const p=a.generate(17),correct=p.answer.index;
  const q=clone(p);q.options[(correct+1)%3].geometry=clone(q.options[correct].geometry);assert(!passed(a,q));
  const r=clone(p);r.options[correct].geometry=clone(r.options[(correct+1)%3].geometry);assert(!passed(a,r));
  const t=clone(p);[t.options[0],t.options[1]]=[t.options[1],t.options[0]];assert(!passed(a,t));
  const u=clone(p);u.options[3]={label:'D',type:'figure',geometry:p.geometry};assert(!passed(a,u));
  const v=clone(p);v.options.push(v.options[0]);assert(!passed(a,v));
 }
});
test('Question polarity, D meaning and per-option explanations are validated independently',()=>{
 const p=B.generate(7,{polarity:'cannot'});assert.equal(p.answer.options.slice(0,3).filter(o=>o.equivalent).length,2);assert.equal(p.answer.options[p.answer.index].equivalent,false);assert.equal(p.answer.options[3].qualifies,false);
 for(const mutate of [q=>q.polarity='can',q=>q.question=q.question.replace('cannot','can'),q=>q.options[3].text='None of these models rotates',q=>q.answer.options[0].explanation='Trust the label',q=>q.answer.index=3]){const q=clone(p);mutate(q);assert(!passed(B,q));}
});
test('Overlaps, disconnected cubes, diagonal-only contact and unrenderable extents fail',()=>{
 assert.equal(B.Solver.connected([[0,0,0],[1,1,0]]),false);
 const p=B.generate(1);for(const modify of [g=>g.push(g[0]),g=>g[0]=[50,50,50],g=>g[0]=[.5,0,0]]){const q=clone(p);modify(q.geometry);assert(!passed(B,q));}
 const q=clone(p);q.geometry[0]=null;assert(!passed(B,q));
});
test('Complete layer SVG encodes every voxel and every layer; no hidden-only structural evidence',()=>{
 for(const polarity of ['can','cannot']){const p=B.generate(91,{cubes:12,polarity}),svg=B.render(p);const groups=svg.split('<g transform="translate(').slice(1);assert.equal(groups.length,4);
  [p.geometry,...p.options.slice(0,3).map(o=>o.geometry)].forEach((model,i)=>{const voxels=[...groups[i].matchAll(/data-voxel="([\d,]+)" data-occupied="1"/g)].map(m=>m[1].split(',').map(Number));assert.equal(B.Solver.canonical(voxels),B.Solver.canonical(model));const scene=B.Renderer.scene(model);assert.equal((groups[i].match(/data-voxel=/g)||[]).length,scene.size.reduce((a,b)=>a*b,1));});
  assert(svg.includes(polarity==='can'?'CAN':'CANNOT'));assert(svg.includes('D. All three other options are incorrect'));assert(!svg.includes(p.answer.explanation));
 }
});
test('Renderer configuration drift and malformed task input cannot produce a passing report',()=>{
 for(const a of [A,B]){const s=a.generate(2);s.rendering.width=80;assert(!passed(a,s));for(const bad of [{},null,{options:[]},{geometry:[null]}])assert(!passed(a,bad));}
});
test('Packaged official evidence retains exact source annotations and original image bytes',()=>{
 const root=path.resolve(__dirname,'../../..'),official=JSON.parse(fs.readFileSync(path.join(root,'questions/data/spatialviz.json'),'utf8'));
 for(const dim of [2,3]){const dir=path.join(root,`spatialviz-harness/skills/spatialviz-${dim}d-rotation/references`);for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.json'))){const q=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8')),source=official.find(x=>x.sourceId===q.sourceId);for(const key of Object.keys(source))assert.deepEqual(q[key],source[key]);const img=fs.readFileSync(path.join(dir,path.basename(q.packagedImage)));assert.equal(crypto.createHash('sha256').update(img).digest('hex'),q.imageSha256);assert.deepEqual(img,fs.readFileSync(path.join(root,'questions',source.image)));}}
});
test('Formal skill publication refuses missing or superseded visual approval',()=>{
 const R=require('../runtime.cjs'),P=require('../../publish.cjs'),tmp=path.join(R.ROOT,'.harness/tests');fs.mkdirSync(tmp,{recursive:true});
 for(const failed of [false,true]){const dir=fs.mkdtempSync(path.join(tmp,'rotation-review-')),task=path.join(dir,'task.json'),skill=path.join(R.ROOT,'spatialviz-harness/skills/spatialviz-2d-rotation');const run=R.start({root:dir,task,skill,title:'Visual gate regression',harness:'spatialviz-harness',viewer:false,binding:{runtime:null,sessionId:'synthetic'}});R.atomic(task,A.generate(13));const c=R.save(run,task),fp=path.join(dir,'fp.json'),report=path.join(dir,'report.json');R.atomic(fp,c.fingerprints);assert.equal(R.execute(run,process.execPath,[require.resolve('../adapters/rotation-2d.cjs'),task,c.id,fp,report],{candidateId:c.id,report,verifier:A.identity}).verdict,'passed');R.render(run,c.id,A);
  if(failed){R.event(run,'visual.review',{outcome:'passed',review:'Synthetic gate test'},{candidateId:c.id});R.event(run,'visual.review',{outcome:'failed',review:'Synthetic later rejection'},{candidateId:c.id});}
  R.finish(run,c.id);assert.throws(()=>P.prepare({run,task,skill}),/visual review/);
 }
});
test('Publication preserves the recorded old renderer image across a renderer revision',()=>{
 const R=require('../runtime.cjs'),P=require('../../publish.cjs'),dir=fs.mkdtempSync(path.join(R.ROOT,'.harness/tests/rotation-preview-'));
 const bytes='<svg xmlns="http://www.w3.org/2000/svg"><text>Original camera</text></svg>';fs.writeFileSync(path.join(dir,'old.svg'),bytes);R.atomic(path.join(dir,'spec.json'),{rendering:{revision:'old'}});
 const version={id:'v001',sha256:'spec-hash',specPath:'spec.json',fingerprints:{rendering:'render-hash'}},events=[{type:'render.completed',candidateId:'v001',details:{specification:'spec-hash',rendering:'render-hash',artifactPath:'old.svg',sha256:R.sha(bytes),renderer:{id:'renderer',revision:'old'}}}],adapter={identity:{id:'renderer',revision:'new'},render(){throw Error('Must not redraw old candidate with new camera');}};
 const preview=P.previewBytes(dir,version,events,adapter);assert.equal(preview.bytes.toString(),bytes);assert.equal(preview.renderer.revision,'old');assert.equal(preview.origin,'recorded-render');assert.equal(P.previewBytes(dir,version,[],adapter),null);
 fs.appendFileSync(path.join(dir,'old.svg'),'changed');assert.throws(()=>P.previewBytes(dir,version,events,adapter),/changed/);
});
