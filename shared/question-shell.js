const e=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Retain the standalone collection navigation if this optional request is interrupted.
const data=await fetch('../shared/catalog.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).catch(()=>null);
function update(){if(!Array.isArray(data?.harnesses))return;const route=location.hash.slice(2).split('?')[0],h=data.harnesses.find(h=>h.sourceRoute===route);if(!h)return;
 const root='../'+h.id+'/';const header=document.querySelector('.sitehead');if(header)header.innerHTML=`<div class="wrap head"><a class="brand" href="${root}">${e(h.name)}</a><nav aria-label="Main navigation"><a href="../">Library home</a><a href="${root}#skills">Skills</a><a href="${e(h.browser)}">${e(h.browserLabel)}</a><a href="${root+h.playground}">Playground</a><a class="benchmark-link" href="${e(h.benchmarkUrl||h.source)}">${e(h.benchmark)} ↗</a><a href="https://github.com/DasbootU9607/Spatial-Harness-Library/tree/main/${e(h.id)}">GitHub ↗</a></nav></div>`;
 const footer=document.querySelector('footer');if(footer)footer.innerHTML=`<div class="footer-inner"><a href="${e(h.source)}">${e(h.benchmark)} ↗</a><a href="../">Harness library</a><a href="sources.html">Sources and licenses</a><a href="https://github.com/DasbootU9607/Spatial-Harness-Library/tree/main/${e(h.id)}">GitHub ↗</a></div>`;
}
window.addEventListener('hashchange',update);update();
