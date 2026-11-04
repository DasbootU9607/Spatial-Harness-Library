const e=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const data=await fetch('../shared/catalog.json',{cache:'no-cache'}).then(r=>r.json());
function update(){const route=location.hash.slice(2).split('?')[0],h=data.harnesses.find(h=>h.sourceRoute===route);if(!h)return;
 const root='../'+h.id+'/';const header=document.querySelector('.sitehead');if(header)header.innerHTML=`<div class="wrap head"><a class="brand" href="${root}">${e(h.name)}</a><nav aria-label="Main navigation"><a href="${root}#skills">Skills</a><a href="${e(h.browser)}">${e(h.browserLabel)}</a><a href="${root+h.playground}">Playground</a><a href="https://github.com/DasbootU9607/Spatial-Harness-Library">GitHub ↗</a></nav></div>`;
 const footer=document.querySelector('footer');if(footer)footer.innerHTML=`<div class="footer-inner"><a href="${e(h.source)}">${e(h.benchmark)} ↗</a><a href="../">Harness library</a><a href="sources.html">Sources and licenses</a><a href="https://github.com/DasbootU9607/Spatial-Harness-Library">GitHub ↗</a></div>`;
}
window.addEventListener('hashchange',update);update();
