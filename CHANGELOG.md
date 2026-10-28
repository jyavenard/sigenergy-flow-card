# Changelog

Each release is tagged `vN` on GitHub; HACS offers the newest release as the update.

## v58

- The Power metrics chart plots power as Sigenergy's app does: what is supplied to the home (solar, battery discharging, grid import, a vehicle supplying the DC charger) above zero, and what is consumed (home, battery charging, grid export, EV charging) below. The battery, home and both chargers were plotted the other way round.

## v57

- With `sigenergy_backend: sigenergy2mqtt`, the AC charger is also found under `rated_charging_power`, the name sigenergy2mqtt used before February 2026. Home Assistant keeps the entity ID it first registered, so installs from before then still have that name.
- README: the card is in HACS's default list, so installing it no longer needs a custom repository.

## v56

- New `sigenergy_backend` option: `sigenergy2mqtt` makes the card read [sigenergy2mqtt](https://github.com/seud0nym/sigenergy2mqtt)'s entities by default, PV strings included, instead of Sigenergy Local Modbus's (`sigenergy_local_modbus`, the default). Keys set under `entities:` still replace the defaults.
- The card file is about 40% smaller (405 KiB instead of 656 KiB): the house photos and charger overlays are embedded as AVIF instead of WebP, at the same visible quality. AVIF needs iOS / iPadOS 16 or later, or Safari on macOS 13 or later; Chrome, Edge, Firefox and the Android app show it on any current version. On older systems the card shows no photo.

## v55

- Times, today's sunrise and sunset, the day or night style, the charts' midnight and the Energy statistics' days, weeks, months and years follow Home Assistant's time zone instead of the browser's.
- The current weather is shown at the top left of the scene, as in Sigenergy's app: an icon for the condition and the temperature, from the new `weather` entities key (`weather.forecast_home`, then `weather.home`, by default). Tapping it opens the forecast.

## v54

- A third-party inverter is counted as solar alongside the Sigenergy PV. In the PV Strings dialog its row sits above the Total, which now adds it in, and shows today's energy (new `third_party_pv_daily_energy` entities key, `sensor.sigen_plant_daily_third_party_inverter_energy` by default); the chart draws its power too. Its daily energy counts towards the Solar produced tile, and its lifetime energy towards the Energy statistics' solar.
- The PV Strings Total lifetime no longer subtracts the third-party inverter's energy from `sensor.sigen_plant_total_pv_generation`, which covers only the Sigenergy PV.

## v53

- Clicking the battery percentage next to SigenStor opens a Battery level dialog with the current state of charge and today's history from the recorder.
- The flow pulses follow the timing of Sigenergy's app instead of each line running its own pulse at its own speed. They share one cycle at one speed: the SigenStor pulse starts once the previous home pulse has run into HOME, the grid's pulse into the gateway starts with it, lines out of the gateway start as the SigenStor pulse comes out of it so it appears to run on through, and the solar pulse is halfway into SigenStor as the SigenStor pulse leaves. Unlike the app, the speed follows the home power, so everything runs quicker as the house uses more.

## v52

- PV string names from `pv_strings` are inserted as text in the PV Strings table, its chart legend and the chart tooltip, so a name containing markup shows as typed instead of being parsed as HTML.

## v51

- The flow lines follow the house's perspective: their runs converge on the vanishing points of the roof ridge and eaves and of the window and door edges, with verticals kept vertical. The inverter line stops at the gateway's edge, the branch to the glass doors ends halfway across the window frame, and the HOME and GRID leaders meet the lines where they end.

## v50

- The Power metrics chart no longer refetches the day's history every minute. It loads once and then adds the current sensor values every 30 seconds, redrawing only the chart (skipped while the tab is hidden).
- New options `title` (default `Sigenergy`) and `name` (default `My Home`) set the two parts of the card heading; an empty value hides that part.

## v49

- The Power metrics chart refreshes every minute while the page is open (it only loaded once, so it needed a page reload to move on). The reload is skipped while the browser tab is hidden.

## v48

- The card heading reads "Sigenergy · My Home" (it said "SigenEnergy").
- The card is licensed under the Apache License 2.0 (`LICENSE`, and a header in `sigenergy-flow-card.js`).
- The repository is now named `sigenergy-flow-card`, matching the card file, so HACS installs it to `/hacsfiles/sigenergy-flow-card/`. If the old `/hacsfiles/Sigenergy_Card/` resource is still listed, remove it and let HACS add the new one.
- README: HACS install button, and refreshed screenshots.

## v47

- New **Energy statistics** panel: the portal's source-to-consumer diagram for a day, week, month, year or lifetime, with an estimated split of each flow, percentages on selection and the same values as text. It reads the lifetime energy counters through Home Assistant long-term statistics (new `stat_*` entities keys); consumers or sources without a sensor, such as EVDC, are left out. Hide it with `show_energy_statistics: false`. The split between sources and consumers is fitted to the Sigenergy app's own figures; `debug_energy_statistics: true` lists the recorded sensor totals and offers the recorded data to copy or download.
- The AC charger shows only its own energy consumed. The lifetime charged and discharged lines for the AC charger, which repeated it, are removed along with their `ac_charger_lifetime_charged_energy` and `ac_charger_lifetime_discharged_energy` keys. The DC charger keeps its lifetime line.

## v46

- Day style: the fades at the photo's edges are dark instead of white, so the white readings stay legible over the pale sky, foliage and pavement (the AC charger lines in particular), and the text shadow has a tighter dark edge. The small labels and status lines are slightly heavier.
- On a phone in portrait the AC and DC charger readings are no longer lined up with SigenStor; they are centred vertically like everywhere else.

## v45

Contributed by Justin (pull request 1), merged onto the photo scene and day/night styles.

- New `entities` option replaces any entity the card reads, or hides its item with `false`, so the card can work with other inverters and integrations. A wrong key or value is reported as a configuration error.
- Every reading and chart converts W, kW and MW (and Wh, kWh and MWh) to kW and kWh using the entity's unit.
- New `battery_power_invert` option for battery power sensors that are positive while discharging.
- Plant sensors are the primary source for battery power, battery level and today's totals, with the inverter sensors as the fallback.
- PV strings can be objects with their own entities. A string with none of its entities is hidden, the Total row uses the system PV sensors when present, and a Third-party PV row appears when those sensors exist.
- Optional lines: `show_lifetime` (on by default) adds the AC charger's energy consumed and both chargers' lifetime energy charged and discharged; `show_phase_mode` (off by default) shows the phase power mode under GRID. The DC charger's gear icon is hidden without a limit entity.
- Battery level is shown to one decimal.
- New photos with more sky above and more ground below the house, so less of the scene is a blurred extension. The photos no longer include the car charger on the garage wall. It is a separate overlay (day and night versions) that is drawn only when an AC or DC charger is present. With a single charger, its readings are level with the charger on the wall (and, on a phone in portrait, just to its right).
- When the scene is taller than the photo (a card beside the side panels, such as a phone in landscape), the SigenStor and GRID readings start where the photo ends (the blurred band), and their leaders lengthen to match.
- On narrow cards in portrait (under 560 px, such as a phone held upright) the photo is cropped from the garage to the right wall, dropping the trees on both sides, so the house is shown larger. The SOLAR and HOME readings sit left of their leaders and the charger readings sit over the garage, with the DC charger level with SigenStor and the AC charger above it.
- The SigenStor and GRID readings are aligned at the top, whatever their number of lines, and sit slightly higher; the grid line and the two leaders follow.
- Power readings pick their unit: W below 1 kW (for example 40 W), kW up to 1000 kW and MW above.
- The Modbus utility scripts stay in the repository.

## v44

- The scene is now a photo of the house (day and night versions, embedded in the card), with the readings placed around it. The card shows the photo at full size and crops its sides as it narrows, so the house always stays in view.
- Home flow redrawn as level and upright lines with small rounded corners: it runs level from the gateway, climbs beside the glass doors and follows the band above them to HOME's leader. A short branch crosses to the doors.
- The branch continues the home flow's animation from the fork, at the same speed, instead of animating on its own.
- Level and upright flow lines now glow like the diagonal ones (their blur area was empty).
- New `style` option: `auto` (default), `day` or `night`. The day style uses a light theme with pale aqua background, white panels and dark text, with light readings over the photo; night keeps the dark theme.
- Documentation screenshots regenerated, and the README describes the style option and the flow animation speed.

## v42

- Clicks keep working while Home Assistant updates the card: unchanged text is no longer rewritten, and the HOME list updates in place.

## v41

- Artwork embedded in the card, so it is a single file installable through HACS.
