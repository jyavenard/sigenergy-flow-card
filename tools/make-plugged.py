#!/usr/bin/env python3
"""Make the plugged-in charger overlays, images/charger_<time>_plugged.png, from images/charger_<time>.png.

The connector leaves the holster (the handle is painted out), the LED bar turns green and the cable loop is
replaced by a cable that drops down the pillar and runs along its foot into the dark under the car's front, where it
fades out. The car images cover the floor too, so the cable is drawn over them: it ends at x 510-514, where every
car in cars/ is dark under it (the shade under the bumper), however far back its bumper is.
The result keeps the source's canvas and pixel scale, so tools/embed-artwork.py places it with the unplugged
overlay's geometry. The cable's route is given in the card's photo units; each overlay converts it with that
geometry. Needs Pillow and NumPy:

    python3 tools/make-plugged.py
"""

import importlib.util
import pathlib

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('embed', ROOT / 'tools' / 'embed-artwork.py')
embed = importlib.util.module_from_spec(spec)
spec.loader.exec_module(embed)

# Per overlay, in its own pixels: the area repainted without the handle, the holster's recess (left, right, bottom,
# corner radius) with the rows above the handle that give its colour, the body's right edge, bottom and bottom corner
# radius there, the frame's columns either side of the recess that give its colour (the left one only by day: the
# right one crosses the handle's edge), the LED bar's box, the cable's exit under the body, and the cable's colour and
# highlight. The loop below the body goes.
SOURCES = {
    'charger_day.png': dict(zone=(437, 262, 497, 385), recess=(435, 484.5, 340, 10), recess_rows=(245, 262),
                            body=(493, 367, 22), frame=(432, None), led=(450, 195, 468, 242), exit=(418, 360),
                            colour=(38, 38, 41), light=(92, 92, 98)),
    'charger_night.png': dict(zone=(461, 246, 512, 340), recess=(459.5, 500, 294, 8), recess_rows=(226, 234),
                              body=(508.5, 325, 12), frame=(455, 503), led=(474, 185, 490, 245), exit=(437, 320),
                              colour=(30, 22, 16), light=(84, 60, 40)),
}
# The cable's route after the exit, in photo units (y from the frame's top, as the overlays' `at`): down the pillar,
# along its foot and under the car's bumper. It fades out over the last FADE units.
ROUTE = [(455.8, 340), (456.2, 362), (457.5, 373), (462, 378.6), (472, 380.6), (488, 382), (505, 383.6), (514, 384.5)]
WIDTH, FADE, SUPER = 3.0, 4.0, 4
LED_GREEN = np.array([70, 235, 110])


def geometry(name):
    """(units per pixel, x and y of pixel 0) of an overlay, as tools/embed-artwork.py places it."""
    alpha = Image.open(ROOT / 'images' / name).getchannel('A')
    left, top, right, bottom = alpha.getbbox()
    body_left, body_top, body_right, body_bottom = alpha.point(lambda v: 255 if v >= 64 else 0).getbbox()
    height, centre_x, top_y = embed.CHARGER_REFERENCE[name]
    unit = height / (body_bottom - body_top)
    x = centre_x - ((body_left + body_right) / 2 - left) * unit
    y = top_y - (body_top - top) * unit + embed.EXTRA_TOP
    return unit, x - left * unit, y - top * unit


def smooth(points, steps=24):
    """A Catmull-Rom curve through the points."""
    p = [points[0], *points, points[-1]]
    out = []
    for i in range(1, len(p) - 2):
        for s in range(steps):
            t = s / steps
            out.append(tuple(0.5 * (2 * p[i][k] + (-p[i - 1][k] + p[i + 1][k]) * t
                                    + (2 * p[i - 1][k] - 5 * p[i][k] + 4 * p[i + 1][k] - p[i + 2][k]) * t * t
                                    + (-p[i - 1][k] + 3 * p[i][k] - 3 * p[i + 1][k] + p[i + 2][k]) * t ** 3) for k in (0, 1)))
    return out + [points[-1]]


def stroke(size, path, width, fade, offset=(0, 0)):
    """An anti-aliased alpha mask of the path, fading out over its last fade pixels."""
    w, h = size
    mask = Image.new('L', (w * SUPER, h * SUPER))
    draw = ImageDraw.Draw(mask)
    fade_from = sum(np.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(path, path[1:])) - fade
    length = 0
    for (x0, y0), (x1, y1) in zip(path, path[1:]):
        length += np.hypot(x1 - x0, y1 - y0)
        level = 255 if length < fade_from else max(0, round(255 * (1 - (length - fade_from) / fade)))
        a = ((x0 + offset[0]) * SUPER, (y0 + offset[1]) * SUPER)
        b = ((x1 + offset[0]) * SUPER, (y1 + offset[1]) * SUPER)
        draw.line([a, b], fill=level, width=round(width * SUPER))
        r = width * SUPER / 2
        draw.ellipse([b[0] - r, b[1] - r, b[0] + r, b[1] + r], fill=level)
    return mask.resize(size, Image.LANCZOS)


def make(name):
    src = SOURCES[name]
    image = Image.open(ROOT / 'images' / name).convert('RGBA')
    unit, ox, oy = geometry(name)
    to_px = lambda u, v: ((u - ox) / unit, (v - oy) / unit)
    path_px = [src['exit'], *(to_px(u, v) for u, v in ROUTE)]
    bottom = max(y for _, y in path_px) + WIDTH / unit
    canvas = Image.new('RGBA', (image.width, max(image.height, int(bottom) + 8)))
    canvas.paste(image, (0, 0))
    rgba = np.asarray(canvas).copy()

    # The handle out of the holster: the recess and the frame below it are drawn again where it was.
    zx0, zy0, zx1, zy1 = src['zone']
    left, right, recess_bottom, r = src['recess']
    body_right, body_bottom, body_r = src['body']
    def rounded(x0, y0, x1, y1, radius):
        mask = Image.new('L', ((zx1 - zx0) * SUPER, (zy1 - zy0) * SUPER))
        ImageDraw.Draw(mask).rounded_rectangle([(x0 - zx0) * SUPER, (y0 - zy0) * SUPER, (x1 - zx0) * SUPER, (y1 - zy0) * SUPER], radius * SUPER, fill=255)
        return np.asarray(mask.resize((zx1 - zx0, zy1 - zy0), Image.LANCZOS), float)[..., None] / 255
    recess = rounded(left, zy0 - 40, right, recess_bottom, r)
    body = rounded(zx0 - 60, zy0 - 60, body_right, body_bottom, body_r)
    zone = rgba[zy0:zy1, zx0:zx1].astype(float)
    y0, y1 = src['recess_rows']
    inside = np.median(rgba[y0:y1, zx0:zx1, :3], 0)[None]
    # Below the recess's corners the frame is drawn again, blended across from the columns either side.
    fl, fr = src['frame']
    frame = np.broadcast_to(rgba[zy0:zy1, fl, None, :3].astype(float), zone[..., :3].shape)
    if fr is not None:
        t = ((np.arange(zx0, zx1) - fl) / (fr - fl)).clip(0, 1)[None, :, None]
        opaque = rgba[zy0:zy1, fr, None, 3:4] > 230
        frame = frame * (1 - t) + np.where(opaque, rgba[zy0:zy1, fr, None, :3], frame) * t
    low = (np.arange(zy0, zy1) >= recess_bottom - r)[:, None, None]
    around = np.where(low, frame, zone[..., :3])
    rgba[zy0:zy1, zx0:zx1, :3] = (recess * inside + (1 - recess) * around).clip(0, 255).astype(np.uint8)
    rgba[zy0:zy1, zx0:zx1, 3] = np.where(low[..., 0], body[..., 0] * 255, zone[..., 3]).astype(np.uint8)
    # The loop goes.
    rgba[body_bottom + 1:, :, 3] = 0

    # The LED bar turns green, by its brightness.
    x0, y0, x1, y1 = src['led']
    box = rgba[y0:y1, x0:x1, :3].astype(float)
    level = box.mean(2, keepdims=True) / 255
    lit = np.clip((level - 0.45) / 0.4, 0, 1)
    rgba[y0:y1, x0:x1, :3] = np.clip(box * (1 - lit) + LED_GREEN * level * 1.1 * lit, 0, 255).astype(np.uint8)

    # The cable, with a highlight along its upper side and a contact shadow where it lies on the floor.
    path = smooth(path_px)
    fade, width = FADE / unit, WIDTH / unit
    floor = [(x, y) for x, y in path if y >= to_px(0, 375)[1]]
    shadow = stroke(canvas.size, floor, width * 1.4, fade, (0, width * 0.45)).filter(ImageFilter.GaussianBlur(width * 0.5))
    cable = stroke(canvas.size, path, width, fade)
    light = stroke(canvas.size, path, width * 0.3, fade, (-width * 0.18, -width * 0.12)).filter(ImageFilter.GaussianBlur(width * 0.12))
    out = Image.new('RGBA', canvas.size)
    out.alpha_composite(Image.merge('RGBA', (*Image.new('RGB', canvas.size, (0, 0, 0)).split(), shadow.point(lambda v: v * 45 // 100))))
    out.alpha_composite(Image.merge('RGBA', (*Image.new('RGB', canvas.size, src['colour']).split(), cable)))
    out.alpha_composite(Image.merge('RGBA', (*Image.new('RGB', canvas.size, src['light']).split(), light.point(lambda v: v * 70 // 100))))
    out.alpha_composite(Image.fromarray(rgba))
    target = ROOT / 'images' / name.replace('.png', '_plugged.png')
    out.save(target)
    print(target.relative_to(ROOT), out.size)


for name in SOURCES:
    make(name)
