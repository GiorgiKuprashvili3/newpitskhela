import { gsap } from 'gsap';
import { dominantColor } from './color.js';

export const PAGE_COUNT = 10;

/** Stage geometry shared with main.js / animations.js (stage px, 1440×900). */
export const STAGE = { w: 1440, h: 900, cx: 720, cy: 450 };

const el = (tag, className, html) => {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (html !== undefined) n.innerHTML = html;
  return n;
};

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * A real 3D CSS book: front cover (hinged), back cover, spine, fore-edge,
 * top/bottom page edges, inside covers and a stack of blank pages.
 */
export class Book {
  constructor(data) {
    this.data = data;
    this.h = data.height;
    this.d = data.depth;
    this.w = Math.round(data.height * 0.62);
    this.slot = { x: 0, y: 0 };

    this.el = el('div', 'book');
    this.el.dataset.id = data.id;
    this.el.style.setProperty('--w', `${this.w}px`);
    this.el.style.setProperty('--h', `${this.h}px`);
    this.el.style.setProperty('--d', `${this.d}px`);
    this.el.style.setProperty('--cover', `url("${data.cover}")`);
    this.setColor(data.color);

    this.el.innerHTML = `
      <div class="book__shadow"></div>
      <div class="book__inner">
        <div class="face face--spine leather">
          <div class="spine__band"></div>
          <div class="spine__rule"></div>
          <div class="spine__rule spine__rule--thin"></div>
          <div class="spine__ornament gold">◆</div>
          <div class="spine__plate">
            <div class="spine__text">
              <span class="spine__title gold gold--vertical">${data.title}</span>
              <span class="spine__genre gold gold--vertical">${data.genre}</span>
            </div>
          </div>
          <div class="spine__bottom">
            <div class="spine__ornament gold">◆</div>
            <div class="spine__rule spine__rule--thin"></div>
            <div class="spine__rule"></div>
            <div class="spine__band"></div>
          </div>
        </div>
        <div class="face face--edge"></div>
        <div class="face face--top"></div>
        <div class="face face--bottom"></div>
        <div class="pages">
          ${Array.from(
            { length: PAGE_COUNT },
            (_, i) => `<div class="page">
            <div class="page__face page__face--front"><p class="page__text">${escapeHtml(this.pageText(i * 2))}</p></div>
            <div class="page__face page__face--back"><p class="page__text">${escapeHtml(this.pageText(i * 2 + 1))}</p></div>
          </div>`,
          ).join('')}
        </div>
        <div class="cover cover--back">
        <div class="face face--back leather">
          <div class="back__frame">
            <div class="back__genre gold">${data.genre}</div>
            <div class="back__rule"></div>
            <h2 class="back__title gold">${data.title}</h2>
            <div class="back__rule"></div>
            <p class="back__text">${data.backText}</p>
            <div class="back__barcode"></div>
          </div>
        </div>
        <div class="face face--back-inside"></div>
        </div>
        <div class="cover cover--front">
          <div class="face face--front leather"></div>
          <div class="face face--front-inside"></div>
        </div>
      </div>`;

    this.els = {
      shadow: this.el.querySelector('.book__shadow'),
      inner: this.el.querySelector('.book__inner'),
      cover: this.el.querySelector('.cover--front'),
      coverBack: this.el.querySelector('.cover--back'),
      edges: Array.from(this.el.querySelectorAll('.face--edge, .face--top, .face--bottom')),
      pages: Array.from(this.el.querySelectorAll('.page')),
    };

    this.fitType();
    this.setRestTransforms();
  }

  /**
   * Placeholder text for one page side, taken from the book's own blurb
   * (a different starting point per side). It is rendered blurred in CSS,
   * so it reads as text but is not legible.
   */
  pageText(n) {
    const words = this.data.backText.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    if (!words.length) return '';
    const start = (n * 37) % words.length;
    const out = [];
    for (let i = 0; i < 180; i++) out.push(words[(start + i) % words.length]);
    return out.join(' ');
  }

  /** Font sizes derived from text length so titles/blurbs fit their faces. */
  fitType() {
    const { title, backText } = this.data;
    const spineFs = Math.min(18, (0.58 * this.h) / (title.length * 0.66));
    this.el.style.setProperty('--spine-fs', `${spineFs.toFixed(1)}px`);
    this.el.style.setProperty('--back-title-fs', title.length > 17 ? '19px' : '22px');
    const len = backText.length;
    const backFs = len < 650 ? 11 : len < 850 ? 10 : 9;
    this.el.style.setProperty('--back-fs', `${backFs}px`);
  }

  /**
   * Shrink the blurb until it fits inside the back-cover frame.
   * Call once web fonts are ready (metrics change with the real font).
   */
  fitBackText() {
    const frame = this.el.querySelector('.back__frame');
    let fs = parseFloat(getComputedStyle(this.el).getPropertyValue('--back-fs')) || 11;
    for (let i = 0; i < 24 && frame.scrollHeight > frame.clientHeight + 1 && fs > 7; i++) {
      fs -= 0.25;
      this.el.style.setProperty('--back-fs', `${fs}px`);
    }
    return fs;
  }

  /** Transform state when the book stands in its slot (spine facing out). */
  get rest() {
    return { x: 0, y: 0, z: -this.w / 2, rotationY: 90, scale: 1 };
  }

  setRestTransforms() {
    gsap.set(this.els.inner, this.rest);
    gsap.set(this.els.cover, { z: this.d / 2, rotationY: 0 });
    gsap.set(this.els.coverBack, { z: -this.d / 2, rotationY: 0 });
    this.els.pages.forEach((p, i) => {
      p.style.setProperty('--curl', 0);
      gsap.set(p, { z: this.pageZ(i), rotationY: 0, scaleX: 1 });
    });
  }

  /** z of page i inside the closed block (just behind the front cover). */
  pageZ(i) {
    return this.d / 2 - 1.4 - i * 0.35;
  }
  /** z of page i once flipped onto the open front cover (later pages on top). */
  pageZFlipped(i) {
    return this.d / 2 + 0.8 + i * 0.35;
  }

  /** Place the book on the shelf (stage coordinates). */
  setSlot(x, y) {
    this.slot = { x, y };
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    // every book shares one camera: the stage centre
    this.el.style.setProperty('--pox', `${STAGE.cx - x}px`);
    this.el.style.setProperty('--poy', `${STAGE.cy - y}px`);
    // books nearer the centre paint on top so receding bodies hide correctly
    const cx = x + this.d / 2;
    this.el.style.setProperty('--z', String(Math.round(30 - Math.abs(cx - STAGE.cx) / 20)));
  }

  /** Translation + scale that brings the book to the stage centre, front cover out. */
  centerTarget() {
    const scale = Math.min(640 / this.h, 1000 / (2 * this.w));
    return {
      x: STAGE.cx - (this.slot.x + this.d / 2),
      y: STAGE.cy - (this.slot.y + this.h / 2),
      scale,
    };
  }

  setColor(hex) {
    this.el.style.setProperty('--color', hex);
  }

  /** Sample the cover and recolour spine / back / edges to match. */
  async sampleColor() {
    const hex = await dominantColor(this.data.cover, this.data.color);
    this.setColor(hex);
    return hex;
  }
}