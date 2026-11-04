'use strict';
// A deliberately bounded demonstration adapter, not a validator for arbitrary SpatialViz tasks.
const fs=require('node:fs'),R=require('../runtime.cjs');
const identity={id:'discrete-quarter-turn',revision:R.sha(fs.readFileSync(__filename))};
const turn=points=>points.map(([x,y])=>[y,-x]);
const normalized=points=>JSON.stringify(points.map(p=>p.join(',')).sort());
function generate(seed=17){
  if(!Number.isSafeInteger(seed))throw Error('Integer seed required');
  const geometry={points:[[0,0],[1,0],[2,0],[0,1],[0,2],[0,3]],rotationDegrees:90,direction:'clockwise'};
  const correct=turn(geometry.points), candidates=[geometry.points,turn(turn(correct)),correct,turn(correct)];
  const shift=((seed%4)+4)%4,options=candidates.slice(shift).concat(candidates.slice(0,shift));
  return {schemaVersion:1,title:'Quarter-turn on a grid',description:'Demonstration fixture: rotate an asymmetric six-cell figure.',category:'MentalRotation',taskType:'discrete-rotation-demo',difficulty:{label:'Unranked demonstration',basis:'No human difficulty assessment'},question:'Which option is the original figure rotated 90 degrees clockwise about the marked origin? Keep the grid axes fixed.',polarity:'positive',geometry,options,answer:{index:(2-shift+4)%4,explanation:'A clockwise quarter-turn maps each cell coordinate (x, y) to (y, -x).'},generator:{...identity,seed,parameters:{family:'asymmetric-six-cell'}},rendering:{...identity,width:1000,height:560,cellSize:28,camera:'orthographic-front',axes:'x-right-y-up'},verifier:identity,contract:{answerUnique:true,rotationOnly:true,translation:false,reflection:false,coordinateRange:[-4,4]},provenance:{sourceKind:'demonstration',note:'Agent-authored fixture; not an official benchmark question.'}};
}
function verify(spec,candidateId,fingerprints){
  const checks=[];const check=(name,ok)=>checks.push({name,verdict:ok?'passed':'failed'});
  const points=spec.geometry?.points;
  check('Supported exact construction contract',spec.taskType==='discrete-rotation-demo' && spec.geometry?.rotationDegrees===90 && spec.geometry?.direction==='clockwise' && spec.polarity==='positive' && spec.contract?.translation===false && spec.contract?.reflection===false);
  check('Six unique integer cells within bounds',Array.isArray(points)&&points.length===6&&points.every(p=>p.length===2&&p.every(n=>Number.isInteger(n)&&Math.abs(n)<=4))&&new Set(points.map(p=>p.join(','))).size===6);
  let matches=[];
  if(Array.isArray(points)&&Array.isArray(spec.options)){
    // Independent matrix multiplication; do not call the generator's turn helper.
    const expected=points.map(p=>[0*p[0]+1*p[1],-1*p[0]+0*p[1]]);
    matches=spec.options.map((p,i)=>normalized(p)===normalized(expected)?i:-1).filter(i=>i>=0);
  }
  check('Four distinct options',spec.options?.length===4&&new Set(spec.options.map(normalized)).size===4);
  check('Unique correct answer in recorded option order',matches.length===1&&matches[0]===spec.answer?.index);
  check('Reproducible seed and tool revisions',Number.isInteger(spec.generator?.seed)&&spec.generator?.revision===identity.revision&&spec.verifier?.revision===identity.revision&&spec.rendering?.revision===identity.revision);
  const regenerated=Number.isInteger(spec.generator?.seed)?generate(spec.generator.seed):null;
  check('Generator replay matches task payload',regenerated&&['geometry','question','polarity','options','answer','contract','rendering','generator','verifier'].every(k=>JSON.stringify(regenerated[k])===JSON.stringify(spec[k])));
  return {schemaVersion:1,candidateId,testedFingerprints:fingerprints,verifier:identity,verdict:checks.every(c=>c.verdict==='passed')?'passed':'failed',checks,scope:'Exact discrete quarter-turn, answer uniqueness, option order, generator replay and rendering parameters. No general SpatialViz or difficulty claim.'};
}
function render(spec){
  const cell=28;
  function panel(points,cx,cy,label){return `<text x="${cx-105}" y="${cy-115}" font-family="sans-serif" font-size="20" fill="#171717">${label}</text><path d="M${cx-112},${cy}h224M${cx},${cy-112}v224" stroke="#d8d8d8"/>`+points.map(([x,y])=>`<rect x="${cx+x*cell-cell/2}" y="${cy-y*cell-cell/2}" width="${cell}" height="${cell}" fill="#5a79ac" stroke="white"/>`).join('')+`<circle cx="${cx}" cy="${cy}" r="4" fill="#171717"/><text x="${cx+99}" y="${cy-6}" font-size="13">x</text><text x="${cx+7}" y="${cy-98}" font-size="13">y</text>`;}
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 560" role="img" aria-label="Original figure and four quarter-turn choices"><rect width="1000" height="560" fill="white"/>${panel(spec.geometry.points,150,265,'ORIGINAL')}${spec.options.map((p,i)=>panel(p,470+(i%2)*300,145+Math.floor(i/2)*280,String.fromCharCode(65+i))).join('')}<text x="30" y="525" font-family="sans-serif" font-size="15">Rotate 90° clockwise • black dot = origin</text></svg>\n`;
}
if(require.main===module){const [specFile,cid,fpFile,report]=process.argv.slice(2);const r=verify(R.read(specFile),cid,R.read(fpFile));R.atomic(report,r);console.log(JSON.stringify({verdict:r.verdict,checks:r.checks}));process.exitCode=r.verdict==='passed'?0:1;}
module.exports={identity,generate,verify,render};
