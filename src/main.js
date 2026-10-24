import { gsap } from 'gsap';
import books from './books.json';
import { Book, STAGE } from './Book.js';
import { hoverTimeline, pullOutTimeline, flipThroughTimeline, returnTimeline } from './animations.js';

/* ---------- DOM ---------- */

const stage = document.getElementById('stage');
const shelf = document.getElementById('shelf');
const env = {
  dim: document.getElementById('dim'),
  bgSharp: document.getElementById('bgSharp'),
  hint: document.getElementById('hint'),
};

/* ---------- Shelf layout (stage px; the compartment in the background image) ---------- */

const SHELF = { left: 300, right: 1140, baseline: 712, gap: 3 };

const items = books.map((data) => new Book(data));
{
  const total = items.reduce((s, b) => s + b.d, 0) + SHELF.gap * (items.length - 1);
  let x = SHELF.left + (SHELF.right - SHELF.left - total) / 2;
  for (const book of items) {
    book.setSlot(Math.round(x), SHELF.baseline - book.h);
    shelf.appendChild(book.el);
    x += book.d + SHELF.gap;
  }
}

/* Recolour each book from its own cover (canvas sampling). */
items.forEach((book) => book.sampleColor());

/* Fit the back-cover blurbs once the Georgian web font has loaded. */
const fitBlurbs = () => items.forEach((book) => book.fitBackText());
fitBlurbs();
document.fonts?.ready.then(fitBlurbs);

/* ---------- Responsive stage ---------- */

function layoutStage() {
  const s = Math.min(window.innerWidth / STAGE.w, window.innerHeight / STAGE.h);
  stage.style.setProperty('--s', s.toFixed(4));
}
layoutStage();
window.addEventListener('resize', layoutStage);

/* ---------- Interaction state machine ---------- */

const state = {
  phase: 'idle', // idle | front | back
  active: null,
  busy: false,
};
const hovers = new Map();
const hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Block input while a timeline plays; run `onDone` when it finishes. */
function lock(tl, onDone) {
  state.busy = true;
  document.body.classList.add('is-locked');
  tl.eventCallback('onComplete', () => {
    state.busy = false;
    document.body.classList.remove('is-locked');
    onDone?.();
  });
  return tl;
}

function getHover(book) {
  if (!hovers.has(book)) hovers.set(book, hoverTimeline(book));
  return hovers.get(book);
}

function onEnter(book) {
  if (state.phase !== 'idle' || state.busy) return;
  book.el.classList.add('is-hover');
  getHover(book).play();
}

function onLeave(book) {
  const tl = hovers.get(book);
  if (!tl) return;
  tl.eventCallback('onReverseComplete', () => book.el.classList.remove('is-hover'));
  tl.reverse();
}

function activate(book) {
  // the hover timeline must not fight the flight
  const h = hovers.get(book);
  if (h) {
    h.kill();
    hovers.delete(book);
  }
  book.el.classList.remove('is-hover');
  book.el.classList.add('is-active');
  env.dim.classList.add('is-on');
  state.active = book;
  lock(pullOutTimeline(book, env), () => {
    state.phase = 'front';
  });
}

function flip(book) {
  lock(flipThroughTimeline(book), () => {
    state.phase = 'back';
  });
}

function close() {
  const book = state.active;
  if (!book || state.busy) return;
  env.dim.classList.remove('is-on');
  lock(returnTimeline(book, env), () => {
    book.el.classList.remove('is-active');
    state.active = null;
    state.phase = 'idle';
  });
}

function onBookClick(book) {
  if (state.busy) return;
  if (state.phase === 'idle') return activate(book); // on touch: first tap = hover + pull
  if (book !== state.active) return;
  if (state.phase === 'front') return flip(book);
  if (state.phase === 'back') return close();
}

/* ---------- Events ---------- */

for (const book of items) {
  book.el.addEventListener('click', () => onBookClick(book));
  if (hoverCapable) {
    book.el.addEventListener('pointerenter', (e) => e.pointerType !== 'touch' && onEnter(book));
    book.el.addEventListener('pointerleave', (e) => e.pointerType !== 'touch' && onLeave(book));
  }
}

env.dim.addEventListener('click', () => {
  if (state.phase === 'front' || state.phase === 'back') close();
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && (state.phase === 'front' || state.phase === 'back')) close();
});

gsap.set(env.dim, { autoAlpha: 0 });
