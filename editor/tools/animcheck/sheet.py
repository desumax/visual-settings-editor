#!/usr/bin/env python3
"""Contact sheet for animcheck: frames.json ({frames: [[png, ms, top], ...], height}) -> one PNG with the
time over each frame. Each frame is cropped to the preview box where it was in that frame."""
import json, sys
from PIL import Image, ImageDraw
d = json.load(open(sys.argv[1]))
fr, height = d["frames"], d["height"]
ims = []
for f, _, top in fr:
    im = Image.open(f)
    ims.append(im.crop((0, max(0, top - 6), im.size[0], min(im.size[1], top + height + 6))))
w, h = max(i.size[0] for i in ims), max(i.size[1] for i in ims)
cols = max(1, min(len(ims), 1680 // (w + 6)))
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * (w + 6), rows * (h + 20)), "white")
dr = ImageDraw.Draw(sheet)
for i, (im, (_, t, _top)) in enumerate(zip(ims, fr)):
    x, y = (i % cols) * (w + 6), (i // cols) * (h + 20)
    sheet.paste(im, (x, y + 16)); dr.text((x + 2, y + 2), f"{t} ms", fill="black")
sheet.save(sys.argv[2])
