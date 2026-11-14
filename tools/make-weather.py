#!/usr/bin/env python3
"""Make the scene's weather photos, which the card shows in place of house_day.png and house_night.png, from images/weather/.

Each condition (Home Assistant's weather state) has renders of the day photo, <condition>.jpg with the car and
<condition>-empty.jpg without it, and of the night photo, <condition>-night.jpg, as an image generator returned them.
Each is aligned to the card's photo (as make-car.py aligns a car's scene) and refused if the house differs too much.
The generator drew the charger the card draws as an overlay, so it is painted out with the photo's own wall, recoloured
to the render. A render without its -empty version (the night's: the garage is lit by its own lamp whatever the
weather) uses the card's empty garage, garage_<day|night>.png. Then, in weather/:

    <condition>.avif         the photo, resampled and extended like house_day.png (embed-artwork.py)
    <condition>-garage.avif  the empty garage's inside, which hides the car (WEATHER_GARAGE's box in the card)
    <condition>-double.avif  the double garage's overlay (make-garage.py, DOUBLE_GARAGE's box)
    <condition>-car.avif     the photo's car in the car frame, for the double garage's new bay

and weather/preview.jpg (not committed), every condition as the card draws it: empty, with the car, and with the double garage.

    python3 tools/make-weather.py [condition ...]
"""

import argparse
import importlib.util
import io
import pathlib
import re
import base64

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), pathlib.Path(__file__).with_name(f'{name}.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


embed, car, garage = load('embed-artwork'), load('make-car'), load('make-garage')
ROOT = embed.ROOT
ROWS = car.ROWS
# The empty garage's patch, in the first photo's frame (left, top, right, bottom): GARAGE_BOX as far as the pillar.
GARAGE = (embed.GARAGE_BOX[0], embed.GARAGE_BOX[1], 626, embed.GARAGE_BOX[2])
# The double garage's overlay: DOUBLE_GARAGE's box in the card, in the first photo's frame.
DOUBLE = (245, 68 - embed.EXTRA_TOP, 245 + 319, 68 - embed.EXTRA_TOP + 402)
# The charger and its cable on the garage wall, and the wall around it its replacement is matched on.
CHARGER, RING = car.CHARGER, 6
# The band above the photo: its colour from the photo's top rows, smoothed across this many units.
SKY_ROWS, SKY_BLUR = 24, 40
MAX_ERROR = 16


def place(scene, time):
    """The render placed like house_<time>.png (embed.place(), the same size and framing), before any correction."""
    scale, dx, dy = embed.REGISTRATION[f'house_{time}.png']
    photo = scene.resize((round(scene.width / scale), round(scene.height / scale)), Image.LANCZOS)
    scale, pad = scene.width / photo.width, 8
    padded = Image.fromarray(np.pad(np.asarray(photo), ((pad, pad), (pad, pad), (0, 0)), mode='edge'))
    return padded.transform((embed.WIDTH, embed.ROWS), Image.AFFINE, (1, 0, dx / scale + pad, 0, 1, dy / scale - embed.EXTRA_TOP + pad), Image.BICUBIC)


def corrected(image, fit):
    """[image] (the card's frame) with make-car.py's fit of its photo rows applied."""
    sx, sy, dx, dy = fit
    cx, cy = embed.WIDTH / 2, ROWS / 2 + embed.EXTRA_TOP
    return image.transform(image.size, Image.AFFINE, (sx, 0, cx - sx * cx + dx, 0, sy, cy - sy * cy + dy), Image.BICUBIC)


def without_charger(image, photo):
    """[image] (the card's frame) with the charger painted out: the photo's wall there, matched to the render's colours
    on the wall around it, channel by channel."""
    a = np.asarray(image.convert('RGB'), np.float32).copy()
    p = np.asarray(photo.convert('RGB'), np.float32)
    x0, y0, x1, y1 = CHARGER
    y0, y1 = y0 + embed.EXTRA_TOP, y1 + embed.EXTRA_TOP
    ring = np.zeros(a.shape[:2], bool)
    ring[y0 - RING:y1 + RING, x0 - RING:x1] = True
    ring[y0:y1, x0:x1] = False
    for c in range(3):
        gain, offset = np.polyfit(p[ring, c], a[ring, c], 1)
        a[y0:y1, x0:x1, c] = p[y0:y1, x0:x1, c] * gain + offset
    mask = np.zeros(a.shape[:2], np.uint8)
    mask[y0:y1, x0:x1] = 255
    mask = np.asarray(Image.fromarray(mask).filter(ImageFilter.GaussianBlur(1.5)), np.float32)[..., None] / 255
    out = np.asarray(image.convert('RGB'), np.float32) * (1 - mask) + np.clip(a, 0, 255) * mask
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def garage_patch(empty, photo, time):
    """embed.garage_mask(), for an empty render and its photo (both ROWS rows): the garage's inside where they differ."""
    pillar, extra = embed.GARAGES[f'garage_{time}.png'][1:]
    diff = np.abs(np.asarray(empty, np.int16) - np.asarray(photo, np.int16)).max(2) > embed.GARAGE_DIFF
    left, top, bottom = embed.GARAGE_BOX
    mask = np.zeros(diff.shape, np.uint8)
    mask[top:bottom, left:pillar] = diff[top:bottom, left:pillar] * 255
    area = Image.fromarray(mask).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(11)).filter(ImageFilter.MaxFilter(11))
    mask = np.asarray(area.filter(ImageFilter.GaussianBlur(1.5))).copy()
    mask[:, pillar:] = 0
    mask[:, pillar - 2:pillar] = np.asarray(area)[:, pillar - 2:pillar]
    for x0, y0, x1, y1 in extra:
        mask[y0:y1, x0:x1] = 255
    return mask


def car_mask(patch, time):
    """make-car.py's mask: the garage's inside as far as the pillar, without the charger."""
    pillar = embed.GARAGES[f'garage_{time}.png'][1]
    solid = Image.fromarray(((patch > 128) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(41)).filter(ImageFilter.MinFilter(41))
    mask = np.maximum(patch, np.asarray(solid.filter(ImageFilter.GaussianBlur(1.5))))
    mask[:, pillar:] = patch[:, pillar:]
    charger = np.zeros(mask.shape, np.uint8)
    charger[CHARGER[1]:CHARGER[3], CHARGER[0]:CHARGER[2]] = 255
    charger = np.asarray(Image.fromarray(charger).filter(ImageFilter.GaussianBlur(1.5)), np.float32) / 255
    return (mask * (1 - charger)).astype(np.uint8)


def double(src, time, day):
    """make-garage.py's overlay for [src] (the photo with its garage empty, ROWS rows), in DOUBLE's box. The night's roof
    is tiled from [day]'s, recoloured."""
    matrix = garage.transform()
    image = garage.roof(garage.bays(src, time, matrix), src, day if time == 'night' else src, time, matrix)
    diff = np.abs(np.asarray(image, np.int16) - np.asarray(src.convert('RGB'), np.int16)).max(2) > garage.DIFF
    mask = Image.fromarray(diff.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.5))
    outside = np.asarray(mask).copy()
    outside[DOUBLE[1]:DOUBLE[3], DOUBLE[0]:DOUBLE[2]] = 0
    if outside.max() > 128:
        print(f'  warning: the double garage differs outside its box ({(outside > 128).sum()} pixels)')
    overlay = image.convert('RGBA')
    overlay.putalpha(mask)
    return overlay.crop(DOUBLE)


def artwork(name):
    """An overlay embedded in the card, with its box in the first photo's frame."""
    text = (ROOT / 'sigenergy-flow-card.js').read_text()
    m = re.search(rf"'{re.escape(name)}': {{ size: \[([\d.]+), ([\d.]+)\], at: \[([\d.]+), ([\d.]+)\], href: 'data:image/avif;base64,([^']+)'", text)
    w, h, x, y = map(float, m.groups()[:4])
    image = Image.open(io.BytesIO(base64.b64decode(m.group(5)))).convert('RGBA')
    return image.resize((round(w), round(h)), Image.LANCZOS), (round(x), round(y - embed.EXTRA_TOP))


def extend(photo):
    """embed.extend(), with a band above that a cloudy sky doesn't streak: the top rows' colour, smoothed across the image
    and fading up into the sky's mean colour."""
    canvas = embed.extend(photo)
    rows = np.asarray(photo, np.float32)[:SKY_ROWS].mean(0)
    kernel = np.exp(-0.5 * (np.arange(-3 * SKY_BLUR, 3 * SKY_BLUR + 1) / SKY_BLUR) ** 2)
    padded = np.pad(rows, ((3 * SKY_BLUR, 3 * SKY_BLUR), (0, 0)), mode='edge')
    profile = np.stack([np.convolve(padded[:, c], kernel / kernel.sum(), 'valid') for c in range(3)], 1)
    n = embed.TOP + embed.FEATHER
    t = (np.arange(n, dtype=np.float32) / (n - 1))[:, None, None] ** 1.5
    band = Image.fromarray(np.clip(profile.mean(0) * (1 - t) + profile[None] * t, 0, 255).astype(np.uint8))
    mask = Image.new('L', (photo.width, n), 0)
    for i in range(embed.FEATHER):
        mask.paste(round(255 * (embed.FEATHER - i) / (embed.FEATHER + 1)), (0, embed.TOP + i, photo.width, embed.TOP + i + 1))
    mask.paste(255, (0, 0, photo.width, embed.TOP))
    canvas.paste(band, (0, 0), mask)
    return canvas


def save(image, path, quality):
    image.save(path, 'AVIF', quality=quality, speed=embed.SPEED)
    return path.stat().st_size // 1024


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('conditions', nargs='*', help='the conditions to make (all in images/weather by default)')
    args = parser.parse_args()
    sources = ROOT / 'images' / 'weather'
    out = ROOT / 'weather'
    out.mkdir(exist_ok=True)
    conditions = args.conditions or sorted(p.stem for p in sources.glob('*.jpg') if not p.stem.endswith('-empty'))
    day_garage = garage.source('day')
    previews = []
    for condition in conditions:
        time = 'night' if condition.endswith('-night') else 'day'
        reference = embed.place(f'house_{time}.png').convert('RGB')
        photo_rows = reference.crop((0, embed.EXTRA_TOP, embed.WIDTH, embed.EXTRA_TOP + ROWS))
        (charger, charger_at), (plugged, plugged_at) = artwork(f'charger_{time}.png'), artwork(f'charger_{time}_plugged.png')
        frames = {}
        for kind, path in (('car', sources / f'{condition}.jpg'), ('empty', sources / f'{condition}-empty.jpg')):
            if not path.exists():
                continue
            scene = place(Image.open(path).convert('RGB'), time)
            _, error, fit = car.align(scene.crop((0, embed.EXTRA_TOP, embed.WIDTH, embed.EXTRA_TOP + ROWS)), photo_rows)
            print(f'{path.name}: scale {fit[0]:.4f}/{fit[1]:.4f}, offset {fit[2]:+d} {fit[3]:+d} px, house difference {error:.1f}')
            if error > MAX_ERROR:
                raise SystemExit(f'{path}: the house differs too much from the card\'s photo ({error:.1f} > {MAX_ERROR})')
            frames[kind] = without_charger(corrected(scene, fit), reference)
        photo = frames['car']
        rows = lambda image: image.crop((0, embed.EXTRA_TOP, embed.WIDTH, embed.EXTRA_TOP + ROWS))
        if 'empty' in frames:
            patch = garage_patch(np.asarray(rows(frames['empty'])), np.asarray(rows(photo)), time)
            empty = rows(frames['empty']).convert('RGBA')
        else:
            patch, empty = embed.garage_mask(f'garage_{time}.png')
            patch, empty = patch[:ROWS], empty.crop((0, 0, embed.WIDTH, ROWS)).convert('RGBA')
        empty.putalpha(Image.fromarray(patch))
        sizes = [save(extend(photo), out / f'{condition}.avif', embed.QUALITY),
                 save(empty.crop(GARAGE), out / f'{condition}-garage.avif', embed.OVERLAY_QUALITY)]
        src = rows(photo).convert('RGBA')
        src.alpha_composite(empty)
        bay = double(src, time, day_garage)
        sizes.append(save(bay, out / f'{condition}-double.avif', embed.OVERLAY_QUALITY))
        scene = rows(photo).convert('RGBA')
        scene.putalpha(Image.fromarray(car_mask(patch, time)))
        car_image = scene.crop(car.CAR_FRAME)
        sizes.append(save(car_image, out / f'{condition}-car.avif', embed.OVERLAY_QUALITY))
        print(f'  {condition}: {" + ".join(f"{s} KB" for s in sizes)}')
        # As the card draws it: the empty garage with the charger, the car plugged in, and the double garage.
        a = src.copy()
        a.alpha_composite(charger, charger_at)
        b = rows(photo).convert('RGBA')
        b.alpha_composite(plugged, plugged_at)
        c = rows(photo).convert('RGBA')
        c.alpha_composite(bay, DOUBLE[:2])
        left = Image.new('RGBA', c.size)
        left.alpha_composite(car_image, car.CAR_FRAME[:2])
        c.alpha_composite(garage.warp(left, garage.transform()))
        c.alpha_composite(charger, charger_at)
        previews.append((condition, [image.crop((200, 0, 1300, ROWS)).convert('RGB') for image in (a, b, c)]))
    w, h = 1100, ROWS
    sheet = Image.new('RGB', (3 * w + 20, len(previews) * (h + 24)), 'white')
    draw = ImageDraw.Draw(sheet)
    for i, (condition, images) in enumerate(previews):
        draw.text((4, i * (h + 24) + 4), condition, fill='black')
        for j, image in enumerate(images):
            sheet.paste(image, (j * (w + 10), i * (h + 24) + 22))
    sheet.save(out / 'preview.jpg', quality=85)
    print(f'wrote {len(conditions)} conditions and preview.jpg in {out}')


if __name__ == '__main__':
    main()
