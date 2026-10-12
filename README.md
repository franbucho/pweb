# Francisco Villahermosa — personal website

A static, dependency-free website built with semantic HTML, shared CSS, and vanilla JavaScript. Existing page URLs and the custom domain are preserved.

## Local development

Open the repository in VS Code and use Live Server, or run `python3 -m http.server 5500` from the root. Visit http://localhost:5500. No npm install or build step is needed.

## Structure

- `index.html`: homepage
- `About-Me.html`: biography and capabilities
- `RPA.html`: automation services
- `DataVisualitation.html`: book page (existing URL retained)
- `Contact.html`: verified contact destinations
- `site.css`: responsive layout and neutral color palette
- `site.js`: mobile navigation and book release countdown

## Book launch

The launch target is October 30, 2026 at 00:00 in New York, represented as `2026-10-30T00:00:00-04:00`. The timer uses the visitor’s clock, updates each second, never becomes negative, and switches to a launch-date message at expiry. It does not claim Amazon availability until a real purchase link is added. Change `BOOK_LAUNCH` in `site.js` if the exact launch time changes.

## Publication

GitHub Pages serves these files directly. Keep `CNAME`. Review changes on the development branch before merging into the configured publication branch.
