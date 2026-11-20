#!/usr/bin/env python3
"""Insert Open Graph / Twitter card tags and favicon links into every page.

Idempotent: tags between the SOCIAL-META markers are regenerated on each run.
og:title, og:description and og:url are read from each page's existing tags.

Usage: python3 tools/add_social_meta.py
"""
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://franciscovillahermosa.com"
IMAGE = SITE + "/images/og-card.png"
IMAGE_ALT = ("Francisco Villahermosa, RPA & AI Automation Developer: "
             "name and title over a dark dotted wave pattern.")
START, END = "  <!-- SOCIAL-META:start -->\n", "  <!-- SOCIAL-META:end -->\n"


def meta_value(src, attr, key):
    m = re.search(rf'<meta {attr}="{re.escape(key)}" content="([^"]*)">', src)
    return m.group(1) if m else None


def block(src, prefix, with_social):
    lines = [
        f'<link rel="icon" href="{prefix}favicon.ico" sizes="48x48">',
        f'<link rel="icon" href="{prefix}favicon.svg" type="image/svg+xml">',
        f'<link rel="apple-touch-icon" href="{prefix}apple-touch-icon.png">',
    ]
    if with_social:
        title = meta_value(src, "property", "og:title")
        desc = meta_value(src, "property", "og:description")
        alt = html.escape(IMAGE_ALT, quote=True)
        lines += [
            '<meta property="og:site_name" content="Francisco Villahermosa">',
            '<meta property="og:locale" content="en_US">',
            f'<meta property="og:image" content="{IMAGE}">',
            f'<meta property="og:image:secure_url" content="{IMAGE}">',
            '<meta property="og:image:type" content="image/png">',
            '<meta property="og:image:width" content="1200">',
            '<meta property="og:image:height" content="630">',
            f'<meta property="og:image:alt" content="{alt}">',
            '<meta name="twitter:card" content="summary_large_image">',
            f'<meta name="twitter:title" content="{title}">',
            f'<meta name="twitter:description" content="{desc}">',
            f'<meta name="twitter:image" content="{IMAGE}">',
            f'<meta name="twitter:image:alt" content="{alt}">',
        ]
    return START + "".join(f"  {l}\n" for l in lines) + END


def process(path):
    src = path.read_text(encoding="utf-8")
    src = re.sub(re.escape(START) + r".*?" + re.escape(END), "", src, flags=re.S)
    # Old single og:image line pointing at the previous cover.
    src = re.sub(r'  <meta property="og:image" content="[^"]*">\n', "", src)
    with_social = meta_value(src, "property", "og:title") is not None
    if with_social:
        missing = [k for k in ("og:description", "og:url", "og:type")
                   if meta_value(src, "property", k) is None]
        if missing or meta_value(src, "name", "description") is None:
            raise SystemExit(f"{path}: missing {missing or 'meta description'}")
    prefix = "../" * (len(path.relative_to(ROOT).parts) - 1)
    anchor = '  <link rel="stylesheet"'
    if anchor not in src:
        raise SystemExit(f"{path}: no stylesheet link to anchor on")
    src = src.replace(anchor, block(src, prefix, with_social) + anchor, 1)
    path.write_text(src, encoding="utf-8")
    return with_social


def main():
    for path in sorted(ROOT.glob("*.html")) + sorted(ROOT.glob("blog/*.html")):
        kind = "icons + social" if process(path) else "icons only"
        print(f"{path.relative_to(ROOT)}: {kind}")


if __name__ == "__main__":
    main()
