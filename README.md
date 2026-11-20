# Francisco Villahermosa — personal website

A static, dependency-free website built with semantic HTML, shared CSS, and vanilla JavaScript. Existing page URLs and the custom domain are preserved.

## Local development

Open the repository in VS Code and use Live Server, or run `python3 -m http.server 5500` from the root. Visit http://localhost:5500. No npm install or build step is needed.

## Structure

- `index.html`: homepage (services, selected work, book, contact call to action)
- `Projects.html`: project case studies (problem, solution, stack, result)
- `RPA.html`: services (existing URL retained)
- `About-Me.html`: biography and capabilities
- `DataVisualitation.html`: book page (existing URL retained)
- `Contact.html`: verified contact destinations and FAQ
- `Challenge.html`: Snake game, linked from the footer
- `Home.html`: legacy URL, redirects to the homepage
- `blog/blog.html`: notes placeholder (not linked, `noindex`)
- `sitemap.xml`, `robots.txt`: search engine discovery
- `images/og-cover.png`: social sharing image (1200×630)
- `site.css`: responsive layout and neutral color palette
- `site.js`: mobile navigation and book release countdown
- `bg.js`: subtle animated dot-wave background (one fixed `<canvas>`, no dependencies). Lighter on mobile/touch (sparser grid, 1x resolution, 15 fps) than on desktop (30 fps); pauses while the tab is hidden; draws a single static frame with `prefers-reduced-motion` or Save-Data. Loaded on every page except `Challenge.html` (the game) and the `Home.html` redirect. Tests: `node --test tests/*.cjs`

## Book launch

The launch target is November 26, 2026 at 00:00 in New York, represented as `2026-11-26T00:00:00-05:00` (`BOOK_LAUNCH` in `site.js`). The timer uses the visitor’s clock, updates each second and never goes negative. When it reaches zero, the timer and the launch date are hidden and the banner only says “Coming soon on Amazon” (the release may slip). Replace that text with the real Amazon link once the book is published.

## Publication

GitHub Pages serves these files directly. Keep `CNAME`. Review changes on the development branch before merging into the configured publication branch.

## Snake challenge

`Challenge.html` adapts the face-controlled game from `franbucho/ProfileMiniGame`, preserving its 30×30 board, 120 ms tick, and 10 points per food. `snake-engine.js` contains independent game logic; `snake.js` handles camera calibration, controls, history, and optional Firebase integration (modular SDK 13.4.0, self-hosted in `vendor/firebase/13.4.0/` and loaded with `import()`; no CDN, see `vendor/firebase/README.md` for origin and sha256). It has no email notifications or IP geolocation.

Recent game history (up to 50 rounds) is local to each browser. The existing Firebase project `profile-minigame` provides optional Google sign-in and the shared best-score leaderboard. Existing records are preserved; only a signed-in player's own best score is updated. The top 10 display names, score, and duration; email addresses are not displayed. A leaderboard stores best records, while the local history stores every completed round.

For Google sign-in on the portfolio, Firebase Authentication must authorize `franciscovillahermosa.com` (and `www.franciscovillahermosa.com` if used) under Settings → Authorized domains. Existing Firestore rules must allow the intended leaderboard reads and each authenticated user to update their own record. No Firebase rules were modified. Guest mode remains usable if Firebase is unavailable or takes more than 20 s to load. The existing client-submitted ranking is not a server-verified competitive leaderboard.

FaceMesh is loaded on demand at pinned version `0.4.1633559619`. Camera access requires HTTPS or localhost. Frames remain on-device; the camera closes after finishing, cancelling, hiding, or leaving the page. Calibration and camera failure do not create scored rounds. Keyboard / touch mode needs no camera.
