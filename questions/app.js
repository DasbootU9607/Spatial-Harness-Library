import {drawPlates} from './figures.js';
import {openPractice} from './practice.js';

const el=id=>document.getElementById(id);
const config={
  spatialviz:{name:'SpatialViz-Bench',index:'01',count:'1,180 questions / 12 tasks',link:'https://wangst0181.github.io/SpatialViz-Bench/#examples'},
  babyvision:{name:'BabyVision',index:'02',count:'388 visual questions / 280 image tasks',link:'https://unipat.ai/blog/BabyVision'}
};
const names={
  vqa:'Visual question answering', 'image-answer':'Image annotation',
  MentalRotation:'Mental rotation', MentalAnimation:'Mental animation', MentalFolding:'Mental folding', VisualPenetration:'Visual penetration',
  '2DRotation':'2D rotation', '3DRotation':'3D rotation', '3ViewProjection':'Three-view projection',
  CubeUnfolding:'Cube unfolding', CubeReconstruction:'Cube reconstruction', PaperFolding:'Paper folding', CrossSection:'Cross-sections',
  CubeCounting:'Cube counting', CubeAssembly:'Cube assembly', ArrowMoving:'Arrow movement', BlockMoving:'Block movement', MechanicalSystem:'Mechanical systems'
};
const label=s=>names[s]||s;
const cache=new Map();
const filters=['track','category','type','level'];
let route='',requestNo=0,rows=[],matches=[],current=null;
const states=new Map();
function newState(){return {track:'',category:'',type:'',level:'',search:'',id:''};}
function state(){if(!states.has(route))states.set(route,newState());return states.get(route);}
function setOptions(select,values,selected,allText){
  select.replaceChildren(new Option(allText,''),...values.map(v=>new Option(label(v),v)));
  select.value=values.includes(selected)?selected:'';
  return select.value;
}
function refreshFilters(){
  const s=state();let candidates=rows;
  for(const key of filters){
    const values=[...new Set(candidates.map(r=>r[key]).filter(Boolean))].sort();
    s[key]=setOptions(el(key),values,s[key],{track:'All formats',category:'All categories',type:'All tasks',level:'All levels'}[key]);
    if(s[key])candidates=candidates.filter(r=>r[key]===s[key]);
  }
  el('track-field').hidden=route!=='babyvision';el('level-field').hidden=route==='babyvision';
  el('search').value=s.search;
  const terms=s.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  matches=candidates.filter(r=>{
    const text=[r.id,r.question,r.type,label(r.type),r.category,label(r.category),r.sourceId].join(' ').toLowerCase();
    return terms.every(t=>text.includes(t));
  });
  el('jump').replaceChildren(...matches.map((r,i)=>new Option(String(i+1)+' · '+label(r.type)+' '+String(r.sourceId).split('/').pop(),r.id)));
  el('matches').textContent=matches.length.toLocaleString('en-US')+(matches.length===1?' result':' results');
  el('jump').disabled=!matches.length;
  renderCase(matches.find(r=>r.id===s.id)||matches[0]||null);
}
function closeZoom(){if(el('lightbox').open)el('lightbox').close();}
function zoom(url,name){el('large-pic').src=url;el('large-pic').alt=name;el('raw').href=url;el('lightbox').showModal();}
el('close-dialog').onclick=closeZoom;
el('lightbox').onclick=e=>{if(e.target===el('lightbox'))closeZoom();};
function renderCase(record){
  current=record;const s=state();s.id=record?.id||'';
  el('case-body').hidden=!record;el('case-empty').hidden=Boolean(record);
  const url=new URL(location.href);
  url.hash='/'+route+(record?'?case='+encodeURIComponent(record.id):'');
  history.replaceState(null,'',url);
  if(!record)return;
  const i=matches.indexOf(record);
  el('jump').value=record.id;el('position').textContent='CASE '+String(i+1).padStart(3,'0')+' / '+matches.length.toLocaleString();
  el('case-heading').textContent=label(record.type);
  el('tags').textContent=[label(record.category),record.type,record.level||label(record.track)].join(' · ');
  el('pic').src=record.image;el('pic').alt=label(record.type)+' original image '+record.sourceId;
  el('zoom').onclick=()=>zoom(record.image,el('pic').alt);
  el('prev').disabled=i===0;el('next').disabled=i===matches.length-1;
  el('prompt').textContent=record.question;
  el('options').replaceChildren(...record.options.map((text,j)=>{
    const li=document.createElement('li'),letter=String.fromCharCode(65+j);
    li.textContent=text===letter?letter:letter+'. '+text;
    return li;
  }));
  el('answer').open=false;
  el('answer').querySelector('summary').textContent=record.answerImage?'Show annotated answer':'Show answer and explanation';
  el('answer-content').replaceChildren();
  el('case-id').textContent='ID '+record.id;
}
el('answer').ontoggle=()=>{
  if(!current||!el('answer').open||el('answer-content').childElementCount)return;
  if(current.answerImage){
    const url=current.answerImage;
    const button=document.createElement('button');button.className='original';button.setAttribute('aria-label','Enlarge annotated answer');
    const img=new Image();img.src=url;img.alt='Annotated answer';button.append(img);
    button.onclick=()=>zoom(url,'Annotated answer');el('answer-content').append(button);
  }else{
    const answer=document.createElement('strong');answer.textContent='Official answer '+current.answer;el('answer-content').append(answer);
  }
  if(current.explanation){const p=document.createElement('p');p.lang='en';p.textContent=current.explanation;el('answer-content').append(p);}
};
el('prev').onclick=()=>renderCase(matches[matches.indexOf(current)-1]);
el('next').onclick=()=>renderCase(matches[matches.indexOf(current)+1]);
el('jump').onchange=e=>renderCase(matches.find(r=>r.id===e.target.value));
for(const key of filters)el(key).onchange=e=>{
  const s=state();s[key]=e.target.value;
  for(const lower of filters.slice(filters.indexOf(key)+1))s[lower]='';
  refreshFilters();
};
el('search').oninput=e=>{state().search=e.target.value;refreshFilters();};
el('clear').onclick=()=>{states.set(route,newState());refreshFilters();};
function selectNav(page){
  document.querySelectorAll('.mast nav a').forEach(a=>{
    if(a.hash==='#/'+page)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  });
}
async function navigate(){
  const number=++requestNo;
  const [path,query='']=location.hash.slice(1).split('?');
  const part=(path||'').replace(/^\//,'');
  route=(Object.hasOwn(config,part)||part==='spatialbench')?part:'';
  selectNav(route);closeZoom();
  el('home').hidden=Boolean(route);el('archive').hidden=!Object.hasOwn(config,route);el('practice').hidden=route!=='spatialbench';
  document.title=(config[route]?.name||(route==='spatialbench'?'spatialbench':'Visual reasoning archive'))+' · Spatial Index';
  if(part==='collections'){requestAnimationFrame(()=>el('collections').scrollIntoView());return;}
  window.scrollTo({top:0,behavior:'instant'});
  if(!route)return;
  if(route==='spatialbench'){openPractice();return;}
  const page=route,c=config[page];
  el('archive-harness').href='../'+(page==='spatialviz'?'spatialviz-harness':'babyvision-harness')+'/';
  el('archive-harness').textContent='← '+(page==='spatialviz'?'SpatialViz':'BabyVision')+' Harness';
  el('archive-kicker').textContent='COLLECTION '+c.index+' / OFFICIAL CASES';
  el('archive-name').textContent=c.name;el('archive-count').textContent=c.count;el('archive-source').href=c.link;
  el('reader').hidden=true;el('archive-status').textContent='Loading questions…';
  try{
    if(!cache.has(page))cache.set(page,fetch('data/'+page+'.json').then(res=>{
      if(!res.ok)throw Error('HTTP '+res.status);return res.json();
    }).catch(error=>{cache.delete(page);throw error;}));
    const data=await cache.get(page);
    if(number!==requestNo)return;
    rows=data;
    const requested=new URLSearchParams(query).get('case');
    if(requested&&rows.some(r=>r.id===requested)&&requested!==state().id){states.set(page,{...newState(),id:requested});}
    el('reader').hidden=false;el('archive-status').textContent='';
    refreshFilters();
  }catch{if(number===requestNo)el('archive-status').textContent='The collection could not be loaded. Check your connection and refresh the page.';}
}
drawPlates();
document.querySelector('.skip').onclick=e=>{e.preventDefault();el('main').focus();el('main').scrollIntoView();};
window.addEventListener('hashchange',navigate);
navigate();
