'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),R=require('../runtime.cjs');
const pack=path.join(R.ROOT,'spatialviz-harness/skills/spatialviz-mechanical-system'),dir=path.join(pack,'scripts');
const {prepare,readPrinted}=require(path.join(dir,'cad_system.cjs'));
const python=process.env.SPATIALVIZ_PYTHON||'python';
const generationMethod='Spatial Harness original FreeCAD assembly';
const files=['system.cjs','solve.cjs','cad_system.cjs','cad_solve.cjs','cad_launch.py','cad_job.py','cad_model.py','cad_check.py','cad_plate.py'];
const identity={id:'mechanical-system',revision:R.sha([__filename,...files.map(n=>path.join(dir,n))].map(f=>fs.readFileSync(f,'utf8').replaceAll('\r\n','\n')).join('\n')+R.sha(fs.readFileSync(path.join(pack,'assets/type/DejaVuSansMono.ttf'))))};
const bytes=(directory,name)=>fs.readFileSync(path.join(directory,name));
const hash=(directory,name)=>R.sha(bytes(directory,name));
function runScript(script,args){
 const result=spawnSync(python,['-B',path.join(dir,script),...args],{encoding:'utf8',windowsHide:true,cwd:R.ROOT});
 if(result.status!==0)throw Error(result.stderr||result.error?.message||'FreeCAD validation failed');
 return result.stdout;
}
function generate(seed,p,{run}={}){
 if(!run||Object.keys(p||{}).length!==1||!p.system)throw Error('Formal mechanical generation requires a recorder and --system with a FreeCAD assembly description.');
 const {original,actual,q,worksheet}=prepare(p.system,seed),folder=fs.mkdtempSync(path.join(run,'native-'));
 R.atomic(path.join(folder,'system.json'),actual);R.atomic(path.join(folder,'worksheet.json'),worksheet);
 for(const script of ['cad_launch.py','cad_plate.py']){
  const args=script==='cad_plate.py'?['compose',folder]:[folder];
  const job=R.execute(run,python,['-B',path.join(dir,script),...args],{kind:script==='cad_plate.py'?'Compose native viewport pixels':'Build, reopen and photograph FreeCAD assembly'});
  if(job.exitCode!==0)throw Error('Native generation stopped. See recorded error and retained attempt at '+folder);
 }
 const geometry=R.read(path.join(folder,'geometry.json')),capture=R.read(path.join(folder,'capture.json'));
 const native={backend:'FreeCAD',version:capture.version,renderer:capture.renderer,modelSha256:hash(folder,'assembly.FCStd'),assemblyViewSha256:hash(folder,'assembly-view.png'),frontViewSha256:hash(folder,'front-view.png'),geometrySha256:hash(folder,'geometry.json')};
 R.note(run,{goal:original.intent,change:'Built the native solids and physical hardware. Reopened the saved document and captured its front and assembly views.',sources:original.references,reason:'Pose checks and kinematic inference are recorded separately.',expectedChecks:geometry.checks});
 return {...q,question:worksheet.drive+' '+worksheet.ask,conditions:geometry.facts,provenance:{...q.provenance,generationMethod,native},generator:{...identity,seed,parameters:{system:original}},rendering:{...identity,format:'png',presentation:'diagram-only',sha256:hash(folder,'plate.png'),pngBase64:bytes(folder,'plate.png').toString('base64')},verifier:identity};
}
function render(q){
 if(q.provenance?.generationMethod!==generationMethod||q.rendering?.format!=='png')throw Error('A formal plate requires an original FreeCAD capture.');
 const png=Buffer.from(q.rendering.pngBase64,'base64');if(R.sha(png)!==q.rendering.sha256)throw Error('Question PNG digest mismatch');return png;
}
function nativeFolder(run,q){
 const folders=fs.readdirSync(run,{withFileTypes:true}).filter(d=>d.isDirectory()&&d.name.startsWith('native-')).map(d=>path.join(run,d.name));
 for(const f of folders)if(fs.existsSync(path.join(f,'plate.png'))&&hash(f,'plate.png')===q.rendering.sha256&&hash(f,'assembly.FCStd')===q.provenance.native.modelSha256)return f;
 throw Error('The exact native FreeCAD model and plate are required.');
}
function attachments(q,run){
 const f=nativeFolder(run,q),n=q.provenance.native,files={'assembly.FCStd':n.modelSha256,'geometry.json':n.geometrySha256,'assembly-view.png':n.assemblyViewSha256,'front-view.png':n.frontViewSha256};
 const result={};
 for(const [file,digest] of Object.entries(files)){result[file]=bytes(f,file);if(R.sha(result[file])!==digest)throw Error('Native attachment changed: '+file);}
 result['system.json']=Buffer.from(JSON.stringify(q.generator.parameters.system,null,2)+'\n');
 return result;
}
function verify(run,q,id,fp){
 const checks=[];let readout;
 const check=(condition,name)=>{if(!condition)throw Error(name);checks.push({name,verdict:'passed'})};
 try{
  const f=nativeFolder(run,q),native=attachments(q,run),attempt=fs.mkdtempSync(path.join(run,'reopen-'));
  const event=R.S.readRun(run).events.findLast(e=>e.type==='render.completed'&&e.candidateId===id);
  if(!event)throw Error('Render this candidate first.');
  const final=path.join(run,event.details.artifactPath);
  check(fs.readFileSync(final).equals(render(q))&&event.details.sha256===q.rendering.sha256,'Candidate PNG matches the recorded final render');
  runScript('cad_launch.py',[attempt,path.join(f,'assembly.FCStd')]);
  const reopened=R.read(path.join(attempt,'native-verification.json'));
  check(JSON.stringify(reopened)===JSON.stringify(JSON.parse(native['geometry.json'])),'Fresh FreeCAD reopen reproduces all solid and interface checks');
  for(const name of reopened.checks)checks.push({name,verdict:'passed'});
  const rebuilt=path.join(attempt,'diagram.png');
  runScript('cad_plate.py',['compose',f,rebuilt]);
  check(q.rendering.presentation==='diagram-only' && fs.readFileSync(rebuilt).equals(fs.readFileSync(final)), 'Native views and figure labels alone reproduce the question image');
  const questionFile=path.join(attempt,'question.json');
  R.atomic(questionFile,{question:q.question,conditions:q.conditions,options:q.options});
  const printed=JSON.parse(runScript('cad_plate.py',['question',questionFile]));
  check(JSON.stringify(printed.facts)===JSON.stringify(reopened.facts),'Published working connections match measurements on the native assembly');
  readout=readPrinted(printed);
  check(q.question===printed.drive+' '+printed.ask,'Displayed driver, outputs and interval match the delivered question');
  for(const [i,v] of readout.options.entries())check(v.text===q.options[i].text&&v.matches===(i===q.answer.index),'Option '+v.label+' '+(v.matches?'satisfies':'violates')+' the motions derived from the displayed conditions');
  check(readout.index===q.answer.index&&readout.options.filter(v=>v.matches).length===1,'One displayed answer satisfies the visible constraints');
  check(['generator','rendering','verifier'].every(k=>q[k].revision===identity.revision),'Native generator and verifier fingerprints match');
  R.atomic(path.join(attempt,'pixel-reading.json'),{printed,...readout});
 }catch(e){checks.push({name:e.message,verdict:'failed'});}
 return {schemaVersion:1,candidateId:id,testedFingerprints:fp,verifier:identity,checks,verdict:checks.every(c=>c.verdict==='passed')?'passed':'failed',scope:'Reopen exact FCStd, measure rigid solids and interfaces, recompose the figure and read the separate question text, solve contact constraints and evaluate four printed options.'};
}
module.exports={identity,generate,render,attachments,verify,generationMethod,imageFormat:{extension:'png',mediaType:'image/png'}};
if(require.main===module){const [spec,id,fp,out]=process.argv.slice(2);const r=verify(path.dirname(path.dirname(spec)),R.read(spec),id,R.read(fp));R.atomic(out,r);process.exitCode=r.verdict==='passed'?0:1;}
