import {renderProcess, usageOverview, escapeHtml as e} from './process.js';
import {exhibited, modelNames as models, intervals, aggregate} from './build-summary.js';
const main=document.querySelector('#main'),hid=document.body.dataset.harness,mode=document.body.dataset.page;
const data=await fetch('../shared/catalog.json').then(r=>{if(!r.ok)throw Error('Catalog unavailable');return r.json();}).catch(error=>{main.innerHTML=`<p role="alert">${e(error.message)}. Reload or return to the <a href="../">library</a>.</p>`;throw error;});
const h=data.harnesses.find(x=>x.id===hid),skills=data.skills.filter(x=>x.harnessId===hid),allCases=data.cases.filter(x=>x.harnessId===hid),cases=exhibited(allCases),official=data.official.filter(x=>x.harnessId===hid);
document.querySelector('#header').innerHTML=`<div class="wrap head"><a class="brand" href="index.html">${e(h.name)}</a><nav aria-label="Main navigation"><a href="../">Library home</a><a href="index.html#skills">Skills</a><a href="${e(h.browser)}">${e(h.browserLabel)}</a><a href="${e(h.playground)}">Playground</a><a class="benchmark-link" href="${e(h.benchmarkUrl||h.source)}">${e(h.benchmark)} ↗</a><a href="https://github.com/DasbootU9607/Spatial-Harness-Library/tree/main/${e(hid)}">GitHub ↗</a></nav></div>`;
document.querySelector('#footer').innerHTML=`<div class="wrap footer-inner"><a href="${e(h.source)}">${e(h.benchmark)} ↗</a><a href="../">Harness library</a><a href="../questions/sources.html">Sources and licenses</a><a href="../maze-harness/licenses/geist.txt">Font license</a><a href="https://github.com/DasbootU9607/Spatial-Harness-Library/tree/main/${e(hid)}">GitHub ↗</a></div>`;
const num=x=>x==null?'Unavailable':Number(x).toLocaleString();
const duration=x=>x==null?'Unavailable':x<60000?(x/1000).toFixed(1)+' s':(x/60000).toFixed(1)+' min';
const empty=text=>`<div class="empty">${e(text)}</div>`;
const taskUrl=c=>c.taskUrl||'task.html?id='+encodeURIComponent(c.id);
const processUrl=c=>c.processUrl||(typeof c.process==='string'?(h.legacy?'build.html':'process.html')+'?id='+encodeURIComponent(c.id):null);
function card(c){if(!c)return empty('No verified authored example is published yet.');const p=processUrl(c);return `<article class="card" data-case="${e(c.id)}">${c.thumbnail?`<a href="${e(taskUrl(c))}" tabindex="-1"><img src="${e(c.thumbnail)}" alt="${e(c.title)}" loading="lazy"></a>`:empty('Version-bound preview unavailable')}<div class="card-body"><span class="badge">${c.sourceKind==='official'?'Official reference':c.sourceKind==='demonstration'?'Authored demonstration':'Agent-authored'}</span>${c.generationMethod==='Spatial Harness original FreeCAD assembly'?'<span class="badge">Library FreeCAD model</span>':c.generationMethod?.includes("FreeCAD")?'<span class="badge">Official FreeCAD tools</span>':''}<span class="badge">${e(c.taskType||c.category||'Task')}</span><h3>${e(c.title)}</h3><p>${e(c.description||'')}</p><p class="mono">${e(typeof c.difficulty==='object'?c.difficulty?.label:c.difficulty||'Difficulty not ranked')}${c.sourceKind!=='official'?' · '+e(models(c).join(', ')):''}</p><div class="actions"><a href="${e(taskUrl(c))}">Open task ↗</a>${c.sourceKind==='official'||c.taskArtifact?`<a href="${e(taskUrl(c))}${c.legacy&&c.solution?'&replay=1':taskUrl(c).includes('#')?'&answer=1':'#answer'}">Show solution</a>`:''}${p?`<a href="${e(p)}">Build process</a>`:c.sourceKind!=='official'?'<span class="muted">Process unavailable</span>':''}${c.taskArtifact?`<a href="${e(c.taskArtifact)}" download>Download task</a>`:''}</div></div></article>`;}
function install(skill){if(!skill)return empty('Construction packages are not yet complete for this harness. Browse the source collection while authoring support develops.');const cmd=skill.install;return `<div class="install"><code>${e(cmd)}</code><button data-copy="${e(cmd)}" aria-label="Copy installation command">Copy</button></div><p class="source-note">Run from a checkout of Spatial Harness Library. Then invoke <code>$${e(skill.packageName||skill.id)}</code> with your task request. <a href="https://github.com/DasbootU9607/Spatial-Harness-Library/blob/main/docs/observability.md">Setup and capture coverage ↗</a></p>`;}
function overview(items){const a=aggregate(items);return `<div class="stats"><div class="stat"><span class="eyebrow">Observed build time</span><strong>${duration(a.time.value)}</strong><small>${a.time.coverage}/${a.rows.length} intervals measured</small></div><div class="stat"><span class="eyebrow">Observed tokens</span><strong>${num(a.tokens.value)}</strong><small>${a.tokens.coverage}/${a.rows.length} intervals measured</small></div><div class="stat"><span class="eyebrow">Published builds</span><strong>${a.rows.length}</strong><small>${items.length} accepted tasks · unique intervals only</small></div></div><p class="source-note">Passive session observations include tools and waiting. Earlier conversation, other agents, delayed reports and the in-flight final response are excluded. These are not complete billed-task totals.</p>`;}
function download(name,value,type='application/json'){const url=URL.createObjectURL(new Blob([type==='application/json'?JSON.stringify(value,null,2):value],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);}
function ladder(container,items,skillId){const rows=intervals(items),clients=[...new Set(rows.map(x=>x.usage.runtime||'Unknown client'))];container.innerHTML=`<div class="section-heading"><div><p class="eyebrow">MEASURED RESOURCE USE</p><h2>${skillId?'Build ladder':'Resource-use leaderboard'}</h2></div></div><p class="source-note">Observed consumption, grouped by runtime-reported model and reasoning setting. This is not a controlled model-quality ranking. Multi-model wall time is not attributed to individual models.</p><div class="controls"><label>Metric<select data-metric><option value="time">Build time</option><option value="total_tokens">Total tokens</option><option value="input_tokens">Input tokens</option><option value="cached_input_tokens">Cached input</option><option value="cache_write_input_tokens">Cache creation</option><option value="output_tokens">Output tokens</option><option value="reasoning_output_tokens">Reasoning output</option></select></label><label>Client<select data-client><option value="all">All clients</option>${clients.map(x=>`<option>${e(x)}</option>`).join('')}</select></label>${skillId?'':`<label>Skill<select data-skill><option value="all">All skills</option>${skills.map(s=>`<option value="${e(s.id)}">${e(s.name)}</option>`).join('')}</select></label>`}<label>View<select data-view><option value="total">Total</option><option value="average">Per measured build</option></select></label></div><div data-table></div><div class="downloads"><button data-json>Download JSON</button><button data-csv>Download CSV</button></div>`;
 let result=[];function update(){const metric=container.querySelector('[data-metric]').value,client=container.querySelector('[data-client]').value,skill=skillId||container.querySelector('[data-skill]').value,average=container.querySelector('[data-view]').value==='average',groups=new Map();for(const r of rows.filter(r=>(client==='all'||(r.usage.runtime||'Unknown client')===client)&&(skill==='all'||r.skillIds.includes(skill)))){for(const m of r.usage.models?.length?r.usage.models:[{model:null,reasoningEffort:null,tokens:{}}]){const key=JSON.stringify([m.provider,m.model,m.reasoningEffort]);if(!groups.has(key))groups.set(key,{provider:m.provider||null,model:m.model||null,reasoning:m.reasoningEffort||null,values:[],builds:[]});const g=groups.get(key),value=metric==='time'?(r.usage.models?.length===1?r.usage.elapsedMs:null):m.tokens?.[metric];if(Number.isFinite(value))g.values.push(value);g.builds.push(r);}}
 result=[...groups.values()].map(g=>({...g,value:g.values.length?g.values.reduce((a,b)=>a+b,0)/(average?g.values.length:1):null})).sort((a,b)=>(a.value??Infinity)-(b.value??Infinity));container.querySelector('[data-table]').innerHTML=result.length?`<div class="table-wrap"><table><thead><tr><th>Model / reasoning</th><th>${metric==='time'?'Observed time':'Observed tokens'}</th><th>Coverage</th>${hid==='spatialviz-harness'?'':'<th>Builds</th>'}</tr></thead><tbody>${result.map(g=>`<tr><td>${e(g.model||'Unknown model')}<br><small>${e(g.reasoning||'Setting unavailable')} · ${e(g.provider||'Unknown provider')}</small></td><td class="mono">${metric==='time'?duration(g.value):num(g.value)}</td><td>${g.values.length}/${g.builds.length}</td>${hid==='spatialviz-harness'?'':`<td>${g.builds.map((r,i)=>`<a href="${e(processUrl(r.cases[0]))}">${i+1}</a>`).join(' · ')}</td>`}</tr>`).join('')}</tbody></table></div>`:empty('No measured build intervals match these filters.');}
 container.querySelectorAll('select').forEach(s=>s.onchange=update);container.querySelector('[data-json]').onclick=()=>download('resource-use.json',result.map(g=>({model:g.model,provider:g.provider,reasoningEffort:g.reasoning,value:g.value,measured:g.values.length,builds:g.builds.map(x=>x.id)})));container.querySelector('[data-csv]').onclick=()=>download('resource-use.csv','model,provider,reasoning,value,measured,builds\n'+result.map(g=>[g.model,g.provider,g.reasoning,g.value,g.values.length,g.builds.length].map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n'),'text/csv');update();}
function chips(s){
 if(hid==='spatialviz-harness'){
  const ref=official.find(c=>s.officialReferences?.includes(c.id));
  if(mode==='home')return `<a class="reference-link" href="skill.html?id=${e(s.id)}#official-references">View references</a>`;
  return ref?`<a class="reference-link" href="../questions/#/spatialviz?type=${encodeURIComponent(ref.taskType)}">View all references</a>`:'';
 }
 return `<div class="chips">${(s.officialReferences||[]).map(id=>{const c=official.find(x=>x.id===id);return c?`<a href="${e(taskUrl(c))}">${e(c.title)}</a>`:`<span>${e(id)} · unavailable</span>`;}).join('')}</div>`;}
function home(){const sample=cases.find(c=>c.verification?.verdict==='passed')||cases[0],ref=official.find(c=>sample?.sourceCaseIds?.includes(c.id))||official[0];main.innerHTML=`<section class="hero"><p class="eyebrow">Spatial Harness Library / ${e(h.benchmark)}</p><div class="hero-grid"><h1 class="display">${e(h.title)}</h1><div class="hero-copy"><p>${e(h.description)}</p><div class="actions"><a class="button primary" href="#skills">Explore skills ↗</a><a class="button" href="${e(h.browser)}">${e(h.browserLabel)} ↗</a></div></div></div>${install(skills[0])}<p class="meta">${skills.length} completed skills / ${cases.length} authored tasks / ${h.officialCount??0} packaged official records</p></section><section class="section"><p class="eyebrow">BUILD OBSERVATORY</p>${overview(cases)}</section><section class="section"><div class="section-heading"><h2>From reference to construction.</h2><span class="eyebrow">SOURCE / VERIFIED EXAMPLE</span></div><div class="pair">${ref?card(ref):empty('No official fixed question set is packaged here. Generated spatialbench practice is separate from its official leaderboard set.')}${card(sample)}</div></section><section class="section" id="leaderboard"></section><section class="section" id="skills"><div class="section-heading"><h2>The skill directory.</h2><span class="meta">${skills.length} completed packages</span></div>${skills.length?skills.map(s=>{const c=cases.find(c=>c.skillIds.includes(s.id));return `<div class="directory-row"><div><h3><a href="skill.html?id=${e(s.id)}">${e(s.name)}</a></h3><p>${e(s.description)}</p></div>${chips(s)}<div class="directory-preview">${c?`<img src="${e(c.thumbnail)}" alt=""><a href="${e(taskUrl(c))}">${e(c.title)} ↗</a>${hid==='spatialviz-harness'&&processUrl(c)?`<a href="${e(processUrl(c))}">Build process</a>`:''}`:'<span class="muted">No currently exhibited example</span>'}</div></div>`;}).join(''):empty('No completed construction skill has been registered yet.')}</section><section class="section"><div class="section-heading"><h2>Explore the source collection.</h2><a href="${e(h.browser)}">${e(h.browserLabel)} ↗</a></div><div class="chips">${(h.categories||[]).map(c=>`<a href="${e(h.browser)}">${e(c)}</a>`).join('')}</div><p class="source-note">${h.tracks?Object.entries(h.tracks).map(([k,v])=>`${e(k)}: ${v}`).join(' · '):hid==='spatialb-harness'?'Two ephemeral practice modes. The official 50-question leaderboard set is separate.':'Complete official MazeBench rooms and existing playable routes.'}</p></section><section class="section" id="cases"><div class="section-heading"><h2>Built with the skills.</h2></div><div id="skill-filters" class="skill-filters" role="group" aria-label="Filter tasks by skill"></div><p id="case-count" class="source-note" role="status"></p><div id="case-gallery" class="pair"></div></section><section class="section"><h2>Give your agent a spatial vocabulary.</h2><p>Clone the library, install a completed package, and describe the task. Recording, verification and publication are part of the construction workflow.</p>${install(skills[0])}</section>`;ladder(document.querySelector('#leaderboard'),cases);mountGallery();}
function mountGallery(){
 const filters=document.querySelector('#skill-filters'),gallery=document.querySelector('#case-gallery');
 const requested=new URLSearchParams(location.search).get('skill');
 let selected=skills.some(s=>s.id===requested)?requested:'all';
 filters.innerHTML=[{id:'all',name:'All skills'},...skills].map(s=>`<button type="button" data-filter="${e(s.id)}" aria-controls="case-gallery" aria-pressed="${s.id===selected}">${e(s.name)}</button>`).join('');
 function update(){
  const items=cases.filter(c=>selected==='all'||c.skillIds.includes(selected));
  filters.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===selected)));
  document.querySelector('#case-count').textContent=`${items.length} ${items.length===1?'task':'tasks'}`;
  gallery.innerHTML=items.length?items.map(card).join(''):empty('No published tasks for this skill yet.');
 }
 filters.addEventListener('click',event=>{const b=event.target.closest('[data-filter]');if(!b)return;selected=b.dataset.filter;const url=new URL(location.href);if(selected==='all')url.searchParams.delete('skill');else url.searchParams.set('skill',selected);history.replaceState(null,'',url);update();});
 update();
}
function skillPage() {
 const skill = skills.find(s => s.id === new URLSearchParams(location.search).get('id'));
 if (!skill) { main.innerHTML = empty('Skill not found. Return to the skill directory.'); return; }
 const built = cases.filter(c => c.skillIds.includes(skill.id));
 const refs = official.filter(c => skill.officialReferences?.includes(c.id));
 const spatial = hid === 'spatialviz-harness';
 const filterHtml = `<label>Model <select id="model-filter"><option value="all">All models</option>${[...new Set(built.flatMap(models))].map(name => `<option>${e(name)}</option>`).join('')}</select></label>`;
 const authored = '<div id="authored" class="stack"></div>';
 const examples = spatial
   ? `<section class="reference-comparisons" id="official-references" aria-labelledby="reference-heading">
       <div class="comparison-tools">${chips(skill)}${filterHtml}</div>
       <div class="comparison-headings"><h2 id="reference-heading">Official references</h2><h2>Built with the skill</h2></div>${authored}
     </section>`
   : `<div class="pair"><section><h2>Official references</h2><div class="stack">${refs.length ? refs.map(card).join('') : empty('No official reference is declared for this demonstration family.')}</div></section>
       <section><h2>Built with the skill</h2>${filterHtml}<div id="authored" class="stack" style="margin-top:20px"></div></section></div>`;
 main.innerHTML = `<p class="crumb"><a href="index.html">${e(h.name)}</a> / <a href="index.html#skills">Skills</a> / ${e(skill.name)}</p>
   <div class="skill-layout"><aside class="skill-nav" aria-label="Skill navigation">${skills.map(s => `<a href="skill.html?id=${e(s.id)}" ${s.id===skill.id?'aria-current="page"':''}>${e(s.name)}</a>`).join('')}</aside>
   <article><h1>${e(skill.name)}</h1><p>${e(skill.description)}</p>${spatial ? '' : chips(skill)}
   <p><a href="${e(skill.source)}/SKILL.md">Read the skill ↗</a></p>${spatial ? examples : ''}
   <div class="steps">${(skill.steps||[]).map((step,i) => `<p><span class="mono">0${i+1}</span><br>${e(step)}</p>`).join('')}</div>
   <section class="section" id="ladder"></section>${spatial ? '' : examples}
   <section class="section"><h2>Build your own task.</h2>${install(skill)}</section>
   <p><a href="skill.html?id=${e(skills[(skills.indexOf(skill)+1)%skills.length].id)}">Next skill →</a></p></article></div>`;
 ladder(document.querySelector('#ladder'), built, skill.id);
 const filter = document.querySelector('#model-filter');
 function update() {
   const items = built.filter(item => filter.value === 'all' || models(item).includes(filter.value));
   document.querySelector('#authored').innerHTML = !items.length ? empty('No verified examples match this model.')
     : spatial ? skill.showcaseGroups.map(group => comparisonRow(group, items)).join('') : items.map(card).join('');
 }
 filter.onchange = update;
 update();
 if (spatial && location.hash === '#official-references') document.getElementById('official-references').scrollIntoView();
}

function comparisonRow(group, visible) {
 const items = group.cases.map(id => visible.find(item => item.id === id)).filter(Boolean);
 if (!items.length) return '';
 const viewed = items.flatMap(item => item.viewedReferenceIds);
 const sourceId = viewed.includes(group.representativeId) ? group.representativeId : viewed[0] || group.representativeId;
 const source = official.find(s => s.id === sourceId);
 const authored = items.map(item => `<article class="card paired-task" data-case="${e(item.id)}">
   <a class="comparison-image" href="${e(taskUrl(item))}" aria-label="Open ${e(item.title)}"><img loading="lazy" src="${e(item.thumbnail)}" alt=""></a>
   <h3><a href="${e(taskUrl(item))}">${e(item.title)}</a></h3>
   <div class="actions"><a href="${e(taskUrl(item))}">Open task ↗</a><a href="${e(processUrl(item))}">Build process</a></div>
 </article>`).join('');
 return `<div class="comparison-row" data-pattern="${e(group.pattern)}">
   <a class="official-example" data-reference="${e(source.id)}" href="${e(taskUrl(source))}">
     <span class="comparison-image"><img loading="lazy" src="${e(source.thumbnail)}" alt=""></span>
     <span class="subtype-name">${e(group.label)}</span>${viewed.length ? '' : '<small>Similar official example</small>'}
   </a><div class="paired-tasks">${authored}</div></div>`;
}
async function taskPage(){
 const c=allCases.find(x=>x.id===new URLSearchParams(location.search).get('id'));
 if(!c){main.innerHTML=empty('Task not found.');return;}
 const s=await fetch(c.taskArtifact).then(r=>{if(!r.ok)throw Error('Task unavailable');return r.json();});
 const skill=skills.find(x=>x.id===c.skillIds[0]);
 const buildProcess=processUrl(c);
 const title=c.title;
 const label=i=>s.options[i].label||String.fromCharCode(65+i);
 const method=s.provenance?.generationMethod||(['2d-rotation','3d-rotation'].includes(s.taskType)?'Legacy JavaScript/SVG generator':'Recorded construction');
 document.title=`${title} · ${h.name}`;
 main.innerHTML=`<nav class="task-crumb" aria-label="Task navigation">
  ${skill?`<a class="button" href="skill.html?id=${e(encodeURIComponent(skill.id))}">← Back to ${e(skill.name)} skill</a>`:''}
  ${c.supersededBy?`<a class="button" href="task.html?id=${e(encodeURIComponent(c.supersededBy))}">Open updated task</a>`:''}
  ${buildProcess?`<a class="button" href="${e(buildProcess)}">View build process</a>`:''}
 </nav>
 <header class="task-heading"><div><p class="task-eyebrow">Agent-built practice</p><h1>${e(title)}</h1></div><span class="task-format">Single choice · ${s.options.length} options</span></header>
 <div class="task-layout">
  <section class="task-question" aria-labelledby="question-heading"><h2 id="question-heading" class="task-eyebrow">The question</h2><p class="question-copy">${e(s.question)}</p>
   <figure class="task-figure"><button type="button" class="diagram-open" aria-label="Enlarge question diagram" aria-haspopup="dialog"><img src="${e(c.thumbnail)}" alt="Original figure and answer options for ${e(title)}"></button><figcaption><span>Compare the original with each option.</span><button type="button" class="diagram-enlarge" aria-haspopup="dialog">Enlarge diagram</button></figcaption></figure>
  </section>
  <form class="answer-panel" aria-labelledby="answer-heading"><h2 id="answer-heading">Your answer</h2><p id="answer-hint">Select an option to see if it is correct.</p>
   <fieldset class="options" aria-describedby="answer-hint"><legend class="visually-hidden">Answer choices</legend>${s.options.map((option,i)=>`<label class="answer-choice" data-answer="${i}"><input type="radio" name="answer" value="${i}" aria-label="Option ${e(label(i))}${option.type==='text'?`. ${e(option.text)}`:''}" required><span class="choice-letter" aria-hidden="true">${e(label(i))}</span><span class="choice-copy">${option.type==='text'?e(option.text):`Option ${e(label(i))}`}<span class="choice-state"></span></span></label>`).join('')}</fieldset>
   <p id="answer-status" class="visually-hidden" role="status" aria-live="polite" aria-atomic="true"></p><button class="retry-answer" type="button" hidden>Try again</button>
  </form>
 </div>
 <details id="answer" class="task-solution"><summary>Answer &amp; explanation</summary>${c.supersessionNote?`<p><strong>Correction</strong> · ${e(c.supersessionNote)}</p>`: ''}<p class="solution-verdict"><strong>Correct answer: ${e(label(s.answer.index))}.</strong> ${e(s.answer.explanation)}</p><div class="option-explanations">${(s.answer.options||[]).map(o=>`<p class="option-explanation ${o.label===label(s.answer.index)?'is-correct':''}"><strong>${e(o.label)}${o.label===label(s.answer.index)?' · Correct answer':''}</strong><span>${e(o.explanation)}</span></p>`).join('')}</div></details>
 <details class="task-provenance"><summary>Build details &amp; downloads</summary><p>${e(c.title)}</p><div class="actions"><a href="${e(c.verification.report)}">Verification summary</a><a href="${e(c.taskArtifact)}" download>Download exact task</a>${s.provenance?.native?.backend==='FreeCAD'?`<a href="${e(c.taskArtifact.replace(/task\.json$/,'assembly.FCStd'))}" download>Download FreeCAD model</a><a href="${e(c.taskArtifact.replace(/task\.json$/,'system.json'))}" download>Rebuild parameters</a>`:''}</div><p class="source-note">${e(method)}</p><p class="source-note">Immutable specification SHA-256: <code>${e(c.contentSha256)}</code></p></details>
 <dialog class="diagram-dialog" aria-labelledby="diagram-title"><div class="diagram-toolbar"><h2 id="diagram-title">Question diagram</h2><div><button type="button" class="diagram-zoom" aria-pressed="false">Zoom in</button><button type="button" class="diagram-close" autofocus>Close</button></div></div><div class="diagram-scroll" tabindex="0" aria-label="Question diagram; scroll to inspect when zoomed"><img src="${e(c.thumbnail)}" alt="Enlarged original figure and answer options"></div><p>Zoom in to inspect details. Scroll to move around the image.</p></dialog>`;
 const form=main.querySelector('form'),choices=[...form.querySelectorAll('[data-answer]')],retry=form.querySelector('.retry-answer'),status=main.querySelector('#answer-status'),solution=main.querySelector('#answer');
 form.addEventListener('submit',event=>event.preventDefault());
 form.addEventListener('change',()=>{
  const selected=form.querySelector('input:checked');if(!selected)return;
  const index=Number(selected.value),correct=index===s.answer.index;retry.hidden=false;
  status.textContent=correct?`Correct. Option ${label(index)}.`:`Incorrect. The correct answer is ${label(s.answer.index)}.`;
  choices.forEach((choice,i)=>{const right=i===s.answer.index,wrong=i===index&&!correct;choice.classList.toggle('is-correct',right);choice.classList.toggle('is-incorrect',wrong);choice.querySelector('.choice-state').textContent=right?'Correct answer':wrong?'Your answer · Incorrect':'';});
 });
 retry.addEventListener('click',()=>{
  form.reset();retry.hidden=true;status.textContent='';solution.open=false;
  choices.forEach(choice=>{choice.classList.remove('is-correct','is-incorrect');choice.querySelector('.choice-state').textContent='';});
  if(location.hash==='#answer')history.replaceState(null,'',location.pathname+location.search);
  choices[0].querySelector('input').focus({preventScroll:true});
 });
 const reveal=()=>{if(location.hash==='#answer'){solution.open=true;requestAnimationFrame(()=>solution.scrollIntoView({block:'nearest'}));}};
 window.addEventListener('hashchange',reveal);reveal();
 const dialog=main.querySelector('dialog'),zoom=dialog.querySelector('.diagram-zoom'),scroll=dialog.querySelector('.diagram-scroll');
 main.querySelectorAll('.diagram-open,.diagram-enlarge').forEach(button=>button.addEventListener('click',()=>dialog.showModal()));
 dialog.querySelector('.diagram-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 zoom.addEventListener('click',()=>{const enlarged=scroll.classList.toggle('is-zoomed');zoom.setAttribute('aria-pressed',String(enlarged));zoom.textContent=enlarged?'Fit diagram':'Zoom in';});
 dialog.addEventListener('close',()=>{scroll.classList.remove('is-zoomed');zoom.setAttribute('aria-pressed','false');zoom.textContent='Zoom in';});
}
async function processPage(){
 const c=allCases.find(x=>x.id===new URLSearchParams(location.search).get('id'));
 if(!c){main.innerHTML=empty('Build process not found.');return;}
 const p=await fetch(c.process).then(r=>{if(!r.ok)throw Error('Process record unavailable');return r.json();});
 main.classList.add('process-page');
 main.innerHTML=`<p class="crumb"><a href="index.html">${e(h.name)}</a> / <a href="skill.html?id=${e(c.skillIds[0])}">Skill</a> / Build process</p><header class="process-intro"><div><h1>From a skill to a task.</h1><p>${e(c.title)}</p></div><div class="process-actions"><a class="button primary" href="${e(taskUrl(c))}">Open final task ↗</a><a class="text-link" href="${e(c.process)}" download>Evidence JSON ↓</a><a class="text-link" href="${e(c.eventsCsv)}" download>Events CSV ↓</a></div></header><div id="process"></div>`;
 await renderProcess(document.querySelector('#process'),p,{json:c.process,csv:c.eventsCsv});
}
try{if(mode==='home')home();else if(mode==='skill')skillPage();else if(mode==='task')await taskPage();else if(mode==='process')await processPage();}catch(error){main.innerHTML=`<p role="alert">${e(error.message)}. <a href="index.html">Return to the exhibition</a>.</p>`;}
document.addEventListener('click',async event=>{const b=event.target.closest('[data-copy]');if(b){try{await navigator.clipboard.writeText(b.dataset.copy);document.querySelector('#notice').textContent='Installation command copied';}catch{document.querySelector('#notice').textContent='Select and copy the command above.';}setTimeout(()=>document.querySelector('#notice').textContent='',2500);}});
