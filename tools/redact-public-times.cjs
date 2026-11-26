'use strict';

const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {withoutAbsoluteTimes,assertNoAbsoluteTimes,hasAbsoluteTime}=require('./observatory/time-privacy.cjs');
const ROOT=path.resolve(__dirname,'..');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function publicFiles(root=ROOT){
 const files=[path.join(root,'catalog/cases.json')];
 for(const dir of ['maze-harness/site/data/processes','maze-harness/site/data/process-recovery','spatialviz-harness/site/records','babyvision-harness/site/records','spatialb-harness/site/records']){
  const walk=folder=>{if(!fs.existsSync(folder))return;for(const entry of fs.readdirSync(folder,{withFileTypes:true})){const file=path.join(folder,entry.name);if(entry.isDirectory())walk(file);else if(/\.(json|csv)$/.test(file)&&entry.name!=='task.json')files.push(file);}};
  walk(path.join(root,dir));
 }
 for(const name of ['catalog','build-attributions','provenance'])files.push(path.join(root,'maze-harness/site/data',name+'.json'));
 return files.filter(file=>fs.existsSync(file));
}
function check(root=ROOT){
 const files=publicFiles(root);
 for(const file of files){
  try{if(file.endsWith('.json'))assertNoAbsoluteTimes(read(file));else if(hasAbsoluteTime(fs.readFileSync(file,'utf8')))throw Error('Absolute activity time in CSV');}
  catch(error){throw Error(path.relative(root,file)+': '+error.message);}
 }
 return files.length;
}
function redact(root=ROOT){
 const changed=new Set();
 const write=(file,value)=>{const old=read(file);if(JSON.stringify(old)===JSON.stringify(value))return;fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');changed.add(path.relative(root,file));};
 for(const file of publicFiles(root).filter(file=>file.endsWith('.json'))){
  const original=read(file),next=withoutAbsoluteTimes(original);
  if(file.endsWith(path.sep+'process.json')&&next.manifest)next.manifest.sealed=Boolean(original.manifest.finishedAt||original.manifest.sealed);
  write(file,next);
 }
 const cases=read(path.join(root,'catalog/cases.json')).cases;
 for(const item of cases){
  const base=path.join(root,item.harnessId,'site'),file=path.join(base,item.process),process=read(file),csv=path.join(base,item.eventsCsv),bytes=require('./observatory/projection.cjs').csv(process);
  if(fs.readFileSync(csv,'utf8')!==bytes){fs.writeFileSync(csv,bytes);changed.add(path.relative(root,csv));}
  const delivery=path.join(path.dirname(file),'delivery.json');
  if(fs.existsSync(delivery)){const data=read(delivery);data.processSha256=sha(file);write(delivery,data);}
 }
 const maze=path.join(root,'maze-harness/site'),provenance=path.join(maze,'data/provenance.json'),metadata=read(provenance);
 for(const item of metadata.cases)if(item.authoringProcess)item.authoringProcess.sha256=sha(path.join(maze,item.authoringProcess.data));
 write(provenance,metadata);
 const indexFile=path.join(maze,'data/process-recovery/index.json'),index=read(indexFile);
 for(const item of index.cases)item.sha256=sha(path.join(maze,item.data));
 write(indexFile,index);
 check(root);
 return [...changed];
}
module.exports={publicFiles,check,redact};
if(require.main===module){
 if(process.argv.includes('--write'))console.log(JSON.stringify({redacted:redact()}));
 else console.log(`Public time privacy passed: ${check()} data files contain no absolute activity times.`);
}
