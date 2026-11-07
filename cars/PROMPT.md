# Prompt for a new car

Attach `car-source-day.png` and `car-source-night.png` (from `python3 tools/make-car.py --sources DIR`), replace `<COLOUR>` and `<BRAND MODEL>`, and paste the text below. A new chat for each car works best; if the result is broken, try one image per request.

```
# Sigenergy Flow Card — Replace the Car

## Task
Edit the two attached images (daytime and nighttime). This is an image EDIT, not a new image. Do not regenerate or reinterpret the house.

Replace the car parked in the garage with a <COLOUR> <BRAND MODEL>. Change nothing else.

## Deliverables
Two PNG files, each exactly 1676 × 469 pixels:
1. car-day.png — the daytime image with the new car.
2. car-night.png — the nighttime image with the new car.

## The new car
- Park it exactly where the current car is: same spot, same angle (front facing out of the garage, towards the left of the image), same distance from the garage opening.
- Same size as the current car, to scale with the garage. It must fit inside the garage: nothing may stick out past the garage's right pillar or over the plants in front of it.
- Same camera perspective as the current car.
- Give it a realistic shadow on the garage floor and a reflection on the paving, like the current car has.
- Daytime: lit like the rest of the daytime scene.
- Nighttime: lit by the garage lights like the current car. Its daytime running lights may glow like the current car's; no other new lights.
- No charging cable, no people, no objects in or on the car.

## Do not change anything else
- Same framing, camera angle and image size. Do not crop, zoom, extend or shift the image.
- Do not move, resize or redraw the house, garage walls, pillar, roof, solar panels, windows, battery, gateway, plants, trees, sky or paving.
- Keep the garage's back wall, floor and lights as they are, except where the new car covers them.
- Do not add an EV charger, text, labels, arrows or lines.

## Check before delivering
Put each result next to its original. The only difference must be the car and its shadow/reflection. If anything else moved or changed, redo the edit.
```

Then make the overlays with `python3 tools/make-car.py car-day.png car-night.png cars/<name>` and check the preview.
