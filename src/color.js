/**
 * Canvas colour sampling: returns the dominant colour of an image,
 * nudged into a lightness range that reads well as leather / cloth.
 */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToHex(h, s, l) {
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * @param {string} src     image URL (same origin)
 * @param {string} fallback hex colour used if sampling fails
 * @returns {Promise<string>} hex colour
 */
export async function dominantColor(src, fallback) {
  try {
    const img = await loadImage(src);
    const W = 48;
    const H = 64;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, W, H);
    const { data } = ctx.getImageData(0, 0, W, H);

    // 3 bits per channel → 512 bins, weighted towards saturated pixels
    const bins = new Map();
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const [, s, l] = rgbToHsl(r, g, b);
      if (l > 0.82) continue; // skip highlights and title text
      const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
      const w = 1 + s * 2;
      const e = bins.get(key) || { w: 0, r: 0, g: 0, b: 0 };
      e.w += w;
      e.r += r * w;
      e.g += g * w;
      e.b += b * w;
      bins.set(key, e);
    }
    let best = null;
    for (const e of bins.values()) if (!best || e.w > best.w) best = e;
    if (!best) return fallback;

    let [h, s, l] = rgbToHsl(best.r / best.w, best.g / best.w, best.b / best.w);
    l = clamp(l, 0.16, 0.36);
    s = clamp(s * 1.1, 0.12, 0.6);
    return hslToHex(h, s, l);
  } catch {
    return fallback;
  }
}
