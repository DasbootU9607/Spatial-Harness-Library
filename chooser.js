const picker = document.querySelector('.picker');
const enter = document.querySelector('#enter');
const comma = document.querySelector('#comma');
const completion = document.querySelector('.completion');
const options = [...picker.querySelectorAll('[role="option"]')];
const scenes = [...document.querySelectorAll('.scenes img')];
let current = 0;

function preview(index) {
  const next = Math.max(0, Math.min(options.length - 1, index));
  if (next === current) return;
  options[current].setAttribute('aria-selected', 'false');
  current = next;
  const option = options[current];
  option.setAttribute('aria-selected', 'true');
  picker.setAttribute('aria-activedescendant', option.id);
  picker.closest('.sentence').style.setProperty('--index', current);
  for (const scene of scenes) scene.classList.toggle('active', scene.id === option.dataset.scene);

  const {path, description, source, url} = option.dataset;
  comma.hidden = !path;
  if (!path) {
    enter.removeAttribute('href');
    enter.removeAttribute('aria-label');
    completion.replaceChildren();
    return;
  }

  enter.href = path;
  enter.setAttribute('aria-label', 'Open ' + option.textContent + ' Harness');
  const link = document.createElement('a');
  link.href = url;
  link.textContent = source;
  completion.replaceChildren(description + ' ', link, '.');
}

function step(direction) { preview(current + direction); }

picker.addEventListener('keydown', event => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  switch (event.key) {
    case 'ArrowDown': step(1); break;
    case 'ArrowUp': step(-1); break;
    case 'Home': preview(0); break;
    case 'End': preview(options.length - 1); break;
    case 'Enter': if (enter.hasAttribute('href')) enter.click(); break;
    default: return;
  }
  event.preventDefault();
});

picker.addEventListener('click', event => {
  const option = event.target.closest('[role="option"]');
  if (!option) return;
  if (option === options[current] && option.dataset.path) enter.click();
  else preview(options.indexOf(option));
});

// Accumulate precision-trackpad deltas; one small movement should yield one name.
let accumulated = 0, lastStep = -Infinity, lastWheel = -Infinity;
picker.addEventListener('wheel', event => {
  if (event.ctrlKey || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
  event.preventDefault();
  const now = performance.now();
  const delta = event.deltaY * [1, 16, window.innerHeight][event.deltaMode];
  if (now - lastWheel > 180 || Math.sign(delta) !== Math.sign(accumulated)) accumulated = 0;
  lastWheel = now;
  if (now - lastStep < 160) return;
  accumulated += delta;
  if (Math.abs(accumulated) >= 22) {
    step(Math.sign(accumulated));
    accumulated = 0;
    lastStep = now;
  }
}, {passive: false});

// Consume a vertical swipe on the field before the browser starts a page fling.
let swipeStart = null;
picker.addEventListener('touchstart', event => {
  swipeStart = event.touches.length === 1 ? event.touches[0] : null;
}, {passive: true});
picker.addEventListener('touchmove', event => {
  if (!swipeStart || event.touches.length !== 1) return;
  const point = event.touches[0];
  const distance = swipeStart.clientY - point.clientY;
  if (Math.abs(distance) < 5 || Math.abs(distance) < Math.abs(swipeStart.clientX - point.clientX)) return;
  if (event.cancelable) event.preventDefault();
  if (Math.abs(distance) >= 32) {
    step(Math.sign(distance));
    swipeStart = point;
  }
}, {passive: false});
for (const type of ['touchend', 'touchcancel']) {
  picker.addEventListener(type, () => { swipeStart = null; }, {passive: true});
}
