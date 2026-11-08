# Prompt for a new car

Attach, in this order, `car-source-day.png` and `car-source-night.png` (from `python3 tools/make-car.py --sources DIR`) and a photo of the real car in its colour. Replace `{CAR_MODEL}` and `{CAR_COLOUR}` and paste the text below.

- Use a new chat for each car: earlier images and requests leak into later ones.
- If the result is broken, ask for one image per request, day first.
- ChatGPT and Gemini both work. Gemini returns other sizes (1952 × 544); the tool handles that.

```
Edit the first two attached images (daytime and nighttime). This is an image EDIT, not a new image. Keep the camera, framing and image size exactly as they are, and the house in the same place at the same size. Keep the image's proportions: work at 1676 × 469 throughout, and never render another shape and then squash, stretch or resize it to fit. Fine detail outside the garage may differ; only the garage area is used.

Replace the car parked in the garage with a {CAR_MODEL} in {CAR_COLOUR}. The third attachment is a reference photo of the real car: copy its shape, headlights, front bumper, wheels and paint colour accurately, as the real car, not a generic look-alike, but do not edit it or use anything else from it.

The new car must be photorealistic and match the original image's rendering exactly: the same sharpness, detail, grain, colour grading and light, so it looks like it was in the original photo.

The new car:
- Exactly where the current car is: same spot, same angle (front facing out of the garage, towards the left of the image), same camera perspective.
- No larger than the current car. Nothing may stick out past the garage's right pillar, past the garage's left wall or over the plants in front of it.
- The same car, wheels, position and size in both images.
- A soft, realistic shadow on the garage floor and a reflection on the paving, like the current car has.
- Daytime: lit like the rest of the daytime scene.
- Nighttime: lit by the garage lights like the current car; both headlights' daytime running lights may glow like the current car's; no other new lights.
- No charging cable, EV charger, people, text or objects.

Keep the garage as it is: its walls, pillar, back wall, floor, lights and the plants in front. The wooden back wall must keep exactly its original colour, brightness and slats all around the car, with no lighter or darker patch. Keep the image at 1676 × 469. Before delivering, compare each result with its original. A shift of a few pixels, a slight change of scale, or different textures and lighting outside the garage are fine: they are corrected afterwards, so don't redo the image for them. Redo it only if the image was cropped, zoomed or reframed, the house was clearly moved or redrawn, or something in the garage other than the car and its shadow changed.

Deliver car-day.png and car-night.png.
```

Then make the overlays with `python3 tools/make-car.py car-day.png car-night.png cars/<name>` and check the preview: the tool corrects small shifts and refuses a redrawn house, but not a car that is badly drawn, too large or in the wrong place.
