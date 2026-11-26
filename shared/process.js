import {eventLabel, eventSummary, eventStatus, versionResult, timelineEvents} from './process-model.js';
export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const e=escapeHtml;
const number=value=>Number.isFinite(value)?value.toLocaleString():'Not recorded';
const pretty=value=>e(JSON.stringify(value,null,2));
const paragraph=(title,value)=>value==null?'':`<section class="explanation-part"><h3>${e(title)}</h3><p>${e(typeof value==='string'?value:JSON.stringify(value,null,2))}</p></section>`;
export function usageOverview(u){
 if(!u)return '<section class="build-usage"><p class="muted">Model usage was not recorded.</p></section>';
 const tokens=u.observedTokens||{},metric=(name,value)=>`<div class="usage-metric"><dt>${e(name)}</dt><dd>${e(value)}</dd></div>`;
 return `<section class="build-usage" aria-label="Recorded model usage and build time"><div class="usage-heading"><h2>Recorded build usage</h2><span class="usage-status">${e(u.status||'Unavailable')}</span></div><dl class="usage-metrics">${metric('Model / reasoning',(u.models||[]).map(m=>`${m.model||'Unknown'} / ${m.reasoningEffort||'Not recorded'}`).join(', ')||'Not recorded')}${metric('Observed time',u.elapsedMs==null?'Not recorded':(u.elapsedMs/60000).toFixed(1)+' min')}${metric('Total tokens',number(tokens.total_tokens))}${metric('Input tokens',number(tokens.input_tokens))}${metric('Output tokens',number(tokens.output_tokens))}</dl><details class="usage-details"><summary>Measurement scope and token breakdown</summary><p>${e(u.scope||'Only recorded intervals are included; this is not complete billed usage.')}</p><pre>${pretty(u)}</pre></details></section>`;
}
export async function renderProcess(target,p,links={}){
 target._dispose?.();
 const {createOrbitTimeline}=await import('../maze-harness/process-orbit.js');
 const events=p.events||[],candidates=p.candidates||[],manifest=p.manifest||{},byId=new Map(events.map(event=>[event.id,event]));
 const count=type=>events.filter(event=>event.type===type).length;
 const initial=byId.get(new URLSearchParams(location.search).get('node'))||events.find(event=>event.type==='candidate.saved'&&event.candidateId===manifest.finalCandidateId)||events[0];
 let selectedId=initial?.id,page=0,orbit;
 target.classList.add('shared-process');
 target.innerHTML=`<div class="process-record-line"><span class="record-mode">SAVED RECORD</span><span>${events.length} records · ${candidates.length} saved versions · ${e(manifest.status||'Status unknown')}</span></div>${usageOverview(p.usage)}
 <details class="action-overview"><summary>Recorded activity breakdown</summary><dl class="action-stats">${[['Reference reads',count('resource.read')],['Saved versions',candidates.length],['Verification reports',count('test.completed')],['Visual reviews',count('visual.review')],['Command starts',count('command.started')],['Design notes',count('design.note')]].map(([name,value])=>`<div class="action-stat"><dt>${name}</dt><dd>${value}</dd></div>`).join('')}</dl><p class="projection-note">Counts describe saved evidence. A command start, command completion and test report are separate records. Missing activity remains unknown.</p></details>
 <div class="process-workspace"><aside class="timeline-column" aria-label="Recorded production timeline"><nav class="process-view-tabs" aria-label="Process view">${[['actions','Build timeline'],['versions',`Versions (${candidates.length})`],['evidence',`Evidence (${events.length})`]].map(([key,name])=>`<button type="button" data-view="${key}" aria-controls="process-${key}" aria-pressed="${key==='actions'}">${e(name)}</button>`).join('')}</nav>
 <section id="process-actions" class="process-timeline"></section>
 <section id="process-versions" class="process-browser" hidden><h2>Saved versions</h2><p class="projection-note">Every saved candidate is retained, including failed versions. Select a version to inspect its exact preview and checks.</p><div class="version-grid">${candidates.map(c=>`<button type="button" class="version-option" data-version="${e(c.id)}" aria-pressed="false">${c.preview?`<img src="${e(c.preview.path)}" alt="Saved version ${e(c.id)}" loading="lazy">`:''}<strong>${e(c.id)}${c.id===manifest.finalCandidateId?(manifest.status==='accepted'?' · accepted':' · final'):''}</strong><span>Verification: ${e(versionResult(p,c))}</span><small>${c.preview?'Select to inspect':'Preview unavailable'}</small></button>`).join('')}</div></section>
 <section id="process-evidence" class="process-browser" hidden><h2>Evidence records</h2><p class="projection-note">Search the original public records. Selecting a record shows its details without changing saved evidence.</p><div class="evidence-search"><input type="search" aria-label="Search evidence" placeholder="Search file, event or version"><select aria-label="Evidence type"><option value="all">All evidence</option>${[...new Set(events.map(x=>x.type))].map(type=>`<option value="${e(type)}">${e(eventLabel(type))}</option>`).join('')}</select></div><p class="evidence-count" role="status"></p><div class="evidence-results"></div><nav class="evidence-pagination" aria-label="Evidence pages"><button type="button" data-page-step="-1">Previous</button><button type="button" data-page-step="1">Next</button></nav></section></aside>
 <article id="operation-detail" class="operation-detail" tabindex="-1" aria-label="Selected operation"></article></div>
 <details class="process-coverage"><summary>Record coverage and limits</summary><ul>${[...(manifest.limitations||[]),...(manifest.captureGaps||[])].map(x=>`<li>${e(typeof x==='string'?x:JSON.stringify(x))}</li>`).join('')}</ul><p>The timeline follows saved record order. Design notes are author annotations, not a model's internal thought transcript. Version-associated checks and previews may have been recorded later than the selected event.</p></details>
 <dialog class="preview-modal" aria-labelledby="preview-title"><header class="preview-modal-toolbar"><h2 id="preview-title">Version preview</h2><button type="button" data-close-preview>Close ×</button></header><div class="image-preview-host"><img alt=""></div></dialog>`;
 const detail=target.querySelector('.operation-detail'),modal=target.querySelector('dialog'),search=target.querySelector('input[type=search]'),typeFilter=target.querySelector('[aria-label="Evidence type"]');
 const searchable=events.map(event=>({event,text:JSON.stringify(event).toLowerCase()}));
 function showView(key){for(const button of target.querySelectorAll('[data-view]'))button.setAttribute('aria-pressed',String(button.dataset.view===key));for(const name of ['actions','versions','evidence'])target.querySelector('#process-'+name).hidden=name!==key;}
 function select(id){
  const event=byId.get(id);if(!event)return;
  selectedId=id;orbit?.select(id);
  const url=new URL(location.href);url.searchParams.set('node',id);history.replaceState(null,'',url);
  target.querySelectorAll('[data-event]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.event===id)));
  target.querySelectorAll('[data-version]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.version===event.candidateId)));
  const c=candidates.find(c=>c.id===event.candidateId),d=event.details||{},status=eventStatus(event),index=events.indexOf(event);
  const tests=c?(p.tests||[]).filter(t=>t.candidateId===c.id&&t.testedFingerprints?.specification===c.sha256):[];
  const selectedTests=event.type==='test.completed'?[d]:tests;
  const fields=event.type==='design.note'?[['Goal',d.goal],['Change',d.change],['Reason',d.reason],['Expected checks',d.expectedChecks]]:event.type==='resource.read'?[['Resource',d.label],['Delivery',d.outcome]]:event.type==='visual.review'?[['Visual review',d.review]]:[];
  const related=event.actionId?events.filter(x=>x.id!==id&&x.actionId===event.actionId):[];
  detail.dataset.eventId=id;
  detail.innerHTML=`<div class="operation-heading-line"><div class="operation-meta">${e(id)} · ${e(event.origin||'Origin unknown')}${status?` · <span class="status-${e(status)}">${e(event.type==='command.completed'?'Process '+status:status)}</span>`:''}</div><nav class="operation-navigation" aria-label="Adjacent recorded operations"><button type="button" data-step="-1" aria-label="Previous operation" ${index===0?'disabled':''}>←</button><button type="button" data-step="1" aria-label="Next operation" ${index===events.length-1?'disabled':''}>→</button></nav></div>
  <h2 id="operation-title">${e(eventLabel(event.type))}</h2><p class="operation-summary">${e(eventSummary(event))}</p><p class="projection-note">${e(event.at||'Occurrence time unknown')} · ${e(event.candidateId||'Run-level record')}</p>
  ${c?`<section class="preview-shell">${c.preview?`<img class="preview-image" src="${e(c.preview.path)}" alt="Exact ${e(c.id)} candidate preview"><button type="button" class="expand-preview" data-expand="${e(c.id)}">Expand version ${e(c.id)} ↗</button>`:`<p class="preview-placeholder">${e(c.previewUnavailable||'Version preview unavailable')}</p>`}</section>`:''}
  ${fields.map(([name,value])=>paragraph(name,value)).join('')}
  ${selectedTests.length?`<section class="operation-checks"><h3>${event.type==='test.completed'?'Checks in this report':'Checks associated with this version'}</h3>${selectedTests.map(t=>`<p class="check-scope"><strong>${e(t.verdict||'unknown')}</strong> · ${e(t.scope||'Scope not recorded')}</p><ul class="process-checks">${(t.checks||[]).map(check=>`<li><span class="status-${e(check.verdict||check.status||'unknown')}">${e(check.verdict||check.status||'unknown')}</span><div class="check-body">${e(check.name)}${check.detail?`<details><summary>Check evidence</summary><pre>${e(typeof check.detail==='string'?check.detail:JSON.stringify(check.detail,null,2))}</pre></details>`:''}</div></li>`).join('')}</ul>`).join('')}</section>`:''}
  ${related.length?`<section class="operation-relations"><h3>Records with the same saved action ID</h3><div class="relation-chips">${related.map(x=>`<button class="relation-chip" type="button" data-event="${e(x.id)}">${e(x.id)} · ${e(eventLabel(x.type))}</button>`).join('')}</div></section>`:''}
  <details class="operation-evidence"><summary>Original record and fingerprints</summary><pre>${pretty(event)}</pre>${c?`<h3>Version ${e(c.id)}</h3><pre>${pretty(c)}</pre>`:''}</details>`;
  detail.scrollTop=0;
 }
 function evidence(){
  const query=search.value.trim().toLowerCase(),kind=typeFilter.value;
  const rows=searchable.filter(x=>(!query||x.text.includes(query))&&(kind==='all'||x.event.type===kind)).map(x=>x.event);
  page=Math.min(page,Math.max(0,Math.ceil(rows.length/30)-1));const start=page*30;
  target.querySelector('.evidence-count').textContent=`${rows.length} records${rows.length?` · ${start+1}–${Math.min(start+30,rows.length)}`:''}`;
  target.querySelector('.evidence-results').innerHTML=rows.slice(start,start+30).map(x=>`<button type="button" class="evidence-option" data-event="${e(x.id)}" aria-current="${x.id===selectedId}">${e(eventLabel(x.type))}<small>${e(x.id)} · ${e(x.candidateId||'run')} · ${e(x.at||'Unknown time')}</small></button>`).join('')||'<p class="process-empty">No matching evidence.</p>';
  target.querySelector('[data-page-step="-1"]').disabled=page===0;target.querySelector('[data-page-step="1"]').disabled=start+30>=rows.length;
 }
 const nodes=timelineEvents(p);
 orbit=createOrbitTimeline({container:target.querySelector('#process-actions'),getData:()=>({events:nodes,selectedId}),onSelect:select,onDetails:()=>{detail.scrollIntoView({block:'start',behavior:'instant'});detail.focus({preventScroll:true});}});
 const mode=target.querySelector('#orbit-mode');mode.options[0].textContent=`Key events (${nodes.filter(n=>n.isKey).length})`;mode.options[1].textContent=`All records (${nodes.length})`;
 target.onclick=event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.view)showView(button.dataset.view);
  if(button.dataset.version){const record=events.find(x=>x.type==='candidate.saved'&&x.candidateId===button.dataset.version);if(record)select(record.id);}
  if(button.dataset.event)select(button.dataset.event);
  if(button.dataset.step)select(events[events.findIndex(x=>x.id===selectedId)+Number(button.dataset.step)]?.id);
  if(button.dataset.pageStep){page+=Number(button.dataset.pageStep);evidence();}
  if(button.dataset.expand){const c=candidates.find(c=>c.id===button.dataset.expand);if(c?.preview){modal.querySelector('img').src=c.preview.path;modal.querySelector('img').alt=`Exact ${c.id} candidate preview`;modal.querySelector('h2').textContent=`Version ${c.id}`;modal.showModal();}}
  if(button.hasAttribute('data-close-preview'))modal.close();
 };
 search.oninput=typeFilter.onchange=()=>{page=0;evidence();};
 target._dispose=()=>{orbit.destroy?.();if(modal.open)modal.close();};
 evidence();if(selectedId)select(selectedId);
}
