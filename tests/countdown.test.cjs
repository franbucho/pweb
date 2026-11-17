'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { BOOK_LAUNCH, remainingTime } = require('../site.js');

test('launch is midnight November 26, 2026 in New York', () => {
  assert.strictEqual(new Date(BOOK_LAUNCH).toISOString(), '2026-11-26T05:00:00.000Z');
});

test('counts down before launch', () => {
  const time = remainingTime(Date.parse('2026-11-16T20:50:00-05:00'));
  assert.deepStrictEqual(time, { days: 9, hours: 3, minutes: 10, seconds: 0, released: false });
  assert.deepStrictEqual(remainingTime(BOOK_LAUNCH - 1000), { days: 0, hours: 0, minutes: 0, seconds: 1, released: false });
  assert.strictEqual(remainingTime(BOOK_LAUNCH - 500).released, false);
});

test('never goes negative and flags release at zero', () => {
  assert.strictEqual(remainingTime(BOOK_LAUNCH).released, true);
  const later = remainingTime(BOOK_LAUNCH + 9e9);
  assert.strictEqual(later.released, true);
  assert.strictEqual(later.days + later.hours + later.minutes + later.seconds, 0);
});
