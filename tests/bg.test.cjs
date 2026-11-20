'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { bgSettings, bgField, bgSideFade, BG_DESKTOP, BG_MOBILE } = require('../bg.js');

test('mobile gets the lighter configuration', () => {
  assert.strictEqual(bgSettings(390, true), BG_MOBILE);
  assert.strictEqual(bgSettings(1366, true), BG_MOBILE); // tablets / touch
  assert.strictEqual(bgSettings(1366, false), BG_DESKTOP);
  assert.ok(BG_MOBILE.fps < BG_DESKTOP.fps);
  assert.ok(BG_MOBILE.spacing > BG_DESKTOP.spacing);
  assert.strictEqual(BG_MOBILE.maxDpr, 1);
});

test('dots stay subtle (low max opacity)', () => {
  // Max dot opacity is 0.05 base + alpha; keep it well below text contrast.
  assert.ok(BG_DESKTOP.alpha + 0.05 <= 0.4 && BG_MOBILE.alpha + 0.05 <= 0.4);
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
