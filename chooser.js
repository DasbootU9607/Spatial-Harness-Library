const picker = document.querySelector('.picker');
const trigger = picker.querySelector('summary');
const label = document.querySelector('#picked');
const enter = document.querySelector('#enter');
const comma = document.querySelector('#comma');
const completion = document.querySelector('.completion');
const options = [...picker.querySelectorAll('nav a')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let current = -1;

function preview(index, direction = index < current ? -1 : 1) {
  if (current === index) return;
  current = index;
  const option = options[index];
  const name = option.textContent;
  label.textContent = name;
  trigger.setAttribute('aria-label', name + ' selected. Choose a harness');
  enter.href = option.href;
  enter.setAttribute('aria-label', 'Open ' + name + ' Harness');
  comma.hidden = false;
  const source = document.createElement('a');
  source.href = option.dataset.url;
  source.textContent = option.dataset.source;
  completion.replaceChildren(option.dataset.description + ' ', source, '.');
  for (const item of options) {
    const active = item === option;
    item.classList.toggle('current', active);
    document.getElementById(item.dataset.scene).classList.toggle('active', active);
  }
  if (!reducedMotion.matches) {
    label.getAnimations().forEach(animation => animation.cancel());
    label.animate([{transform: 'translateY(' + direction * 65 + '%)', opacity: 0},
                   {transform: 'translateY(0)', opacity: 1}], {duration: 170, easing: 'ease-out'});
  }
}

function step(direction) {
  const origin = current === -1 && direction < 0 ? 0 : current;
  preview((origin + direction + options.length) % options.length, direction);
}

options.forEach((option, index) => {
  option.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'touch') preview(index);
  });
  option.addEventListener('focus', () => preview(index));
});

picker.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    step(event.key === 'ArrowDown' ? 1 : -1);
    if (picker.open) options[current].focus({preventScroll: true});
  }
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
for (const type of ['click', 'focusin']) {
  document.addEventListener(type, event => {
    if (!picker.contains(event.target)) picker.open = false;
  });
}
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && picker.open) {
    picker.open = false;
    trigger.focus();
  }
});
