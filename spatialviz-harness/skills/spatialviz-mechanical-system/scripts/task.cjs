'use strict';
const {design,original}=require('./design.cjs'),catalog=require('./catalog.cjs');
const {solve}=require('./solve.cjs'),{figure}=require('./figure.cjs'),{readPlate}=require('./read-plate.cjs');
const verdict=(yes)=>yes?'passed':'failed';
const fmt=(out,targets)=>out.map((s,i)=>targets.length>1?targets[i].name+' '+s:s).join(' / ');
function optionsFor(expected,g,pick){
 const alternatives={orbit:['CW','CCW','stationary','translates'],spin:['CW','CCW','stationary','translates'],vertical:['up','down','stationary','rotates'],horizontal:['right','left','stationary','rotates'],diagonal:['up-left','down-left','up-right','down-right'],cycle:['horizontal reciprocation','continuous rotation','stationary','vertical reciprocation']};
 const choices=[expected],others=expected.map((v,i)=>alternatives[g.targets[i].kind].filter(x=>x!==v));
 if(expected.length>1){for(const mask of [1,2,3])choices.push(expected.map((x,i)=>((mask>>i)&1)?others[i][0]:x));}
 else choices.splice(0,1,...alternatives[g.targets[0].kind].map(x=>[x]));
 for(let i=choices.length-1;i>0;i--){const j=pick(i+1);[choices[i],choices[j]]=[choices[j],choices[i]];}
 return choices.map((v,i)=>({label:'ABCD'[i],type:'text',text:fmt(v,g.targets)}));
}
function explain(g,options){
 const {result,trace}=solve(g),expected=fmt(result,g.targets);
 return {index:options.findIndex(o=>o.text===expected),explanation:trace.join(' '),options:options.map(o=>{
 const fields=o.text.split(' / ');const mismatches=g.targets.flatMap((t,i)=>fields[i]===fmt([result[i]],[t])||fields[i]===t.name+' '+result[i]?[]:[t.name+' must be '+result[i]+'. '+trace.filter((s,k)=>k>0&&k<trace.length-1&&g.joints[k-1]&&(g.joints[k-1].ports.includes(t.name)||g.joints[k-1].settings.arm===t.name)).join(' ')]);
 return {label:o.label,explanation:o.text===expected?'All requested motions agree with the contact constraints.':mismatches.join('. ')+'.'};
 })};
}
function generate(seed,params){
 if(params&&Object.hasOwn(params,'system')){if(Object.keys(params).length!==1)throw Error('A custom system takes no selector');return require('./system.cjs').buildSystem(params.system,seed);}
 const {id,entry,geometry,expected,pick}=design(seed,params),options=optionsFor(expected,geometry,pick);
 const traced=explain(geometry,options),index=options.findIndex(o=>o.text===fmt(expected,geometry.targets));
 if(index<0||traced.index!==index)throw Error('Designer prediction disagrees with contact solution for '+id);
 const nearest=entry?[entry]:id==='clutch-hoist'?[catalog.find(e=>e.id==='ratchet'),catalog.find(e=>e.id==='cam-like')]:[catalog.find(e=>e.id==='spur'),catalog.find(e=>e.id==='cam-like')];
 const title=entry?entry.assembly:({'wind-left':'Hoist with a left-hand cord','wind-right':'Hoist with a right-hand cord','clutch-hoist':'Holding a load through an overrunning clutch'})[id];
 const question='Drive '+geometry.driver+' '+geometry.input+'. Determine the motion of '+geometry.targets.map(t=>t.name+' ('+t.kind+')').join(' and ')+' '+geometry.scope+'. Use the labeled contact views.';
 return {schemaVersion:1,title,description:entry?entry.ask:'Trace the gear mesh, drum coupling and cord tangent.',category:'MentalAnimation',taskType:'MechanicalSystem',difficulty:{label:'Unranked',basis:'Authored schematic exercise'},geometry,question,polarity:'positive',options,answer:{...traced,index},contract:{answerUnique:true,scope:geometry.scope},provenance:{sourceKind:'agent-authored',generationMethod:'Spatial Harness mechanical contact schematics',sourceRevision:'c27f9111a2674f2ea03e2ca1f5833326cf1eec1a',mechanism:id,series:original.includes(id)?'original':'coverage',references:nearest.map(e=>'MentalAnimation/MechanicalSystem/Level'+e.level+'/'+e.lo)}};
}
function verify(q,identity,candidateId,fingerprints,artifact){
 const checks=[];const add=(name,ok)=>checks.push({name,verdict:verdict(ok)});
 try{
 const svg=artifact??figure(q),plate=readPlate(svg),solved=solve(plate.geometry),expected=fmt(solved.result,plate.geometry.targets);
 if(q.assembly){
  require('./inspect.cjs').checkDrawing(svg,plate.geometry);
  add('Candidate media reproduce the bound assembly',svg===figure(q));
  add('Published question and choices match the plate',JSON.stringify(plate.options)===JSON.stringify(q.options.map(o=>o.text))&&q.question==='Drive '+plate.geometry.driver+' '+plate.geometry.input+'. Determine '+plate.geometry.targets.map(t=>t.name+' ('+t.kind+')').join(' and ')+' '+q.geometry.scope+'.');
 }
 const matches=plate.options.map(x=>x===expected);
 add('All four printed choices are distinct',new Set(plate.options).size===4);
 matches.forEach((m,i)=>add('Option '+('ABCD'[i])+' '+plate.options[i]+' — '+(m?'satisfies':'violates')+' the derived motion '+expected,m===(i===q.answer.index)));
 add('Exactly one visible option satisfies every output',matches.filter(Boolean).length===1);
 if(!q.assembly)add('Task question, structural constraints and options rebuild from the recorded seed',(()=>{const replay=generate(q.generator.seed,q.generator.parameters);return ['geometry','options','question','answer','provenance','contract'].every(k=>JSON.stringify(q[k])===JSON.stringify(replay[k]));})());
 add('Bound renderer and solver revisions',['rendering','generator','verifier'].every(k=>q[k].revision===identity.revision));
 }catch(e){add(e.message,false);}
 return {schemaVersion:1,candidateId,testedFingerprints:fingerprints,verifier:identity,verdict:verdict(checks.every(c=>c.verdict==='passed')),checks,scope:'Visible SVG text and shaft-end glyphs, contact constraint solution, option order, unique output and parameter replay.'};
}
module.exports={generate,verify,fmt};