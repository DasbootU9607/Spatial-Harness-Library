'use strict';
// Recover locations from visible leader endpoints, registration circles and printed flags.
const {readPlate}=require('./read-plate.cjs'),{solve}=require('./solve.cjs');
const number='(-?[\\d.]+)',segment='M'+number+' '+number+' L'+number+' '+number;
function checkDrawing(svg,g){
 const bodies=new Map(),flags=[],circles=[];
 for(const r of svg.matchAll(new RegExp('<circle cx="'+number+'" cy="'+number+'" r="'+number+'" fill="none" stroke="#688681"','g')))circles.push(r.slice(1).map(Number));
 const parts=new RegExp('<path d="'+segment+'" stroke="#78908c"[^>]*/><text [^>]*>([A-Z][A-Z0-9]{0,3}) ([a-z]+)(?: (\\d+)T)?( IN| OUT)?</text>','g');
 for(const r of svg.matchAll(parts)){
  if(bodies.has(r[5]))throw Error('Duplicate body label '+r[5]);
  bodies.set(r[5],{x:+r[1],y:+r[2],type:r[6],teeth:Number(r[7]),role:r[8]?.trim()});
 }
 const strokes=[...svg.matchAll(new RegExp('<path d="'+segment+'" (?:fill="none" )?stroke="([^"]+)" stroke-width="([\\d.]+)"','g'))].map(r=>({x:+r[1],y:+r[2],X:+r[3],Y:+r[4],ink:r[5],width:+r[6]}));
 const pins=new RegExp('<path d="'+segment+'" stroke="#a04418"[^>]*/><circle [^>]*/><text [^>]*>(\\d+)</text>','g');
 for(const r of svg.matchAll(pins))flags.push({x:+r[1],y:+r[2],id:+r[5]});
 if(flags.length!==g.joints.length||flags.some((f,i)=>f.id!==i+1))throw Error('Missing contact flag or section');
 for(const n of Object.keys(g.components))if(!bodies.has(n))throw Error('No assembly body for '+n);
 if(bodies.get(g.driver)?.role!=='IN'||g.targets.some(t=>t.name!==g.driver&&bodies.get(t.name)?.role!=='OUT'))throw Error('Input or requested indicator missing');
 const near=(x,y)=>Math.abs(x-y)<.16;
 for(const [i,j] of g.joints.entries()){
  const [a,b]=j.ports.map(n=>bodies.get(n)),flag=flags[i],s=j.settings;
  if(j.kind==='mesh'){
   const cs=[a,b].map((p,k)=>{
    if(p.teeth!==s.teeth[k])throw Error('Section disagrees with labeled tooth count');
    return circles.filter(c=>near(c[0],p.x)&&near(c[1],p.y)).map(c=>c[2]);
   });
   const span=Math.hypot(a.x-b.x,a.y-b.y),inner=b.type==='ring';
   if(inner!==(s.contact==='inside'))throw Error('Wrong pitch boundary');
   if(!cs[0].some(r=>cs[1].some(R=>near(inner?R-r:r+R,span)&&near(Math.hypot(flag.x-a.x,flag.y-a.y),r)&&near(Math.hypot(flag.x-b.x,flag.y-b.y),R))))throw Error('Mesh flag must lie on both drawn pitch circles');
  }else if(j.kind==='face'&&s.form==='double face wheel'){
   const nearSide=flag.x>(a.x+b.x)/2;
   if((s.bank==='near')!==nearSide||!near(flag.y,(a.y+b.y)/2)||!svg.includes('>'+(nearSide?'Near':'Far')+' seat engaged.</text>'))throw Error('Shaft tangents contradict the visible working seat');
  }else if(j.kind==='cord'){
   if((s.side==='left')!==(flag.x<a.x)||!near(b.x,flag.x)||!near(a.y,flag.y)||b.y<=a.y)throw Error('Winding side or weight location disagrees with the drawing');
  }else if(j.kind==='ground'){
   if(!near(a.x,flag.x)||!near(a.y,flag.y)||!strokes.some(t=>t.ink==='#193742'&&t.width===2&&near(t.x,a.x)&&near(t.y,a.y)&&near(t.X,a.x)&&t.Y>a.y))throw Error('Missing lock stem on the designated body');
  }else if(['key','clutch','sleeve','inertia'].includes(j.kind)){
   const hub=strokes.some(t=>t.ink==='#556c70'&&t.width===(j.kind==='key'?4:2)&&near(t.x,a.x)&&near(t.y,a.y)&&near(t.X,b.x)&&near(t.Y,b.y));
   if(!hub||!near((a.x+b.x)/2,flag.x)||!near((a.y+b.y)/2,flag.y))throw Error('Shaft marking does not join the labeled hubs');
  }
 }
 return {members:[...bodies.keys()],contacts:flags.length};
}
function inspect(svg){
 const {geometry,options}=readPlate(svg),drawing=checkDrawing(svg,geometry),solved=solve(geometry);
 const text=solved.result.map((s,i)=>geometry.targets.length===1?s:geometry.targets[i].name+' '+s).join(' / ');
 const choices=options.map((value,i)=>({label:'ABCD'[i],value,satisfies:value===text}));
 if(new Set(options).size!==4||choices.filter(c=>c.satisfies).length!==1)throw Error('Printed options do not uniquely distinguish the result');
 return {drawing,driver:geometry.driver,input:geometry.input,targets:geometry.targets,joints:geometry.joints,...solved,choices};
}
if(require.main===module)console.log(JSON.stringify(inspect(require('node:fs').readFileSync(process.argv[2],'utf8')),null,2));
module.exports={checkDrawing,inspect};