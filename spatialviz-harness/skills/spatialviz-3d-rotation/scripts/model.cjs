'use strict';
const S=require('./solve.cjs');
const key=p=>p.join(',');
function random(seed){let x=seed>>>0;return n=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return Math.floor(x/4294967296*n);};}
function turn(p,axis){return p.map(([x,y,z])=>axis===0?[x,-z,y]:axis===1?[z,y,-x]:[-y,x,z]);}
function neighbors(p){const all=new Set(p.map(key)),out=new Map();for(const v of p)for(let axis=0;axis<3;axis++)for(const d of [-1,1]){const q=v.slice();q[axis]+=d;if(!all.has(key(q)))out.set(key(q),q);}return [...out.values()];}
function generate(seed,params={}){
 const polarity=params.polarity??'can',p={cubes:8,polarity,distractors:polarity==='can'?['mirror','move']:['delete'],...params};
 if(Object.keys(params).some(k=>!['cubes','polarity','distractors'].includes(k))||!Number.isSafeInteger(seed)||!Number.isInteger(p.cubes)||p.cubes<6||p.cubes>12||!['can','cannot'].includes(p.polarity)||!Array.isArray(p.distractors)||p.distractors.length!==(p.polarity==='can'?2:1)||p.distractors.some(k=>!['add','delete','move','mirror'].includes(k)))throw Error('Supported: integer seed, cubes 6..12, polarity can/cannot, two/one distractors from add/delete/move/mirror.');
 const rand=random(seed);
 const pose=a=>{let b=a;for(let i=0,n=1+rand(8);i<n;i++)b=turn(b,rand(3));return S.normalize(b);};
 for(let trial=0;trial<600;trial++){
  let geometry=[[0,0,0]];
  while(geometry.length<p.cubes){const choices=neighbors(geometry).filter(v=>S.normalize([...geometry,v]).every(q=>q.every(n=>n<=3)));geometry=S.normalize([...geometry,choices[rand(choices.length)]]);}
  if([0,1,2].some(i=>Math.max(...geometry.map(v=>v[i]))===0))continue;
  const options=[],operations=[];
  for(let i=0,n=p.polarity==='can'?1:2;i<n;i++){
   for(let j=0;j<100;j++){const b=pose(geometry);if(S.canonical(b)!==S.canonical(geometry)&&!options.some(o=>S.canonical(o)===S.canonical(b))){options.push(b);operations.push({kind:'rotation'});break;}}
  }
  if(options.length!==(p.polarity==='can'?1:2))continue;
  for(const kind of p.distractors){
   for(let i=0;i<120;i++){
    let b=pose(geometry);
    if(kind==='mirror')b=b.map(([x,y,z])=>[-x,y,z]);
    if(kind==='delete'||kind==='move')b.splice(rand(b.length),1);
    if(kind==='add'||kind==='move'){const choices=neighbors(b);b.push(choices[rand(choices.length)]);}
    b=S.normalize(b);
    if(S.valid(b)&&!S.compare(geometry,b).equivalent&&!options.some(o=>S.canonical(o)===S.canonical(b))){options.push(b);operations.push({kind});break;}
   }
  }
  if(options.length!==3)continue;
  for(let i=2;i>0;i--){const j=rand(i+1);[options[i],options[j]]=[options[j],options[i]];[operations[i],operations[j]]=[operations[j],operations[i]];}
  return {geometry,options,parameters:p,operations,polarity:p.polarity};
 }
 throw Error('Could not construct a valid distinct set within retry bound; choose another seed or mutation.');
}
module.exports={generate,turn,neighbors};
