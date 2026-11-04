'use strict';
// Enumerate the proper signed permutation group, independently of construction turns.
const permutations=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
const matrices=[];
for(const p of permutations){let inv=0;for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)if(p[i]>p[j])inv++;
 for(const a of [-1,1])for(const b of [-1,1])for(const c of [-1,1])if((inv%2?-1:1)*a*b*c===1)matrices.push(p.map((col,row)=>[0,1,2].map(j=>j===col?[a,b,c][row]:0)));
}
const key=p=>p.join(',');
function normalize(points){const min=[0,1,2].map(i=>Math.min(...points.map(p=>p[i])));return points.map(p=>p.map((n,i)=>n-min[i])).sort((a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2]);}
const canonical=p=>JSON.stringify(normalize(p));
const transform=(p,m)=>normalize(p.map(v=>m.map(row=>row.reduce((n,a,i)=>n+a*v[i],0))));
function connected(p){if(!p.length)return false;const visited=new Set([key(p[0])]),queue=[p[0]],all=new Set(p.map(key));while(queue.length){const a=queue.pop();for(let i=0;i<3;i++)for(const d of [-1,1]){const b=a.slice();b[i]+=d;const k=key(b);if(all.has(k)&&!visited.has(k)){visited.add(k);queue.push(b);}}}return visited.size===p.length;}
function valid(p){return Array.isArray(p)&&p.length>=5&&p.length<=13&&p.every(x=>Array.isArray(x)&&x.length===3&&x.every(n=>Number.isSafeInteger(n)&&Math.abs(n)<=1000))&&new Set(p.map(key)).size===p.length&&normalize(p).every(x=>x.every(n=>n<=3))&&connected(p);}
function compare(a,b){
 const target=normalize(b),targetSet=new Set(target.map(key));
 const attempts=matrices.map((matrix,index)=>{const p=transform(a,matrix),set=new Set(p.map(key));const missing=p.filter(x=>!targetSet.has(key(x))),extra=target.filter(x=>!set.has(key(x)));return {index,matrix,missing,extra,score:missing.length+extra.length};});
 const best=attempts.sort((a,b)=>a.score-b.score||a.index-b.index)[0],equivalent=best.score===0;
 let explanation=equivalent?`A proper spatial rotation maps all ${a.length} cubes exactly. Matrix rows: ${best.matrix.map(r=>'['+r+']').join(' ')}; translate each model to its minimum corner.`:a.length!==b.length?`Cube count differs: original ${a.length}, option ${b.length}. Rotation preserves cube count.`:`All 24 proper rotations fail. Best minimum-corner alignment uses matrix ${best.matrix.map(r=>'['+r+']').join(' ')}; missing cube at (${best.missing[0]}), extra cube at (${best.extra[0]}). Coordinates are (x,y,z), starting at zero in the layer diagrams.`;
 return {equivalent,rotation:equivalent?best.matrix:null,witness:best,explanation};
}
module.exports={matrices,normalize,canonical,transform,connected,valid,compare};
