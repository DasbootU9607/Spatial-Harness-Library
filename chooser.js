import {aggregate, exhibited, modelNames} from './shared/build-summary.js';
import {escapeHtml as e} from './shared/process.js';

const slides=document.querySelector('#harness-slides');
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
      '<div class="preview-image"><img draggable="false" src="./'+e(h.id)+'/'+e(image)+'" alt="'+e(alt)+'"></div>'+
      '<div class="harness-detail"><h2><a href="./'+e(h.id)+'/">'+e(h.name)+' ↗</a></h2><p>'+e(descriptions[h.id])+'</p>'+
      (skills.length?'<p class="harness-summary"><strong>'+skills.length+' skills</strong> · '+e(tokens)+'<br>Models: '+e(models.length?models.join(', '):'Not recorded')+'<small>Recorded build intervals only; '+summary.tokens.coverage+'/'+summary.rows.length+' have token data. Not total billed usage.</small></p>':'<p><span class="upcoming">Upcoming</span></p>')+'<a class="benchmark-source" href="'+e(h.benchmarkUrl||h.source)+'">View '+e(h.benchmark)+' ↗</a></div></article>';
  }).join('');
  let current=0;
  function alignArrows(){const preview=slides.children[current]?.querySelector('.preview-image');if(preview)document.querySelector('.carousel-stage').style.setProperty('--preview-height',preview.getBoundingClientRect().height+'px');}
  function reflect(){
    slides.dataset.current=String(current);
    slides.querySelectorAll('.harness-slide').forEach((slide,i)=>{slide.inert=i!==current;});
    document.querySelector('#carousel-status').textContent=data.harnesses[current].name;alignArrows();
  }
  function show(index){const next=(index+data.harnesses.length)%data.harnesses.length;slides.scrollTo({left:next*slides.clientWidth,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  document.querySelector('#previous').onclick=()=>show(current-1);
  document.querySelector('#next').onclick=()=>show(current+1);
  slides.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();show(event.key==='Home'?0:event.key==='End'?data.harnesses.length-1:current+(event.key==='ArrowRight'?1:-1));}});
  slides.addEventListener('scroll',()=>{const next=Math.round(slides.scrollLeft/slides.clientWidth);if(next!==current&&next>=0&&next<data.harnesses.length){current=next;reflect();}},{passive:true});
  // Native touch/trackpad scrolling, plus mouse dragging on the image area.
  let drag=null;
  slides.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='mouse'||event.button!==0||event.target.closest('a,button,.harness-detail'))return;
    drag={x:event.clientX,left:slides.scrollLeft,index:current};
    slides.classList.add('is-dragging');slides.setPointerCapture(event.pointerId);
  });
  slides.addEventListener('pointermove',event=>{if(drag)slides.scrollLeft=drag.left+drag.x-event.clientX;});
  function endDrag(event){
    if(!drag)return;
    const distance=drag.x-event.clientX,index=drag.index;drag=null;
    slides.classList.remove('is-dragging');
    if(slides.hasPointerCapture(event.pointerId))slides.releasePointerCapture(event.pointerId);
    show(event.type==='pointercancel'?index:index+(Math.abs(distance)>40?Math.sign(distance):0));
  }
  slides.addEventListener('pointerup',endDrag);slides.addEventListener('pointercancel',endDrag);
  slides.querySelectorAll('img').forEach(img=>img.addEventListener('load',alignArrows));
  new ResizeObserver(()=>{slides.scrollTo({left:current*slides.clientWidth,behavior:'instant'});alignArrows();}).observe(slides);
  reflect();
} catch(error){slides.innerHTML='<p role="alert">'+e(error.message)+' <a href="https://github.com/DasbootU9607/Spatial-Harness-Library">Browse on GitHub</a>.</p>';}
