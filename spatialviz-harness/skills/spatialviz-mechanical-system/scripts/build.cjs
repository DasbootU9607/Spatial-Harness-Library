'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const argv=process.argv.slice(2),usage='node build.cjs --system FILE [--seed N] [--run DIR] [--parent ID --basis TEXT] or node build.cjs SEED MECHANISM [PARAMETERS.json]';
const bridge=(...args)=>execFileSync(process.execPath,[path.join(__dirname,'construct.cjs'),...args],{encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024}).trim();
const read=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
let seed,params,run,lineage=[];
if(argv[0]==='--system'){
 const file=path.resolve(argv[1]||''),flags=argv.slice(2);if(!argv[1]||flags.length%2)throw Error(usage);
 const opts={};for(let i=0;i<flags.length;i+=2){if(!['--seed','--run','--parent','--basis'].includes(flags[i])||Object.hasOwn(opts,flags[i]))throw Error(usage);opts[flags[i]]=flags[i+1];}
 if(opts['--parent']||opts['--basis']){if(!opts['--run']||!opts['--parent']||!opts['--basis'])throw Error(usage);lineage=['--parent',opts['--parent'],'--basis',opts['--basis']];}
 seed=opts['--seed']??'1';if(!/^-?\d+$/.test(seed)||!Number.isSafeInteger(+seed))throw Error('Integer seed required');
 run=opts['--run']?path.resolve(opts['--run']):bridge('start','--task',file,'--title','Design a mechanical assembly','--no-viewer');
 if(path.resolve(read(path.join(run,'manifest.json')).task)!==file)throw Error('Recorder task and system path differ');
 process.stderr.write('Recorder '+run+'\n');
 bridge('read','--run',run,'--file',file);params={system:read(file)};
 const note=path.join(run,'author-intent.json');
 fs.writeFileSync(note,JSON.stringify({goal:params.system.intent,change:params.system.title,reason:'Evaluate the authored assembly and each printed hypothesis.',expectedChecks:['Read the final contact flags, derive the outputs, and compare four choices.']}));
 bridge('note','--run',run,'--file',note);
}else{
 const [value,id,file]=argv;if(!/^-?\d+$/.test(value)||!id||argv.length>3)throw Error(usage);
 seed=value;params={...(file?read(file):{}),mechanism:id};
 run=bridge('start','--task',id+' '+seed+' '+JSON.stringify(params),'--title','Mechanical System / '+id,'--no-viewer');
 bridge('read','--run',run,'--file',path.join(__dirname,'../references/coverage.md'));
}
const config=path.join(run,'parameters.json'),task=path.join(run,'delivery.json');
fs.writeFileSync(config,JSON.stringify(params,null,2));
const c=JSON.parse(bridge('generate','--run',run,'--task',task,'--seed',seed,'--params',config,...lineage));
const a=['--run',run,'--candidate',c.id],preview=JSON.parse(bridge('render',...a));
bridge('verify',...a);
console.log(JSON.stringify({run,task,candidate:c.id,media:path.join(run,preview.artifactPath),verdict:'passed'},null,2));