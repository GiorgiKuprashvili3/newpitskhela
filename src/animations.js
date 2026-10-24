import { gsap } from 'gsap';

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Reduced motion: swap transform state inside a quick opacity fade. */
function fadeSwap(tl, target, setVars, at = 0) {
  tl.to(target, { autoAlpha: 0, duration: 0.2, ease: 'power1.out' }, at)
    .set(target, setVars, at + 0.2)
    .to(target, { autoAlpha: 1, duration: 0.25, ease: 'power1.in' }, at + 0.22);
  return tl;
}

/**
 * Hover: slide toward the viewer, lift a little, grow the shadow.
 * Returns a paused timeline; play() on enter, reverse() on leave.
 */
export function hoverTimeline(book) {
  const tl = gsap.timeline({ paused: true, defaults: { duration: 0.3, ease: 'power2.out' } });
  if (reducedMotion) return tl;
  const { inner, shadow } = book.els;
  tl.to(inner, { z: book.rest.z + 52, y: -8 }, 0).to(
    shadow,
    { scaleX: 1.3, scaleY: 1.7, y: 6, opacity: 0.95 },
    0,
  );
  return tl;
}

/**
 * Click 1: pull fully out, fly to the centre, scale up and rotate so the
 * front cover faces the viewer. Background dims and blurs.
 */
export function pullOutTimeline(book, env) {
  const { inner, shadow } = book.els;
  const { x, y, scale } = book.centerTarget();
  const front = { x, y, z: 0, rotationY: 0, scale };
  const tl = gsap.timeline();

  tl.to(env.hint, { autoAlpha: 0, duration: 0.3 }, 0)
    .to(shadow, { autoAlpha: 0, duration: 0.35 }, 0.1)
    .to(env.dim, { autoAlpha: 1, duration: 0.6, ease: 'power2.out' }, 0.25)
    .to(env.bgSharp, { autoAlpha: 0, duration: 0.6, ease: 'power2.out' }, 0.25);

  if (reducedMotion) return fadeSwap(tl, inner, front);

  tl.to(inner, { z: book.rest.z + 70, y: -10, duration: 0.28, ease: 'power2.out' }, 0).to(
    inner,
    { ...front, duration: 0.9, ease: 'power3.inOut' },
    0.22,
  );
  return tl;
}

/**
 * Click 2: the front cover swings open, blank pages flip one after another
 * with a curl, then the book closes and turns 180° to show the back cover.
 */
export function flipThroughTimeline(book) {
  const { inner, cover, pages } = book.els;
  const { x, scale } = book.centerTarget();
  const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });

  if (reducedMotion) return fadeSwap(tl, inner, { rotationY: 180 });

  // open the cover; shift the book so the spine ends up centred
  tl.to(cover, { rotationY: -180, duration: 0.8 }, 0).to(inner, { x: x + (book.w * scale) / 2, duration: 0.8 }, 0);

  // pages turn with a stagger; scaleX dip + --curl shading fake the curl
  let t = 0.55;
  const STEP = 0.12;
  pages.forEach((page, i) => {
    tl.to(page, { rotationY: -180, z: book.pageZFlipped(i), duration: 0.6, ease: 'power1.inOut' }, t).to(
      page,
      {
        keyframes: { scaleX: [1, 0.88, 1], '--curl': [0, 1, 0], easeEach: 'sine.inOut' },
        duration: 0.6,
      },
      t,
    );
    t += STEP;
  });

  // close everything again (last page first), then turn to the back cover
  const close = t + 0.5;
  tl.to(
    pages,
    { rotationY: 0, z: (i) => book.pageZ(i), duration: 0.45, stagger: { each: 0.035, from: 'end' } },
    close,
  )
    .to(cover, { rotationY: 0, duration: 0.5 }, close + 0.3)
    .to(inner, { x, duration: 0.5 }, close + 0.3)
    .to(inner, { rotationY: 180, duration: 0.9, ease: 'power3.inOut' }, close + 0.85);

  return tl;
}

/**
 * Click 3 / overlay / Esc: rotate back to the spine view and fly into the
 * exact slot; background returns.
 */
export function returnTimeline(book, env) {
  const { inner, shadow } = book.els;
  const tl = gsap.timeline();

  tl.to(env.dim, { autoAlpha: 0, duration: 0.55, ease: 'power2.inOut' }, 0.3)
    .to(env.bgSharp, { autoAlpha: 1, duration: 0.55, ease: 'power2.inOut' }, 0.3)
    .to(shadow, { autoAlpha: 1, scaleX: 1, scaleY: 1, y: 0, duration: 0.4 }, 0.55)
    .to(env.hint, { autoAlpha: 1, duration: 0.4 }, 0.8);

  if (reducedMotion) return fadeSwap(tl, inner, book.rest);

  tl.to(inner, { ...book.rest, duration: 0.9, ease: 'power3.inOut' }, 0);
  return tl;
}
