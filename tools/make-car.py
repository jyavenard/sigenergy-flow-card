#!/usr/bin/env python3
"""Make the car overlays for the card's car_image / car_image_night from two edited scenes.

Each scene is one of the images --sources writes (the card's photos without the charger, at
1676 x 469) with a different car in the garage, as an image generator returns it. The scene is aligned to
the card's photo (scale and offset, matched on the house outside the garage), refused if the
house still differs too much, and only the garage's inside is kept, with the same soft edge as
the empty-garage patch and cut at the pillar. The result is a small transparent AVIF in the
card's car frame (CAR_FRAME, which must match the card), so the scene's framing never reaches
the card:

    python3 tools/make-car.py car-day.png car-night.png cars/model-y-glacier-blue

writes cars/model-y-glacier-blue-day.avif, -night.avif and a -preview.png of both on the photo. With
--model and --colour, the car is also added to cars.json beside the overlays (the list of cars the card's
`car` option names), and the README's list of cars is rewritten from it.

    python3 tools/make-car.py --sources DIR

writes the images to edit, car-source-day.png and car-source-night.png, in DIR.
"""

import argparse
import importlib.util
import json
import pathlib
import re

import numpy as np
from PIL import Image, ImageFilter

spec = importlib.util.spec_from_file_location('embed', pathlib.Path(__file__).with_name('embed-artwork.py'))
embed = importlib.util.module_from_spec(spec)
spec.loader.exec_module(embed)

# The car frame (left, top, right, bottom) in the first photo's frame; the card's CAR_FRAME places it.
CAR_FRAME = (430, 198, 630, 390)
# The AC charger and its cable on the garage wall (left, top, right, bottom), left out in case the scene has it: the card
# draws its own.
CHARGER = (442, 238, 474, 328)
ROWS = 469
# The house outside this box (left, top, right, bottom) is what the scene is aligned on.
GARAGE_AREA = (420, 190, 645, 395)
SCALES = np.arange(0.97, 1.0301, 0.005)
SHIFT = 12
QUARTER = 4


def edges(image, area):
    grey = np.asarray(image.convert('L'), dtype=np.float32)
    return np.abs(np.diff(grey, axis=1))[area[:, 1:]]


def align(scene, photo):
    """The scene resampled onto the photo's frame, and the mean difference of their edges outside the garage."""
    area = np.ones((ROWS, embed.WIDTH), bool)
    area[:SHIFT * 2], area[-SHIFT * 2:], area[:, :SHIFT * 2], area[:, -SHIFT * 2:] = False, False, False, False
    left, top, right, bottom = GARAGE_AREA
    area[top:bottom, left:right] = False
    scene = scene.resize((embed.WIDTH, round(scene.height * embed.WIDTH / scene.width)), Image.LANCZOS)

    def scorer(k):
        """Scoring of a scale and offset (in full-size pixels) on the images shrunk [k] times."""
        size = (embed.WIDTH // k, ROWS // k)
        small, mask = scene.resize((size[0], round(scene.height / k)), Image.LANCZOS), area[::k, ::k][:size[1], :size[0]]
        target = edges(photo.resize(size, Image.LANCZOS) if k > 1 else photo, mask)
        cx, cy = size[0] / 2, size[1] / 2
        fit = lambda s, dx, dy: (small if k > 1 else scene).transform(size, Image.AFFINE, (s, 0, cx - s * cx + dx / k, 0, s, cy - s * cy + dy / k), Image.BICUBIC)
        return fit, lambda s, dx, dy: np.abs(edges(fit(s, dx, dy), mask) - target).mean()

    # Coarse search on a quarter-size image, in 4-pixel steps; then every pixel around the best, at full size.
    _, coarse = scorer(QUARTER)
    _, s0, x0, y0 = min((coarse(s, dx, dy), s, dx, dy) for s in SCALES for dx in range(-SHIFT, SHIFT + 1, QUARTER) for dy in range(-SHIFT, SHIFT + 1, QUARTER))
    fit, score = scorer(1)
    error, s, dx, dy = min((score(s, dx, dy), s, dx, dy) for s in (s0 - .0025, s0, s0 + .0025) for dx in range(x0 - 3, x0 + 4) for dy in range(y0 - 3, y0 + 4))
    return fit(s, dx, dy), error, (s, dx, dy)


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('day', nargs='?')
    parser.add_argument('night', nargs='?')
    parser.add_argument('out', nargs='?', help='output path without the -day.avif / -night.avif suffix')
    parser.add_argument('--max-error', type=float, default=12, help='refuse a scene whose house differs more than this after alignment')
    parser.add_argument('--sources', metavar='DIR', help='write the images to edit in DIR instead')
    parser.add_argument('--model', help='the car\'s model, e.g. "BYD Atto 3", to add it to cars.json')
    parser.add_argument('--colour', help='the car\'s colour, with --model')
    args = parser.parse_args()
    if args.sources:
        sources = pathlib.Path(args.sources)
        sources.mkdir(parents=True, exist_ok=True)
        for time in ('day', 'night'):
            embed.place(f'house_{time}.png').crop((0, embed.EXTRA_TOP, embed.WIDTH, embed.EXTRA_TOP + ROWS)).save(sources / f'car-source-{time}.png')
        print(f'wrote car-source-day.png and car-source-night.png in {sources}')
        return
    if not args.out:
        parser.error('give the day and night scenes and the output path, or --sources DIR')
    out = pathlib.Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    previews = []
    for time, path in (('day', args.day), ('night', args.night)):
        photo = embed.place(f'house_{time}.png').crop((0, embed.EXTRA_TOP, embed.WIDTH, embed.EXTRA_TOP + ROWS))
        scene, error, (s, dx, dy) = align(Image.open(path).convert('RGB'), photo)
        print(f'{time}: scale {s:.4f}, offset {dx:+d} {dy:+d} px, house difference {error:.1f}')
        if error > args.max_error:
            raise SystemExit(f'{path}: the house differs too much from the card\'s photo ({error:.1f} > {args.max_error}); was it reframed or redrawn?')
        mask, empty = embed.garage_mask(f'garage_{time}.png')
        mask = mask[:ROWS].copy()
        charger = np.zeros(mask.shape, np.uint8)
        charger[CHARGER[1]:CHARGER[3], CHARGER[0]:CHARGER[2]] = 255
        charger = np.asarray(Image.fromarray(charger).filter(ImageFilter.GaussianBlur(1.5)), dtype=np.float32) / 255
        alpha = Image.fromarray((mask * (1 - charger)).astype(np.uint8))
        scene.putalpha(alpha)
        car = scene.crop(CAR_FRAME)
        car.save(out.with_name(f'{out.name}-{time}.avif'), 'AVIF', quality=embed.OVERLAY_QUALITY, speed=embed.SPEED)
        # As the card draws it: the photo, the empty-garage patch, then the car.
        preview = photo.convert('RGBA')
        empty.putalpha(alpha)
        preview.alpha_composite(empty.crop((0, 0, embed.WIDTH, ROWS)))
        preview.alpha_composite(car, CAR_FRAME[:2])
        previews.append(preview.crop((CAR_FRAME[0] - 60, CAR_FRAME[1] - 30, CAR_FRAME[2] + 60, CAR_FRAME[3] + 30)))
    sheet = Image.new('RGB', (previews[0].width * 2 + 10, previews[0].height), 'white')
    for i, preview in enumerate(previews):
        sheet.paste(preview.convert('RGB'), (i * (preview.width + 10), 0))
    sheet = sheet.resize((sheet.width * 2, sheet.height * 2), Image.LANCZOS)
    sheet.save(out.with_name(f'{out.name}-preview.png'))
    print(f'wrote {out.name}-day.avif, {out.name}-night.avif and {out.name}-preview.png in {out.parent}')
    if args.model:
        catalogue(out.parent / 'cars.json', {'id': out.name, 'model': args.model, 'colour': args.colour or ''})


def catalogue(path, car):
    """Adds [car] to the cars.json at [path], or updates its entry, and rewrites the README's list from it."""
    cars = json.loads(path.read_text()) if path.exists() else []
    known = next((i for i, c in enumerate(cars) if c['id'] == car['id']), None)
    if known is None:
        cars.append(car)
    else:
        cars[known] = car
    path.write_text('[\n' + ',\n'.join('  ' + json.dumps(c, ensure_ascii=False) for c in cars) + '\n]\n')
    print(f'{"added" if known is None else "updated"} {car["id"]} in {path}')
    readme = embed.ROOT / 'README.md'
    lines = '\n'.join(f'- `{c["id"]}`: {c["model"]}, {c["colour"]}' for c in cars)
    text, count = re.subn(r'(<!-- cars:[^\n]*-->\n).*?(\n<!-- end cars -->)', lambda m: m.group(1) + lines + m.group(2), readme.read_text(), flags=re.S)
    if count:
        readme.write_text(text)
        print(f'rewrote the list of cars in {readme.name}')


if __name__ == '__main__':
    main()
