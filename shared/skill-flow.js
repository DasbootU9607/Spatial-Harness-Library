export function mountSkillFlow(root, skills, escape) {
  const e = escape;
  const categories = ['MentalRotation', 'MentalFolding', 'VisualPenetration', 'MentalAnimation'];
  const groups = categories.map(category => {
    const name = category.replace(/([a-z])([A-Z])/g, '$1 $2');
    const members = skills.filter(skill => skill.officialCategory === category);
    const heading = 'flow-category-' + category;
    return '<div role="group" aria-labelledby="' + heading + '"><h4 id="' + heading + '">' + e(name) + '</h4>' + members.map(skill =>
      '<label><input type="radio" name="flow-skill" value="' + e(skill.id) + '"><span>' + e(skill.name) + '</span></label>').join('') + '</div>';
  });
  root.innerHTML = '<h2 id="flow-heading">How to use a skill</h2>' +
    '<h3 id="flow-pick-heading">Choose a skill</h3><div class="flow-categories" role="radiogroup" aria-labelledby="flow-pick-heading">' + groups.join('') + '</div>' +
    '<div class="flow-invoke"><strong>Invoke this skill</strong><code id="flow-name"></code>' +
    '<button type="button" id="flow-copy-name">Copy name</button><a id="flow-details">Skill details</a></div>' +
    '<h3>Choose a pattern</h3><div class="flow-paths">' +
      '<div><h4>Already specified</h4><p>Include the pattern in your request to skip the question.</p><label>Use a named pattern<select id="flow-explicit"></select></label></div>' +
      '<div><h4>Skill name only</h4><p>The agent asks which pattern you want.</p><div id="flow-menu" aria-label="Available patterns" role="group"></div></div>' +
      '<div><h4>Random</h4><p>Draw from the patterns that fit your request.</p><button id="flow-random">Pick a random pattern</button><details id="flow-pool"><summary>Eligible patterns</summary><div></div></details></div></div>' +
    '<p class="flow-selected" role="status" id="flow-selection"></p>' +
    '<div class="flow-finish"><div><h3>Optional requirements</h3><fieldset class="flow-mode"><legend>What should the agent use?</legend>' +
      '<label><input type="radio" name="flow-mode" value="defaults" checked>Use defaults</label>' +
      '<label><input type="radio" name="flow-mode" value="custom">Add requirements</label></fieldset>' +
      '<label id="flow-extra-wrap" hidden>What should the solver infer?<textarea id="flow-extra" rows="2"></textarea></label>' +
      '<label for="flow-request">Request to paste into your agent</label><textarea id="flow-request" rows="2"></textarea>' +
      '<button id="flow-copy-request">Copy request</button><span id="flow-feedback" role="status"></span></div>' +
    '<div class="flow-result"><h3>Build and verify</h3><p>Your agent designs a new question, renders it and checks the answer and the final image.</p>' +
      '<p class="flow-caption">Published example for this pattern</p><a id="flow-question">View question</a><a id="flow-process">View build process</a></div></div>';
  const el = id => root.querySelector('#flow-' + id);
  const picker = root.querySelector('.flow-categories');
  const menu = el('menu'), explicit = el('explicit'), pool = el('pool').querySelector('div');
  const extra = el('extra'), request = el('request');
  let skill, group;
  const drafts = new Map();

  function commandPrefix() {
    return '$' + skill.packageName + ' — Create a question using the “' + group.choiceLabel + '” pattern.';
  }
  function compose() {
    request.value = commandPrefix() + (el('extra-wrap').hidden || !extra.value.trim() ? '' : ' ' + extra.value.trim());
  }
  function choose(id, branch) {
    group = skill.showcaseGroups.find(g => g.pattern === id);
    explicit.value = id;
    const selected = menu.querySelector('[aria-pressed="true"]');
    if (selected) selected.setAttribute('aria-pressed', 'false');
    menu.querySelector('[value="' + CSS.escape(id) + '"]').setAttribute('aria-pressed', 'true');
    const example = group.exampleRequirement;
    extra.placeholder = example;
    const draft = drafts.get(skill.id + '/' + group.pattern);
    extra.value = draft?.requirement ?? example;
    el('selection').textContent = (branch === 'random' ? 'Random selection' : branch === 'menu' ? 'Chosen from the menu' : 'Specified in the request') + ' → ' + group.choiceLabel;
    const query = '?id=' + encodeURIComponent(group.cases[0]);
    el('question').href = 'task.html' + query;
    el('process').href = 'process.html' + query;
    compose();
    if (draft?.request) request.value = draft.request;
    el('feedback').textContent = '';
  }
  function changeSkill(id) {
    skill = skills.find(s => s.id === id);
    const details = el('details');
    details.href = 'skill.html?id=' + encodeURIComponent(id);
    details.setAttribute('aria-label', 'Skill details for ' + skill.name);
    const choices = skill.showcaseGroups;
    el('name').textContent = '$' + skill.packageName;
    explicit.innerHTML = choices.map(g => '<option value="' + e(g.pattern) + '">' + e(g.choiceLabel) + '</option>').join('');
    menu.innerHTML = choices.map(g => '<button value="' + e(g.pattern) + '" aria-pressed="false">' + e(g.choiceLabel) + '</button>').join('');
    pool.innerHTML = choices.map(g => '<label><input type="checkbox" value="' + e(g.pattern) + '" checked>' + e(g.choiceLabel) + '</label>').join('');
    el('random').disabled = false;
    el('pool').open = false;
    choose((choices.find(g => g.pattern === 'patterned') || choices[0]).pattern, 'explicit');
  }
  function draft() {
    const key = skill.id + '/' + group.pattern;
    if (!drafts.has(key)) drafts.set(key, {});
    return drafts.get(key);
  }
  picker.onchange = event => changeSkill(event.target.value);
  explicit.onchange = () => choose(explicit.value, 'explicit');
  menu.onclick = event => {
    const button = event.target.closest('button');
    if (button) choose(button.value, 'menu');
  };
  pool.onchange = () => { el('random').disabled = !pool.querySelector(':checked'); };
  el('random').onclick = () => {
    const eligible = [...pool.querySelectorAll(':checked')];
    if (eligible.length) choose(eligible[Math.floor(Math.random() * eligible.length)].value, 'random');
  };
  root.querySelector('.flow-mode').onchange = event => {
    const enabled = event.target.value === 'custom';
    el('extra-wrap').hidden = !enabled;
    if (!draft().request) compose();
    if (enabled) extra.focus();
  };
  extra.oninput = () => { draft().requirement = extra.value; delete draft().request; compose(); };
  request.oninput = () => { draft().request = request.value; };
  async function copy(value, field) {
    try {
      await navigator.clipboard.writeText(value);
      el('feedback').textContent = 'Copied to clipboard.';
    } catch {
      const selection = window.getSelection();
      if (field.select) { field.focus(); field.select(); }
      else { const range = document.createRange(); range.selectNodeContents(field); selection.removeAllRanges(); selection.addRange(range); }
      el('feedback').textContent = 'Text selected. Use your device’s copy command.';
    }
  }
  el('copy-name').onclick = () => copy(el('name').textContent, el('name'));
  el('copy-request').onclick = () => copy(request.value, request);
  const initial = picker.querySelector('input[value="2d-rotation"]');
  initial.checked = true;
  changeSkill(initial.value);
  if (location.hash === '#how-to-use') root.scrollIntoView();
}
