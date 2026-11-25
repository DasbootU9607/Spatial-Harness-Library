import {aggregate, exhibited, modelNames} from './shared/build-summary.js';
import {escapeHtml as e} from './shared/process.js';

const slides=document.querySelector('#harness-slides');
const picker=document.querySelector('#harness-picker');
const descriptions={
  'maze-harness':'Plan routes through 3D mazes by pushing blocks, opening gates, and coordinating spatial mechanisms.',
  'spatialviz-harness':'Reason about 2D and 3D rotation, paper folding, cross-sections, and object motion.',
  'babyvision-harness':'Solve visual puzzles involving patterns, counting, spatial relationships, and tracing lines.',
  'spatialb-harness':'Track paths and compare shapes under spatial rotations.'
};
const previews={
  'maze-harness':['assets/thumbnails/official-hxh.png','An official MazeBench room with blocks and gates'],
  'spatialviz-harness':['paper-folding.png','An official SpatialViz paper-folding question'],
  'babyvision-harness':['find-the-different.jpg','A BabyVision find-the-different visual puzzle'],
  'spatialb-harness':['path-tracing.png','A SpatialBench path-tracing example']
};
try {
  const response=await fetch('./shared/catalog.json',{cache:'no-cache'});
  if(!response.ok)throw Error('The harness catalog could not be loaded.');
  const data=await response.json();
  slides.innerHTML=data.harnesses.map(h=>{
    const skills=data.skills.filter(s=>s.harnessId===h.id),cases=exhibited(data.cases.filter(c=>c.harnessId===h.id));
    const summary=aggregate(cases),models=[...new Set(cases.flatMap(modelNames))];
    const sample=h.id==='spatialviz-harness'?cases[0]:null;
    const [image,alt]=sample?[sample.thumbnail,sample.title+' — generated with official FreeCAD tools']:previews[h.id];
    const tokens=summary.tokens.value===null?'Tokens not recorded':summary.tokens.value.toLocaleString('en-US')+' observed tokens';
    return '<article class="harness-slide" data-harness="'+e(h.id)+'" aria-roledescription="slide" aria-label="'+e(h.name)+'">'+
      '<a class="preview-image '+(h.id==='maze-harness'?'maze':'')+'" href="./'+e(h.id)+'/" tabindex="-1"><img src="./'+e(h.id)+'/'+e(image)+'" alt="'+e(alt)+'"></a>'+
      '<div class="harness-detail"><h2><a href="./'+e(h.id)+'/">'+e(h.name)+' ↗</a></h2><p>'+e(descriptions[h.id])+'</p>'+
      (skills.length?'<p class="harness-summary"><strong>'+skills.length+' skills</strong> · '+e(tokens)+'<br>Models: '+e(models.length?models.join(', '):'Not recorded')+'<small>Recorded build intervals only; '+summary.tokens.coverage+'/'+summary.rows.length+' have token data. Not total billed usage.</small></p>':'<p><span class="upcoming">Upcoming</span></p>')+'</div></article>';
  }).join('');
  picker.innerHTML=data.harnesses.map((h,i)=>'<button type="button" data-slide="'+i+'" aria-controls="harness-slides" aria-pressed="'+(i===0)+'">'+e(h.name.replace(' Harness',''))+'</button>').join('');
  let current=0;
  function reflect(){
    picker.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===current)));
    slides.querySelectorAll('.harness-slide').forEach((slide,i)=>{slide.inert=i!==current;});
    document.querySelector('#carousel-status').textContent=(current+1)+' / '+data.harnesses.length+' · '+data.harnesses[current].benchmark;
  }
  function show(index){current=(index+data.harnesses.length)%data.harnesses.length;slides.scrollTo({left:current*slides.clientWidth,behavior:'instant'});reflect();}
  picker.addEventListener('click',event=>{const b=event.target.closest('[data-slide]');if(b)show(Number(b.dataset.slide));});
  document.querySelector('#previous').onclick=()=>show(current-1);
  document.querySelector('#next').onclick=()=>show(current+1);
  slides.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();show(event.key==='Home'?0:event.key==='End'?data.harnesses.length-1:current+(event.key==='ArrowRight'?1:-1));}});
  slides.addEventListener('scroll',()=>{const next=Math.round(slides.scrollLeft/slides.clientWidth);if(next!==current&&next>=0&&next<data.harnesses.length){current=next;reflect();}},{passive:true});
  new ResizeObserver(()=>slides.scrollTo({left:current*slides.clientWidth,behavior:'instant'})).observe(slides);
  reflect();
} catch(error){slides.innerHTML='<p role="alert">'+e(error.message)+' <a href="https://github.com/DasbootU9607/Spatial-Harness-Library">Browse on GitHub</a>.</p>';}