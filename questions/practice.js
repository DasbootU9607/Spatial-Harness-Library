import {generatePathData,generateVoxelStructure,mutateVoxelStructure} from './vendor/spatialLogic.js';
import {voxelSvg} from './figures.js';

const el=id=>document.getElementById(id);
const labels='ABCD';
const dirs=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
const rotations=[];
for(const order of dirs){
  const inv=Number(order[0]>order[1])+Number(order[0]>order[2])+Number(order[1]>order[2]);
  for(const a of [-1,1]) for(const b of [-1,1]) for(const c of [-1,1])
    if(a*b*c*(inv%2?-1:1)===1) rotations.push(p=>[a*p[order[0]],b*p[order[1]],c*p[order[2]]]);
}
function normal(points) {
  const mins=[0,1,2].map(i=>Math.min(...points.map(p=>p[i])));
  return points.map(p=>p.map((x,i)=>Math.round(x-mins[i])).join(',')).sort().join('|');
}
const signature=points=>rotations.map(turn=>normal(points.map(turn))).sort()[0];
const pick=a=>a[Math.floor(Math.random()*a.length)];
function rotated(points){
  const poses=rotations.map(turn=>points.map(turn)).filter(p=>normal(p)!==normal(points));
  return poses.length?pick(poses):points;
}
function makeShapes(){
  for(let tries=0;tries<12;tries++){
    const base=generateVoxelStructure(), seen=new Set([signature(base)]);
    const choices=[{points:rotated(base),correct:true}];
    for(let j=0;j<60&&choices.length<4;j++){
      const other=mutateVoxelStructure(base,3), key=signature(other);
      if(other.length!==base.length||seen.has(key))continue;
      seen.add(key);choices.push({points:rotated(other),correct:false});
    }
    if(choices.length<4)continue;
    for(let j=3;j>0;j--){const k=Math.floor(Math.random()*(j+1));[choices[k],choices[j]]=[choices[j],choices[k]];}
    return {base,choices};
  }
  throw Error('Could not generate a unique set of options. Select New question to try again.');
}
function renderPath(){
  const data=generatePathData(600,600);
  const edges=data.edges.map(e=>'<path data-from="'+e.from+'" d="'+e.d+'" fill="none" stroke="#393939" stroke-width="1.8" marker-end="url(#tip)"/>').join('');
  const nodes=data.nodes.map(n=>'<g transform="translate('+n.x+' '+n.y+')"><circle r="14" stroke="#222" stroke-width="1.8" fill="'+(n.id===0?'#222':'white')+'"/><text y="4.4" font-family="Arial,sans-serif" font-size="13" text-anchor="middle" fill="'+(n.id===0?'white':'#222')+'">'+n.id+'</text></g>').join('');
  el('play').innerHTML='<svg class="graph" viewBox="0 0 600 600" role="img" aria-label="Directed curves connecting twenty numbered nodes"><defs><marker id="tip" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 L2 4Z" fill="#393939"/></marker></defs><g id="network">'+edges+nodes+'</g></svg><form class="play-form"><label>Destination node (0–19)<input aria-label="Destination node" type="number" required min="0" max="19" step="1"></label><button type="submit">Check answer</button></form>';
  const box=el('network').getBBox();
  el('play').querySelector('svg').setAttribute('viewBox',[box.x-16,box.y-16,box.width+32,box.height+32].join(' '));
  const form=el('play').querySelector('form');
  form.onsubmit=e=>{
    e.preventDefault();
    const input=form.querySelector('input');
    if(!form.reportValidity())return;
    el('feedback').textContent=Number(input.value)===data.answerId?'Correct. The curve ends at node '+data.answerId+'.':'The curve ends at node '+data.answerId+'.';
    const curve=el('network').querySelector('[data-from="0"]');
    curve.setAttribute('stroke-width','4.5'); curve.setAttribute('stroke','#000');
    input.disabled=true;form.querySelector('button').disabled=true;
  };
}
function renderShapes(){
  const {base,choices}=makeShapes(), correct=choices.findIndex(c=>c.correct);
  el('play').innerHTML='<div class="reference-shape"><small>REFERENCE</small>'+voxelSvg(base)+'</div><div class="picks">'+choices.map((opt,i)=>'<button class="pick" aria-label="Option '+labels[i]+'"><span>'+labels[i]+'</span>'+voxelSvg(opt.points)+'</button>').join('')+'</div>';
  const buttons=[...el('play').querySelectorAll('.pick')];
  buttons.forEach((b,i)=>{b.onclick=()=>{
    buttons.forEach((opt,j)=>{opt.disabled=true;if(j===correct)opt.classList.add('right')});
    if(i!==correct)b.classList.add('wrong');
    el('feedback').textContent=i===correct?'Correct. Option '+labels[correct]+' matches the reference shape.':'The rotated match is option '+labels[correct]+'.';
  }});
}
let mode='2d',round=0;
function start(nextMode){
  if(mode!==nextMode)round=0;
  mode=nextMode; round++;
  el('round').textContent='GENERATED / ROUND '+String(round).padStart(3,'0');
  el('mode2').setAttribute('aria-pressed',String(mode==='2d'));
  el('mode3').setAttribute('aria-pressed',String(mode==='3d'));
  el('exercise-name').textContent=mode==='2d'?'2D path tracing':'3D mental rotation';
  el('exercise-prompt').textContent=mode==='2d'?'Start at the black node labeled 0 and follow its outgoing curve. Which node does it reach?':'Which of the four shapes can you obtain by rotating the reference shape?';
  el('feedback').textContent='';
  try{if(mode==='2d')renderPath();else renderShapes();}
  catch(error){el('play').replaceChildren();el('feedback').textContent=error.message;}
}
export function openPractice(){if(!round)start(mode);}
el('new-round').onclick=()=>start(mode);
el('mode2').onclick=()=>start('2d');
el('mode3').onclick=()=>start('3d');
