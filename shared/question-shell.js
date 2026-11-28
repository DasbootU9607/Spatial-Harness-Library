function mountQuestionShell(entries) {
  const escape = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const header = document.querySelector('.sitehead');
  const footer = document.querySelector('footer');
  function update() {
    const route = location.hash.slice(1).replace(/^\//, '').split('?')[0];
    const h = entries.find(entry => entry.route === route) || entries.find(entry => entry.route === 'spatialviz');
    const root = '../' + h.id + '/';
    const github = 'https://github.com/DasbootU9607/Spatial-Harness-Library/tree/main/' + h.id;
    document.body.classList.toggle('archive-page', h.route !== 'spatialbench');
    header.innerHTML = `<div class="wrap head"><a class="brand" href="${escape(root)}">${escape(h.name)}</a>
      <nav aria-label="Main navigation"><a href="../">Library home</a><a href="${escape(root)}#skills">Skills</a>
      <a href="${escape(h.browser)}">${escape(h.browserLabel)}</a><a href="${escape(root + h.playground)}">Playground</a>
      <a class="benchmark-link" href="${escape(h.benchmarkUrl)}">${escape(h.benchmark)} ↗</a><a href="${escape(github)}">GitHub ↗</a></nav></div>`;
    footer.innerHTML = `<div class="footer-inner"><a href="${escape(h.source)}">${escape(h.benchmark)} ↗</a><a href="../">Harness library</a>
      <a href="sources.html">Sources and licenses</a><a href="${escape(github)}">GitHub ↗</a></div>`;
    document.getElementById('entry-status').textContent = h.route === 'spatialbench' ? 'Loading practice…' : 'Loading questions…';
  }
  update();
  window.addEventListener('hashchange', update);
}
