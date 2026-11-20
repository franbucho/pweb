#!/usr/bin/env python3
"""Generate the social preview card and favicons for the site.

Outputs (relative to the repo root):
  images/og-card.png     1200x630 Open Graph / Twitter card
  favicon.ico            16/32/48 px
  favicon.svg            vector favicon
  apple-touch-icon.png   180x180

The dot pattern reuses the wave field from bg.js (same formula, frozen in time)
so the card matches the animated background of the site.

Usage: python3 tools/make_social_images.py   (needs Pillow)
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT_DIR = Path("/usr/share/fonts/truetype/liberation")
BOLD = FONT_DIR / "LiberationSans-Bold.ttf"
REGULAR = FONT_DIR / "LiberationSans-Regular.ttf"

BG = (20, 20, 20)        # --bg  #141414
TEXT = (238, 238, 238)   # --text #eeeeee
ACCENT = (196, 196, 196) # --accent #c4c4c4
MUTED = (176, 176, 176)  # --muted #b0b0b0
LINE = (55, 55, 55)      # --line #373737
DOT = (214, 214, 214)    # dot colour used by bg.js

NAME = "Francisco Villahermosa"
HEADLINE = "RPA & AI Automation Developer"
EYEBROW = "NEW YORK  ·  RPA  ·  PYTHON  ·  AI AGENTS"
DOMAIN = "franciscovillahermosa.com"


def field(x, y, t):
    """Same wave field as bgField() in bg.js, in [0, 1]."""
    v = (math.sin(x * 0.006 + t * 0.35)
         + math.sin(y * 0.008 - t * 0.27)
         + math.sin((x + y) * 0.004 + t * 0.21)
         + math.sin(math.hypot(x - 900, y - 200) * 0.01 - t * 0.5))
    return (v + 4) / 8


def side_fade(x, width):
    """Like bgSideFade() in bg.js: calm left side where the text sits."""
    r = x / width
    return 0.25 + 0.75 * min(1.0, max(0.0, (r - 0.35) / 0.35))


def draw_dots(img, scale, width, height, spacing=22, t=7.0, size=3.2, alpha=0.85):
    """Paint the dot grid. Coordinates are in 1x px, drawn at `scale`."""
    over = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    levels = 8
    y = spacing / 2
    while y < height:
        x = spacing / 2
        while x < width:
            v = field(x, y, t) * side_fade(x, width)
            level = max(0, min(levels - 1, int((v - 0.2) / 0.7 * levels)))
            k = level / (levels - 1)
            s = size * (0.7 + 0.6 * k) * scale
            a = 0.06 + alpha * k ** 1.6
            cx, cy = x * scale, y * scale
            d.rectangle([cx - s / 2, cy - s / 2, cx + s / 2, cy + s / 2],
                        fill=DOT + (round(255 * a),))
            x += spacing
        y += spacing
    img.alpha_composite(over)


def og_card(path):
    w, h, s = 1200, 630, 2  # draw at 2x, downsample for clean anti-aliasing
    img = Image.new("RGBA", (w * s, h * s), BG + (255,))
    draw_dots(img, s, w, h)

    # Soft dark panel behind the text so it stays readable over the dots.
    shade = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shade)
    for i in range(0, 720 * s, 4):
        a = round(170 * (1 - i / (720 * s)) ** 2)
        sd.rectangle([i, 0, i + 4, h * s], fill=BG + (a,))
    img.alpha_composite(shade)

    d = ImageDraw.Draw(img)
    x = 88 * s
    f_eyebrow = ImageFont.truetype(str(BOLD), 20 * s)
    f_name = ImageFont.truetype(str(BOLD), 78 * s)
    f_head = ImageFont.truetype(str(REGULAR), 42 * s)
    f_domain = ImageFont.truetype(str(REGULAR), 26 * s)

    d.text((x, 168 * s), EYEBROW, font=f_eyebrow, fill=MUTED)
    d.text((x, 212 * s), NAME, font=f_name, fill=TEXT)
    d.text((x, 322 * s), HEADLINE, font=f_head, fill=ACCENT)
    d.rectangle([x, 410 * s, x + 200 * s, 412 * s], fill=TEXT)
    d.text((x, 440 * s), DOMAIN, font=f_domain, fill=MUTED)
    # Thin frame line, like the site's card borders.
    d.rectangle([0, 0, w * s - 1, h * s - 1], outline=LINE, width=2 * s)

    out = img.resize((w, h), Image.LANCZOS).convert("RGB")
    out = out.quantize(colors=128, method=Image.MEDIANCUT, dither=Image.NONE)
    out.save(path, optimize=True)


def icon(size):
    """Square 'FV' monogram on the dark background."""
    s = 4
    n = size * s
    img = Image.new("RGBA", (n, n), BG + (255,))
    d = ImageDraw.Draw(img)
    font = ImageFont.truetype(str(BOLD), round(n * 0.5))
    bbox = d.textbbox((0, 0), "FV", font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((n - tw) / 2 - bbox[0], (n - th) / 2 - bbox[1]), "FV", font=font, fill=TEXT)
    return img.resize((size, size), Image.LANCZOS).convert("RGB")


FAVICON_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#141414"/>
  <text x="32" y="43" text-anchor="middle" font-family="Arial,Helvetica,sans-serif"
        font-size="30" font-weight="700" fill="#eeeeee">FV</text>
</svg>
"""


def main():
    og_card(ROOT / "images" / "og-card.png")
    icon(180).save(ROOT / "apple-touch-icon.png", optimize=True)
    icon(48).save(ROOT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    (ROOT / "favicon.svg").write_text(FAVICON_SVG, encoding="utf-8")
    for p in ("images/og-card.png", "apple-touch-icon.png", "favicon.ico", "favicon.svg"):
        f = ROOT / p
        print(f"{p}: {f.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
