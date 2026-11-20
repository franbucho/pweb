'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://franciscovillahermosa.com';
const PAGES = ['index.html', 'About-Me.html', 'RPA.html', 'Projects.html', 'Contact.html',
  'DataVisualitation.html', 'Challenge.html', 'blog/blog.html'];

function meta(src, attr, key) {
  const m = src.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)">`));
  return m ? m[1] : null;
}

function pngSize(file) {
  const b = fs.readFileSync(file);
  assert.strictEqual(b.toString('ascii', 1, 4), 'PNG');
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), bytes: b.length };
}

test('share image is a 1200x630 PNG under 300 KB', () => {
  const { w, h, bytes } = pngSize(path.join(ROOT, 'images/og-card.png'));
  assert.deepStrictEqual([w, h], [1200, 630]);
  assert.ok(bytes < 300 * 1024, `${bytes} bytes`);
});

test('apple-touch-icon is 180x180 and favicons exist', () => {
  const { w, h } = pngSize(path.join(ROOT, 'apple-touch-icon.png'));
  assert.deepStrictEqual([w, h], [180, 180]);
  assert.ok(fs.statSync(path.join(ROOT, 'favicon.ico')).size > 0);
  assert.ok(fs.readFileSync(path.join(ROOT, 'favicon.svg'), 'utf8').includes('<svg'));
});

for (const page of PAGES) {
  test(`${page} has complete Open Graph and Twitter tags`, () => {
    const src = fs.readFileSync(path.join(ROOT, page), 'utf8');
    for (const k of ['og:title', 'og:description', 'og:url', 'og:type', 'og:site_name',
      'og:image', 'og:image:width', 'og:image:height', 'og:image:alt']) {
      assert.ok(meta(src, 'property', k), `missing ${k}`);
    }
    for (const k of ['description', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
      assert.ok(meta(src, 'name', k), `missing ${k}`);
    }
    assert.strictEqual(meta(src, 'property', 'og:image'), `${SITE}/images/og-card.png`);
    assert.strictEqual(meta(src, 'name', 'twitter:image'), `${SITE}/images/og-card.png`);
    assert.strictEqual(meta(src, 'name', 'twitter:card'), 'summary_large_image');
    assert.ok(meta(src, 'property', 'og:url').startsWith(SITE + '/'));
    assert.strictEqual(meta(src, 'name', 'twitter:title'), meta(src, 'property', 'og:title'));
    // Each og:/twitter: key appears only once.
    const keys = [...src.matchAll(/<meta (?:property|name)="((?:og|twitter):[^"]+)"/g)].map((m) => m[1]);
    assert.strictEqual(new Set(keys).size, keys.length, 'duplicate social tags');
  });
}

test('icon links resolve to existing files on every page', () => {
  for (const page of [...PAGES, 'Home.html']) {
    const src = fs.readFileSync(path.join(ROOT, page), 'utf8');
    const hrefs = [...src.matchAll(/<link rel="(?:icon|apple-touch-icon)" href="([^"]+)"/g)].map((m) => m[1]);
    assert.strictEqual(hrefs.length, 3, page);
    for (const href of hrefs) {
      assert.ok(fs.existsSync(path.join(ROOT, path.dirname(page), href)), `${page}: ${href}`);
    }
  }
});
