'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { bgSettings, bgField, bgSideFade, bgLevel, BG_DESKTOP, BG_MOBILE, BG_BASE_ALPHA } = require('../bg.js');

test('mobile gets the lighter configuration', () => {
  assert.strictEqual(bgSettings(390, true), BG_MOBILE);
  assert.strictEqual(bgSettings(1366, true), BG_MOBILE); // tablets / touch
  assert.strictEqual(bgSettings(1366, false), BG_DESKTOP);
  assert.ok(BG_MOBILE.fps < BG_DESKTOP.fps);
  assert.ok(BG_MOBILE.spacing > BG_DESKTOP.spacing);
  assert.strictEqual(BG_MOBILE.maxDpr, 1);
});

test('dots are visible but stay below text contrast', () => {
  // Max dot opacity is base + alpha: clearly visible, yet far from the text (#eee, opaque).
  for (const c of [BG_DESKTOP, BG_MOBILE]) {
    assert.ok(BG_BASE_ALPHA + c.alpha >= 0.45, 'too faint');
    assert.ok(BG_BASE_ALPHA + c.alpha <= 0.6, 'competes with text');
    assert.ok(c.size <= 3);
  }
  // Mobile keeps the same point budget rules (no denser grid, no hi-dpi).
  assert.ok(BG_MOBILE.alpha <= BG_DESKTOP.alpha);
});

test('brightness levels are clamped and reach the top on crests', () => {
  assert.strictEqual(bgLevel(0, 8), 0);
  assert.strictEqual(bgLevel(1, 8), 7);
  assert.strictEqual(bgLevel(0.79, 8), 7);
  for (let v = -0.5; v <= 1.5; v += 0.01) {
    const l = bgLevel(v, 8);
    assert.ok(Number.isInteger(l) && l >= 0 && l <= 7);
  }
});

test('card hover only on real hover devices and honours reduced motion', () => {
  const css = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'site.css'), 'utf8');
  const hoverBlock = css.indexOf('@media (hover:hover) and (pointer:fine) {');
  const rule = css.indexOf('.card:hover');
  assert.ok(hoverBlock !== -1 && rule > hoverBlock, '.card:hover must live inside @media (hover:hover)');
  assert.match(css, /transition:transform \.2s/);
  assert.match(css, /translateY\(-4px\)/);
  assert.match(css, /\(hover:hover\) and \(pointer:fine\) and \(prefers-reduced-motion:reduce\)[^@]*transform:none/);
});

test('wave field is bounded to [0, 1] and changes over time', () => {
  for (let i = 0; i < 2000; i++) {
    const v = bgField(Math.random() * 3000, Math.random() * 3000, Math.random() * 1e5);
    assert.ok(v >= 0 && v <= 1);
  }
  assert.notStrictEqual(bgField(100, 100, 0), bgField(100, 100, 2));
});

test('left side (text) is calmer than the right on desktop', () => {
  assert.ok(bgSideFade(50, 1366) < bgSideFade(1300, 1366));
  assert.strictEqual(bgSideFade(1300, 1366), 1);
  assert.strictEqual(bgSideFade(10, 390), bgSideFade(380, 390));
});
