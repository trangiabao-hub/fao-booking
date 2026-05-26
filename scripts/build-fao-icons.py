#!/usr/bin/env python3
"""Xuất favicon FAO — scale tối đa (contain), không cắt máy ảnh."""
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "fao-icon-source.png"
OUT = ROOT / "public"
SIZES = {
    "apple-touch-icon.png": 180,
    "icon-192.png": 192,
    "favicon-32.png": 32,
}


def remove_white(im: Image.Image, threshold: int = 238) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r >= threshold and g >= threshold and b >= threshold:
                px[x, y] = (r, g, b, 0)
    return im


def trim_transparent(im: Image.Image) -> Image.Image:
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im


def build_icon(src: Image.Image, size: int) -> Image.Image:
    im = trim_transparent(remove_white(src))
    fitted = ImageOps.contain(im, (size, size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ox = (size - fitted.width) // 2
    oy = (size - fitted.height) // 2
    canvas.paste(fitted, (ox, oy), fitted)
    return canvas


def render(src: Image.Image, size: int) -> Image.Image:
    hi = size * 8
    big = build_icon(src, hi)
    return big.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Missing source image: {SRC}")
    src = Image.open(SRC)
    for name, size in SIZES.items():
        out = render(src, size)
        out.save(OUT / name, "PNG", optimize=True)
        bb = out.getbbox()
        if bb:
            fw, fh = bb[2] - bb[0] + 1, bb[3] - bb[1] + 1
            pct = fw * fh / (size * size) * 100
            print(f"  ✓ {name} ({size}px) — {fw}×{fh}px ({pct:.0f}% khung)")
    print("Done (contain fit, no clip).")


if __name__ == "__main__":
    main()
