#!/usr/bin/env python3
"""Make the double garage's overlays for the card's `garage: double` from the card's own photos.

A second bay is added to the left of the garage: the existing bay, moved one bay along the front in perspective (the
fascia and the apron's curb run on towards their vanishing point), with the existing left wall as the wall between the
two. The main roof is lengthened over it, with its tiles, ridge and left edge, and the solar panels extended by four
columns. Nothing is generated: every pixel comes from the card's photos, so day and night match.

    python3 tools/make-garage.py garage/double

writes garage/double-day.avif and garage/double-night.avif (the changed area only, transparent elsewhere) and
garage/double-preview.png (the garage with a car in each bay), and prints the constants the card needs: where the
overlay goes, and the transform that draws a car in the new bay.
"""

import argparse
import importlib.util
import pathlib

import numpy as np
from PIL import Image, ImageFilter

spec = importlib.util.spec_from_file_location('embed', pathlib.Path(__file__).with_name('embed-artwork.py'))
embed = importlib.util.module_from_spec(spec)
spec.loader.exec_module(embed)

ROWS = 469
# make-car.py's CAR_FRAME origin: where the cars' overlays go, in the first photo's frame.
CAR = (430, 198)
# The existing bay's front: its left wall's corner and right pillar's edge, at the fascia's underside and the apron's
# curb. The new bay is the existing one moved so that its pillar's edge lands on the left wall's corner.
TL, TR, BR, BL = (431, 197), (617, 210), (617, 380), (431, 349)
# What is copied: the bay up to its pillar's inner edge, with its gutter, floor and the paving in front.
COPY = (395, 166, 617, 460)
# The back wall's base, below which is floor; the paving, below which the copy fades into the existing paving; the curb.
floor_y = lambda x: 330 - 0.1917 * (x - 472)
PAVING = 352
curb_y = lambda x: 349 + 0.167 * (x - 431)
# The existing left wall, kept in front of the new bay's floor; the downpipe on it.
WALL = (431, 185, 473, 345)
PIPE = (429, 437)
# The roof: its tile columns run parallel to its left edge, so u = x + K * (y - RIDGE) is constant along them.
K, RIDGE, CAP = 1.05, 33, 41
EDGE, SHIFT = 550, 161                  # the roof's left edge (in u) and how far it moves: over the new bay's left wall
BAND_U, BAND_V = (561, 88), (42, 12)    # plain tiles under the ridge: 8 columns (11 each) by one row (12)
PANEL_U, PITCH, ADDED = 566, 43, 4      # the panels' left column, the columns' pitch (in u), and the columns added
PANEL_TOP, PANEL_TAPER = 61, 0.0314     # the panels' level top edge; how much shorter each column further left is
# Where the patch differs from the photo by more than this, it is kept.
DIFF = 6


def transform():
    """The new bay's transform: moving along the front, in the image, slides points towards the front's vanishing point."""
    top, bottom = (TR[1] - TL[1]) / (TR[0] - TL[0]), (BR[1] - BL[1]) / (BR[0] - BL[0])
    vx = TL[0] - (BL[1] - TL[1]) / (bottom - top)
    vanishing = np.array([vx, TL[1] + top * (vx - TL[0]), 1.0])
    axis = np.array([1.0, 0, -vx])
    p = np.array([*TR, 1.0])
    mu = (p[0] - TL[0]) / ((axis @ p) * (TL[0] - vx))
    return np.eye(3) + mu * np.outer(vanishing, axis)


def warp(image, matrix):
    inverse = np.linalg.inv(matrix)
    inverse /= inverse[2, 2]
    return image.transform(image.size, Image.PERSPECTIVE, tuple(inverse.flatten()[:8]), Image.BICUBIC)


def sky_moved(moved, sky_from, sky_to):
    """[moved] (pixels copied from elsewhere) with the sky it brought along changed to the sky where it goes: pixels close to
    [sky_from] (the sky beside the copy's source) are shifted by [sky_to] - [sky_from]."""
    w = np.clip(1 - (np.abs(moved - sky_from).max(-1) - 4) / 16, 0, 1)[..., None]
    return moved + (sky_to - sky_from) * w


def bilinear(image, x, y):
    x, y = np.clip(x, 0, image.shape[1] - 2), np.clip(y, 0, image.shape[0] - 2)
    x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int)
    fx, fy = (x - x0)[..., None], (y - y0)[..., None]
    return (image[y0, x0] * (1 - fx) * (1 - fy) + image[y0, x0 + 1] * fx * (1 - fy)
            + image[y0 + 1, x0] * (1 - fx) * fy + image[y0 + 1, x0 + 1] * fx * fy)


def source(time):
    """The card's photo with the garage empty, in the first photo's frame."""
    photo = embed.place(f'house_{time}.png').crop((0, embed.EXTRA_TOP, embed.WIDTH, embed.EXTRA_TOP + ROWS)).convert('RGBA')
    patch, empty = embed.garage_mask(f'garage_{time}.png')
    empty.putalpha(Image.fromarray(patch))
    photo.alpha_composite(empty.crop((0, 0, embed.WIDTH, ROWS)))
    return photo


def bays(src, time, matrix):
    """The photo with the second bay added."""
    a = np.asarray(src).copy()
    ys, xs = np.mgrid[0:ROWS, 0:embed.WIDTH]
    # The leaves and planting bed at the pillar's base: covered with the floor beside them, each row's tone matched to
    # the floor just left of them, below the back wall's base only.
    f = a[..., :3].astype(np.float32)
    for x in range(588, 617):
        rows = slice(max(round(floor_y(x)) + 4, 318), 387)
        offset = f[rows, 584:588].mean(1) - f[rows, 560:564].mean(1)
        w = min(1, (x - 587) / 6)
        f[rows, x] = (1 - w) * f[rows, x] + w * (f[rows, x - 28] + offset)
    a[..., :3] = np.clip(f, 0, 255).astype(np.uint8)
    x0, y0, x1, y1 = COPY
    a[..., 3] = 0
    a[y0:y1, x0:x1, 3] = 255
    layer = np.asarray(warp(Image.fromarray(a), matrix)).astype(np.float32)
    # Soft edges: into the trees on the left and the sky above, and below the curb into the existing paving.
    alpha = layer[..., 3] / 255
    inside = alpha > 0.5
    left = np.where(inside.any(1), inside.argmax(1), embed.WIDTH)[:, None]
    top = np.where(inside.any(0), inside.argmax(0), ROWS)[None, :]
    bottom = np.where(inside.any(0), ROWS - inside[::-1].argmax(0), 0)[None, :]
    m = alpha * np.clip((xs - left + 1) / 20, 0, 1) * np.clip((ys - top + 1) / 3, 0, 1)
    m *= 1 - (ys >= PAVING) * np.clip((ys - PAVING) / np.maximum(bottom - PAVING, 1), 0, 1)
    m *= 1 - (ys >= PAVING) * np.clip((xs - (TL[0] - 40)) / 40, 0, 1)
    layer[..., 3] = m * 255
    out = src.copy()
    out.alpha_composite(Image.fromarray(layer.astype(np.uint8)))
    # Dark nicks where the two aprons' curbs meet: filled from the curb 12 units further left, along its line.
    d = np.asarray(out).copy()
    lum = d[..., :3].mean(2)
    for x in range(400, 440):
        c = round(curb_y(x))
        ref = np.median([lum[round(curb_y(x - k)) + dy, x - k] for k in range(12, 20) for dy in (-1, 0, 1)])
        for y in range(c - 2, c + 3):
            if lum[y, x] < ref - 35:
                d[y, x] = d[y + round(curb_y(x - 12)) - c, x - 12]
    out = Image.fromarray(d)
    # The existing left wall stays in front: it hides the new bay's floor beside it.
    out.alpha_composite(src.crop(WALL), WALL[:2])
    if time == 'night':
        # Its downpipe glowed from the uplit tree behind it, which is gone between the two bays.
        d = np.asarray(out).astype(np.float32)
        rows, (p0, p1) = slice(WALL[1], WALL[3]), PIPE
        level = d[rows, p1:p1 + 4, :3].mean((1, 2))[:, None, None] / np.maximum(d[rows, p0:p1, :3].mean(2, keepdims=True), 1)
        d[rows, p0:p1, :3] *= np.clip(level, 0.15, 1) * 0.6
        out = Image.fromarray(np.clip(d, 0, 255).astype(np.uint8))
    return out


def roof(image, src, day, time, matrix):
    """The main roof lengthened over the new bay, its panels extended."""
    out = np.asarray(image.convert('RGB'), np.float32).copy()
    src = np.asarray(src.convert('RGB'), np.float32)
    day = np.asarray(day.convert('RGB'), np.float32)
    ys, xs = np.mgrid[0:ROWS, 0:embed.WIDTH].astype(np.float32)
    u = xs + K * (ys - RIDGE)
    # The tiles stop at the gutters: the new bay's (the copy's gutter row, through the bay's transform), then the old one.
    inverse = np.linalg.inv(matrix)
    def gutter(x):
        p = inverse @ np.array([x, 160.0, 1])
        q = matrix @ np.array([p[0] / p[2], 171.0, 1])
        return q[1] / q[2]
    eave = np.where(xs < 421, np.array([gutter(x) for x in range(embed.WIDTH)], np.float32)[None, :] - 1, 157 + 0.12 * (xs - 420))
    # Tiles: the band repeated along the roof's rows and columns. The night photo's panels reach almost to the ridge, so
    # night uses the day's tiles, recoloured to the night's plain tiles (under the ridge cap and along the left edge).
    field = (u >= EDGE - SHIFT) & (u < EDGE + 12) & (ys >= CAP) & (ys < eave)
    ub = BAND_U[0] + np.mod(u - BAND_U[0], BAND_U[1])
    vb = BAND_V[0] + np.mod(ys - BAND_V[0], BAND_V[1])
    tiles = bilinear(day, ub - K * (vb - RIDGE), vb)
    if time == 'night':
        plain = ((ys >= 41) & (ys < 47) & (xs >= 560) & (xs < 660)) | ((u >= EDGE + 2) & (u < EDGE + 9) & (ys >= 60) & (ys < 150))
        d, n = day[plain], src[plain]
        tiles = (tiles - d.mean(0)) / d.std(0) * n.std(0) + n.mean(0)
    w = field * np.clip((EDGE + 12 - u) / 6, 0, 1)
    out = out * (1 - w[..., None]) + tiles * w[..., None]
    # Panels: the existing left column (with the tiles above it) repeated further left. Their top edge is level, but
    # their rows' frame drops to the right: each column further left is a little shorter, from its top.
    for k in range(1, ADDED + 1):
        strip = (u >= PANEL_U - k * PITCH) & (u < PANEL_U - (k - 1) * PITCH) & (ys >= CAP) & (ys < eave)
        f = 1 - PANEL_TAPER * k
        moved = bilinear(src, xs + k * PITCH, np.where(ys >= PANEL_TOP, PANEL_TOP + (ys - PANEL_TOP) / f, ys))
        out[strip] = moved[strip]
    # The ridge cap, continued along its row.
    ridge = (xs >= EDGE - SHIFT - 2) & (xs < EDGE + 6) & (ys >= RIDGE - 3) & (ys < CAP)
    cap_x = 556 + np.mod(xs - 556, 88)
    above = np.full_like(ys, RIDGE - 6)
    out[ridge] = sky_moved(bilinear(src, cap_x, ys), bilinear(src, cap_x, above), bilinear(src, xs, above))[ridge]
    # The roof's left edge (its board), moved along the rows.
    edge = (u >= EDGE - 5) & (u < EDGE + 1) & (ys >= RIDGE - 3) & (ys < 158)
    moved = np.zeros_like(edge)
    moved[:, :-SHIFT] = edge[:, SHIFT:]
    out[moved] = sky_moved(bilinear(src, xs + SHIFT, ys), bilinear(src, xs + SHIFT - 6, ys), bilinear(src, xs - 6, ys))[moved]
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def affine(matrix):
    """The affine transform closest to [matrix] over a car's overlay, and its largest error: SVG has no perspective."""
    gx, gy = np.meshgrid(np.linspace(CAR[0], CAR[0] + 200, 9), np.linspace(CAR[1], CAR[1] + 192, 9))
    points = np.stack([gx.ravel(), gy.ravel(), np.ones(gx.size)])
    mapped = matrix @ points
    mapped = mapped[:2] / mapped[2]
    fit, *_ = np.linalg.lstsq(points.T, mapped.T, rcond=None)
    error = np.abs(points.T @ fit - mapped.T).max()
    return fit.T, error


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('out', help='output path without the -day.avif / -night.avif suffix')
    parser.add_argument('--cars', nargs=2, metavar=('RIGHT', 'LEFT'), default=('byd-atto3-orange', 'model-y-glacier-blue'),
                        help='the cars in the preview, from cars/')
    args = parser.parse_args()
    out = pathlib.Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    matrix = transform()
    fit, error = affine(matrix)
    day = source('day')
    results = {}
    for time in ('day', 'night'):
        src = day if time == 'day' else source('night')
        results[time] = (src, roof(bays(src, time, matrix), src, day, time, matrix))
    # The overlay: what differs from the photo, in one box for day and night.
    masks = {}
    for time, (src, image) in results.items():
        diff = np.abs(np.asarray(image, np.int16) - np.asarray(src.convert('RGB'), np.int16)).max(2) > DIFF
        masks[time] = Image.fromarray(diff.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.5))
    boxes = [mask.getbbox() for mask in masks.values()]
    box = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
    previews = []
    for time, (src, image) in results.items():
        overlay = image.convert('RGBA')
        overlay.putalpha(masks[time])
        overlay.crop(box).save(out.with_name(f'{out.name}-{time}.avif'), 'AVIF', quality=embed.OVERLAY_QUALITY, speed=embed.SPEED)
        # As the card draws it: the photo, the overlay, the car in each bay.
        preview = src.copy()
        preview.alpha_composite(overlay.crop(box), box[:2])
        right, left = (Image.open(embed.ROOT / 'cars' / f'{car}-{time}.avif').convert('RGBA') for car in args.cars)
        preview.alpha_composite(right, CAR)
        car = Image.new('RGBA', preview.size)
        car.alpha_composite(left, CAR)
        preview.alpha_composite(warp(car, matrix))
        previews.append(preview.convert('RGB').crop((box[0] - 60, box[1], box[2] + 120, box[3])))
    sheet = Image.new('RGB', (previews[0].width, previews[0].height * 2 + 10), 'white')
    for i, preview in enumerate(previews):
        sheet.paste(preview, (0, i * (preview.height + 10)))
    sheet.save(out.with_name(f'{out.name}-preview.png'))
    print(f'wrote {out.name}-day.avif, {out.name}-night.avif and {out.name}-preview.png in {out.parent}')
    # In ARTWORK's coordinates, EXTRA_TOP lower (the card draws them PHOTO.top lower again): y = y' - s in, y' = y + s out.
    (a, c, e), (b, d, f) = fit
    s = embed.EXTRA_TOP
    print(f'card: DOUBLE_GARAGE = {{ at: [{box[0]}, {box[1] + s}], size: [{box[2] - box[0]}, {box[3] - box[1]}], '
          f'car: [{a:.5f}, {b:.5f}, {c:.5f}, {d:.5f}, {e - c * s:.3f}, {f + s * (1 - d):.3f}] }}')
    print(f'the car\'s affine transform is off its perspective by at most {error:.2f} units')


if __name__ == '__main__':
    main()
