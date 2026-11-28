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
const states=new Map(),answers=new Map(),questionCards=new Map();
const answerKey=record=>route+':'+record.id;
const mobile=window.matchMedia('(max-width:760px)');
const syncCatalogue=()=>{el('catalogue-panel').open=!mobile.matches;};
mobile.addEventListener('change',syncCatalogue);syncCatalogue();
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
  el('matches').textContent=matches.length.toLocaleString('en-US')+(matches.length===1?' result':' results');
  renderQuestionList();
  renderCase(matches.find(r=>r.id===s.id)||matches[0]||null);
}
function choiceIndex(record){
  if(record.answerKind!=='choice'||!Array.isArray(record.options))return -1;
  const answer=String(record.answer||'').trim().toUpperCase();
  if(!/^[A-Z]$/.test(answer))return -1;
  const index=answer.charCodeAt(0)-65;
  return index===record.answerIndex&&index<record.options.length?index:-1;
}
function renderQuestionList(){
  const list=el('question-list');questionCards.clear();
  list.replaceChildren(...matches.map((record,index)=>{
    const button=document.createElement('button');button.type='button';button.className='question-card';button.dataset.case=record.id;
    button.setAttribute('aria-current',String(record.id===current?.id));
    const title=document.createElement('span');title.className='question-card-title';title.textContent=String(index+1).padStart(3,'0')+' · '+label(record.type);
    const meta=document.createElement('span');meta.className='question-card-meta';meta.textContent=[record.level||label(record.track),String(record.sourceId).split('/').pop()].join(' · ');
    button.append(title,meta);
    questionCards.set(record.id,button);updateQuestionCard(record);
    button.onclick=()=>{renderCase(record);if(mobile.matches)el('catalogue-panel').open=false;el('case-heading').focus({preventScroll:true});};
    return button;
  }));
  list.scrollTop=0;
}
function updateQuestionCard(record){
  const button=questionCards.get(record?.id);if(!button)return;
  button.setAttribute('aria-current',String(record.id===current?.id));
  const selected=answers.get(answerKey(record));let result=button.querySelector('.question-card-state');
  if(selected===undefined){result?.remove();return;}
  if(!result){result=document.createElement('span');button.append(result);}
  const correct=selected===choiceIndex(record);result.className='question-card-state '+(correct?'correct':'incorrect');result.textContent=correct?'Correct':'Incorrect';
}
function revealQuestionCard(){
  const card=questionCards.get(current?.id),list=el('question-list');
  if(!card||!el('catalogue-panel').open)return;
  const item=card.getBoundingClientRect(),box=list.getBoundingClientRect();
  if(item.top<box.top)list.scrollTop+=item.top-box.top-3;
  else if(item.bottom>box.bottom)list.scrollTop+=item.bottom-box.bottom+3;
}
el('catalogue-panel').addEventListener('toggle',revealQuestionCard);
function applyChoiceState(record,selected){
  const correct=choiceIndex(record);
  el('options').querySelectorAll('[data-answer]').forEach((option,index)=>{
    const right=selected!==undefined&&index===correct,wrong=selected!==undefined&&index===selected&&index!==correct;
    option.classList.toggle('is-correct',right);option.classList.toggle('is-incorrect',wrong);
    option.querySelector('input').checked=index===selected;
    option.querySelector('.choice-state').textContent=right?'Correct answer':wrong?'Your answer · Incorrect':'';
  });
  el('retry-answer').hidden=selected===undefined;
  el('official-answer-status').textContent=selected===undefined?'':selected===correct?'Correct.':`Incorrect. The correct answer is ${String.fromCharCode(65+correct)}.`;
}
function renderChoices(record){
  const supported=choiceIndex(record)>=0;
  el('options').replaceChildren();
  const legend=document.createElement('legend');legend.className='visually-hidden';legend.textContent='Answer choices';el('options').append(legend);
  el('options').hidden=!supported;el('answer-hint').hidden=!supported;el('response-note').hidden=supported;
  el('retry-answer').hidden=true;el('official-answer-status').textContent='';
  el('response-heading').textContent=supported?'Your answer':'Response format';
  if(!supported){
    el('response-note').textContent=record.answerImage?'This is an image annotation task. Open the annotated answer below to compare your solution.':'This is a written-answer question. Open the official answer below to compare your response.';
    return;
  }
  record.options.forEach((text,index)=>{
    const letter=String.fromCharCode(65+index),option=document.createElement('label');option.className='answer-choice';option.dataset.answer=String(index);
    const input=document.createElement('input');input.type='radio';input.name='official-answer';input.value=String(index);input.setAttribute('aria-label',`Option ${letter}${text&&text!==letter?'. '+text:''}`);
    const badge=document.createElement('span');badge.className='choice-letter';badge.setAttribute('aria-hidden','true');badge.textContent=letter;
    const copy=document.createElement('span');copy.className='choice-copy';copy.textContent=text&&text!==letter?text:`Option ${letter}`;
    const result=document.createElement('span');result.className='choice-state';copy.append(result);option.append(input,badge,copy);el('options').append(option);
  });
  applyChoiceState(record,answers.get(answerKey(record)));
}
el('official-response').onsubmit=event=>event.preventDefault();
el('official-response').onchange=event=>{
  if(!current||!event.target.matches('input[name="official-answer"]')||choiceIndex(current)<0)return;
  const selected=Number(event.target.value);answers.set(answerKey(current),selected);applyChoiceState(current,selected);updateQuestionCard(current);
};
el('retry-answer').onclick=()=>{
  if(!current)return;answers.delete(answerKey(current));applyChoiceState(current,undefined);updateQuestionCard(current);el('options').querySelector('input')?.focus({preventScroll:true});
};
function closeZoom(){if(el('lightbox').open)el('lightbox').close();}
function zoom(url,name){el('large-pic').src=url;el('large-pic').alt=name;el('raw').href=url;el('lightbox').showModal();}
el('close-dialog').onclick=closeZoom;
el('lightbox').onclick=event=>{if(event.target===el('lightbox')){const box=el('lightbox').getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)closeZoom();}};
el('zoom-detail').onclick=()=>{const expanded=el('image-scroll').classList.toggle('is-zoomed');el('zoom-detail').setAttribute('aria-pressed',String(expanded));el('zoom-detail').textContent=expanded?'Fit image':'Zoom in';};
el('lightbox').addEventListener('close',()=>{el('image-scroll').classList.remove('is-zoomed');el('zoom-detail').setAttribute('aria-pressed','false');el('zoom-detail').textContent='Zoom in';});
function renderCase(record){
  const previous=current;current=record;const s=state();s.id=record?.id||'';
  updateQuestionCard(previous);updateQuestionCard(current);revealQuestionCard();
  el('case-body').hidden=!record;el('case-empty').hidden=Boolean(record);
  const url=new URL(location.href);
  url.hash='/'+route+(record?'?case='+encodeURIComponent(record.id):'');
  history.replaceState(null,'',url);
  if(!record)return;
  const i=matches.indexOf(record);
  el('position').textContent='CASE '+String(i+1).padStart(3,'0')+' / '+matches.length.toLocaleString();
  el('case-heading').textContent=label(record.type);
  el('tags').textContent=[label(record.category),record.type,record.level||label(record.track)].join(' · ');
  el('pic').src=record.image;el('pic').alt=label(record.type)+' original image '+record.sourceId;
  el('zoom').onclick=()=>zoom(record.image,el('pic').alt);
  el('prev').disabled=i===0;el('next').disabled=i===matches.length-1;
  el('prompt').textContent=record.question;
  renderChoices(record);
  el('answer').open=false;
  el('answer').querySelector('summary').textContent=record.answerImage?'Show annotated answer':'Official answer & explanation';
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
el('prev').onclick=()=>{const next=matches[matches.indexOf(current)-1];if(next)renderCase(next);};
el('next').onclick=()=>{const next=matches[matches.indexOf(current)+1];if(next)renderCase(next);};
for(const key of filters)el(key).onchange=e=>{
  const s=state();s[key]=e.target.value;
  for(const lower of filters.slice(filters.indexOf(key)+1))s[lower]='';
  refreshFilters();
};
el('search').oninput=e=>{state().search=e.target.value;refreshFilters();};
el('clear').onclick=()=>{states.set(route,newState());refreshFilters();};
async function navigate(){
  const number=++requestNo;
  const [path,query='']=location.hash.slice(1).split('?');
  const part=(path||'').replace(/^\//,'');
  route=(Object.hasOwn(config,part)||part==='spatialbench')?part:'spatialviz';
  document.body.classList.toggle('archive-page',Object.hasOwn(config,route));
  closeZoom();
  el('entry-status').hidden=true;el('archive').hidden=!Object.hasOwn(config,route);el('practice').hidden=route!=='spatialbench';
  document.title=(config[route]?.name || 'spatialbench')+' · Spatial Harness Library';
  window.scrollTo({top:0,behavior:'instant'});
  if(route==='spatialbench'){openPractice();return;}
  const page=route,c=config[page];
  el('archive-harness').href='../'+(page==='spatialviz'?'spatialviz-harness':'babyvision-harness')+'/';
  el('archive-harness').textContent='← '+(page==='spatialviz'?'SpatialViz':'BabyVision')+' Harness';
  el('archive-kicker').textContent='OFFICIAL QUESTIONS';
  el('archive-name').textContent=c.name;el('archive-count').textContent=c.count;el('archive-source').href=c.link;
  el('reader').hidden=true;el('archive-controls').hidden=true;el('archive-status').textContent='Loading questions…';
  try{
    if(!cache.has(page))cache.set(page,fetch('data/'+page+'.json').then(res=>{
      if(!res.ok)throw Error('HTTP '+res.status);return res.json();
    }).catch(error=>{cache.delete(page);throw error;}));
    const data=await cache.get(page);
    if(number!==requestNo)return;
    rows=data;
    const params=new URLSearchParams(query);
    const requested=params.get('case'), type=params.get('type');
    if(page==='spatialviz'&&!requested&&type&&rows.some(r=>r.type===type))states.set(page,{...newState(),type});
    if(requested&&rows.some(r=>r.id===requested)&&requested!==state().id){states.set(page,{...newState(),id:requested});}
    el('reader').hidden=false;el('archive-controls').hidden=false;el('archive-status').textContent='';
    refreshFilters();
    if(new URLSearchParams(query).get('answer')==='1')el('answer').open=true;
  }catch{if(number===requestNo)el('archive-status').textContent='The collection could not be loaded. Check your connection and refresh the page.';}
}
document.querySelector('.skip').onclick=e=>{e.preventDefault();el('main').focus();el('main').scrollIntoView();};
window.addEventListener('hashchange',navigate);
navigate();
