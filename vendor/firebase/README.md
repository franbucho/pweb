# Vendored Firebase JS SDK 13.4.0

`snake.js` loads these ES modules from this folder instead of `www.gstatic.com/firebasejs`,
so a change on the CDN cannot alter the code that runs on the site (security audit, finding 11).

## Origin

- Package: `firebase@13.4.0` from the npm registry, fetched with `npm pack firebase@13.4.0` on 2026-11-17.
- Tarball `firebase-13.4.0.tgz` sha256: `5320122b348b6010b78e1f24fd5264d63031162a0f4f97cfb17f55d5049fee81`
  (npm shasum `22cba36759e49d718feab627352cc96c81307e99`).
- Files are the browser ESM builds at the package root (the same builds published on gstatic).
- License: Apache-2.0 (Google LLC), as declared in the package's `package.json`.

## Changes

`firebase-auth.js` and `firebase-firestore.js` import
`"https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js"`; that one import per file was rewritten to
`"./firebase-app.js"`. Nothing else was modified. `firebase-app.js` is unchanged; it still contains the CDN URL
as a plain string (its internal component/logger name), which never triggers a request.
`13.4.0/package.json` only sets `"type": "module"` so the test suite can import the real modules in Node;
browsers ignore it. The `//# sourceMappingURL` comments are left as is; the `.map` files are not vendored (only DevTools asks for them).

## sha256

| File | Original (npm) | Vendored (this folder) |
|------|----------------|------------------------|
| firebase-app.js | `26673f502611bc7b382edfee3230c70954dd5e4982779185c7b6b657b5f69737` | `26673f502611bc7b382edfee3230c70954dd5e4982779185c7b6b657b5f69737` |
| firebase-auth.js | `9be3b6574c0c46f4a0bfb8d85436c30c89871a8d5a9fbeb0e0137d90a74667e9` | `1b2db9f0c86387c117482fc698b19675d5da328a8a66269640011e084f709e49` |
| firebase-firestore.js | `758596fa33e277d38925d05e8111acfd209dc0dbff593e3bb4eaeb35aec2f85c` | `21c40c8f4a05d15365f36c0cb101c4c9b7962cb861fd4a372ca5e2099e65c0b3` |

`node tests/snake.test.cjs` checks that the vendored hashes match this table and that no file imports a remote URL.

## Updating

Run `npm pack firebase@<version>`, copy the three root files into `vendor/firebase/<version>/`, rewrite the
`firebase-app.js` import to a relative path, update `FIREBASE_BASE` in `snake.js`, this README and the test.
Never point it back to a CDN.

Note: Google sign-in (`signInWithPopup`) still loads Google's own `apis.google.com/js/api.js` helper at runtime;
that is part of how Firebase Auth works and is not a Firebase SDK module.
