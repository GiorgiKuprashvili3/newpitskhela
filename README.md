# Interactive Bookshelf

Single-page 3D bookshelf built with Vite + vanilla JS and GSAP. Eight Georgian genre books stand spine-out on an oak shelf; each one is a real CSS 3D object (front/back covers, spine, page block) that pulls out, opens, flips its pages and shows its back-cover blurb.

## Run locally

Requirements: Node 18+ and npm.

```bash
npm install
npm run dev        # http://localhost:5173
```

Production build / preview:

```bash
npm run build      # outputs to dist/
npm run preview    # serves dist/ on http://localhost:4173
```

> On this machine (CachyOS) only `node` was installed. Install npm with `sudo pacman -S npm`, or enable the bundled one with `sudo corepack enable npm`.

The Georgian fonts (Noto Serif Georgian / Noto Sans Georgian) are loaded from Google Fonts, so the first load needs internet access; without it the browser falls back to a local serif.

## Interactions

| Step | Trigger | What happens |
| --- | --- | --- |
| Hover | mouse over a book (desktop only) | book slides ~50 px toward you, lifts slightly, shadow grows (0.3 s `power2.out`); reversed on leave; disabled while a book is open |
| Click 1 | click a book | pulls out of its slot, flies to the centre, scales up and turns so the **front cover** faces you (0.9 s `power3.inOut`); background dims and blurs |
| Click 2 | click the open book | front cover swings open around the spine, 10 blank cream pages flip with curl shading and a moving shadow (0.12 s stagger), the book closes and turns 180° to show the **back cover** with the Georgian blurb |
| Click 3 | click the book, click the dimmed background, or press `Esc` | turns back to spine view and flies to its exact slot |

Input is locked while any timeline is playing. On touch devices the first tap performs the pull-out directly (no hover state); subsequent taps continue the sequence. With `prefers-reduced-motion: reduce` all transform animations are replaced by simple cross-fades.

## Project structure

```
index.html                 stage, background layers, shelf, dim overlay
src/
  main.js                  layout, state machine (idle → front → back), event wiring
  Book.js                  Book class: builds the 3D DOM, slot geometry, colour sampling
  animations.js            GSAP timelines: hover, pullOut, flipThrough, return (+ reduced-motion)
  color.js                 canvas dominant-colour sampler for cover → body colour
  books.json               id, genre, title, cover, color, height, depth, backText
  styles.css               3D faces, leather/gold-foil styling, responsive stage scaling
public/assets/
  covers/*.jpg             the 8 front covers
  bg/library.jpg           baseline background (and a pre-blurred copy for the dim state)
  textures/leather.png     tiling leather overlay
```

### How the 3D works

- The scene is a fixed 1440×900 "stage" scaled with `--s = min(vw/1440, vh/900)`, so it is responsive down to phone width while keeping the shelf geometry exact.
- Each `.book` has its own `perspective` with a `perspective-origin` computed from its slot so every book shares one virtual camera at the stage centre. That keeps books as flat stacking contexts, which lets the dim overlay sit between the active book and the idle ones.
- `.book__inner` is `transform-style: preserve-3d`; at rest it is `translateZ(-w/2) rotateY(90deg)` so the spine lies at z = 0. The front cover is a hinged group (`transform-origin: 0 50%`) that rotates −180° to open; pages are individual planes whose `z` is retargeted while flipping so they stack correctly on the open side.
- Dimming/blurring is an opacity cross-fade between the sharp and pre-blurred background plus a dim overlay — no animated `filter`, so everything stays on the compositor.
- Body colour is sampled from each cover on load (`color.js`) and overrides the fallback `color` in `books.json`. Spine titles use `background-clip: text` gold-foil gradient; leather texture is a `mix-blend-mode: overlay` layer.

## Editing content

Edit `src/books.json`. `height`/`depth` are in stage pixels, `cover` is a path under `public/`, `backText` is shown verbatim (line breaks preserved). Blurb and spine type sizes auto-fit to the available space.
