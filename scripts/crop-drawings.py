#!/usr/bin/env python3
"""Auto-crop the legacy fitting drawings to their ink so they print at the
size of their CONTENT, not their canvas. Kimmy's whiteboard exports span 468
distinct canvas sizes with ink occupying wildly different fractions - that's
why full-page prints came out at random scales.

Usage: python3 scripts/crop-drawings.py <in-dir> <out-dir>
Reads <in-dir>/manifest.json + PNGs, writes cropped PNGs + manifest to
<out-dir>. Re-attach with push-legacy --drawings <out-dir> (upserts by
filename) or extract-drawings.py --attach-db locally.
"""
import json, os, sys
from PIL import Image, ImageChops

PAD = 24  # px of breathing room around the ink

src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
manifest = json.load(open(os.path.join(src, "manifest.json")))

done = set()
cropped = kept = 0
for entry in manifest:
    f = entry["file"]
    if f in done:
        continue
    done.add(f)
    img = Image.open(os.path.join(src, f)).convert("RGB")
    bg = Image.new("RGB", img.size, (255, 255, 255))
    bbox = ImageChops.difference(img, bg).getbbox()
    if bbox:
        left = max(0, bbox[0] - PAD)
        top = max(0, bbox[1] - PAD)
        right = min(img.width, bbox[2] + PAD)
        bottom = min(img.height, bbox[3] + PAD)
        out = img.crop((left, top, right, bottom))
        if out.width < img.width or out.height < img.height:
            cropped += 1
        else:
            kept += 1
    else:
        out = img
        kept += 1
    out.save(os.path.join(dst, f), "PNG")

json.dump(manifest, open(os.path.join(dst, "manifest.json"), "w"), indent=1)
print(f"{cropped} cropped, {kept} already tight -> {dst}")
