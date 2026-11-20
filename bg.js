'use strict';
// Animated background: a grid of dots whose brightness follows slow,
// overlapping waves. Drawn on one fixed <canvas> behind the content.
// - Desktop: denser grid, up to 30 fps. Mobile: sparser grid, 1x resolution, 15 fps.
// - Pauses while the tab is hidden; static single frame with prefers-reduced-motion
//   or Save-Data. No dependencies.

const BG_DESKTOP = { spacing: 24, fps: 30, maxDpr: 2, size: 3.2, alpha: 0.8 };
const BG_MOBILE = { spacing: 30, fps: 15, maxDpr: 1, size: 3.2, alpha: 0.7 };
// Opacity of the faint base grid (troughs) and the field window mapped onto the
// brightness levels: a narrower window = taller, more contrasted wave crests.
const BG_BASE_ALPHA = 0.14;
const BG_FIELD_LOW = 0.28;
const BG_FIELD_RANGE = 0.47;
// Dot colour goes from a dim grey in the troughs to near-white on the crests.
const BG_COLOR_LOW = 150;
const BG_COLOR_HIGH = 245;

// CSS fill for brightness k in [0, 1] (0 = trough, 1 = crest).
function bgFill(k, alpha) {
  const c = Math.round(BG_COLOR_LOW + (BG_COLOR_HIGH - BG_COLOR_LOW) * k);
  return `rgba(${c},${c},${c},${(BG_BASE_ALPHA + alpha * Math.pow(k, 1.3)).toFixed(3)})`;
}

// Brightness level (0..levels-1) for a faded field value v in [0, 1].
function bgLevel(v, levels) {
  return Math.max(0, Math.min(levels - 1, Math.floor((v - BG_FIELD_LOW) / BG_FIELD_RANGE * levels)));
}

function bgSettings(width, coarsePointer) {
  return width <= 640 || coarsePointer ? BG_MOBILE : BG_DESKTOP;
}

// Smooth wave field in [0, 1] for grid position (x, y) in CSS px at time t (s).
function bgField(x, y, t) {
  const v = Math.sin(x * 0.006 + t * 0.35)
    + Math.sin(y * 0.008 - t * 0.27)
    + Math.sin((x + y) * 0.004 + t * 0.21)
    + Math.sin(Math.hypot(x - 900, y - 200) * 0.01 - t * 0.5);
  return (v + 4) / 8;
}

// Keep the left side (where headings and paragraphs start) calmer on wide screens.
function bgSideFade(x, width) {
  if (width <= 640) return 0.85;
  const r = x / width;
  return 0.5 + 0.5 * Math.min(1, Math.max(0, (r - 0.25) / 0.45));
}

if (typeof module !== 'undefined') module.exports = { bgSettings, bgField, bgSideFade, bgLevel, bgFill, BG_DESKTOP, BG_MOBILE, BG_BASE_ALPHA };

if (typeof document !== 'undefined' && typeof window !== 'undefined') (function () {
  const canvas = document.createElement('canvas');
  canvas.className = 'bg-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;
  document.body.prepend(canvas);

  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarseQuery = window.matchMedia('(pointer: coarse)');
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const LEVELS = 8; // dots are batched by brightness level: 8 fills per frame
  let cfg, width, height, points = [], frame = 0, last = 0;

  function resize() {
    // Mobile browsers fire resize while the URL bar shows/hides: if only the
    // height shrank, keep the current (taller) canvas instead of rebuilding.
    if (width === window.innerWidth && height >= window.innerHeight) return false;
    height = width === window.innerWidth ? Math.max(height, window.innerHeight) : window.innerHeight;
    width = window.innerWidth;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    cfg = bgSettings(width, coarseQuery.matches);
    const dpr = Math.min(window.devicePixelRatio || 1, cfg.maxDpr);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    points = [];
    const s = cfg.spacing;
    for (let y = s / 2; y < height; y += s) {
      for (let x = s / 2; x < width; x += s) points.push(x, y, bgSideFade(x, width));
    }
    return true;
  }

  function draw(t) {
    ctx.clearRect(0, 0, width, height);
    const buckets = Array.from({ length: LEVELS }, () => []);
    for (let i = 0; i < points.length; i += 3) {
      const v = bgField(points[i], points[i + 1], t) * points[i + 2];
      buckets[bgLevel(v, LEVELS)].push(i);
    }
    for (let l = 0; l < LEVELS; l++) {
      const list = buckets[l];
      if (!list.length) continue;
      const k = l / (LEVELS - 1);
      const size = cfg.size * (0.55 + 0.75 * k);
      // Dim base grid everywhere, bigger and brighter dots where the waves crest.
      ctx.fillStyle = bgFill(k, cfg.alpha);
      ctx.beginPath();
      for (const i of list) ctx.rect(points[i] - size / 2, points[i + 1] - size / 2, size, size);
      ctx.fill();
    }
  }

  // Wall-clock time keeps the motion continuous across pauses and resizes.
  const now = () => Date.now() / 1000 % 100000;
  const animated = () => !reduceQuery.matches && !saveData;

  function loop(ts) {
    frame = 0;
    if (document.hidden || !animated()) return;
    frame = window.requestAnimationFrame(loop);
    if (ts - last < 1000 / cfg.fps - 1) return;
    last = ts;
    draw(now());
  }

  function start() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    draw(now()); // static frame (also the only one with reduced motion)
    if (animated() && !document.hidden) frame = window.requestAnimationFrame(loop);
  }

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => { if (resize()) start(); }, 150);
  });
  document.addEventListener('visibilitychange', start);
  reduceQuery.addEventListener('change', start);
  resize();
  start();
})();
