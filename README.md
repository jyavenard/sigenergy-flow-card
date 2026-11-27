# Sigenergy Flow Card

[![hacs][hacs-badge]][hacs-url]
[![release][release-badge]][release-url]
[![total downloads][downloads-badge]][release-url]
![Latest release downloads][downloads-latest-badge]
[![maintained][maintained-badge]][commits-url]
[![activity][activity-badge]][commits-url]
[![license][license-badge]][license-url]

A standalone Home Assistant Lovelace card for a Sigenergy installation. It recreates the SigenCloud / mySigen power-flow dashboard: solar, SigenStor battery, Sigen Gateway, grid, and optional AC and DC EV chargers.

- Live power flow over a photo of the house. It has day and night versions, and follows Home Assistant's light or dark mode.
- The scene changes with the weather forecast: cloud, rain, snow and more (see [Weather forecast](#weather-forecast)).
- Readings for solar, home, SigenStor (with charge level and remaining time), grid, and the AC and DC chargers, plus the current weather.
- One date and range picker at the top: Day, Week, Month, Year, Lifetime. It drives the energy totals, the chart and the energy flow diagram.
- Tap a reading for its details: PV strings, grid phases, home power usage, the battery and inverter, the solar forecast.
- A car in the garage while it's plugged in. You can swap it for your own model and colour (see [Changing the car](#changing-the-car)).
- It's made for Sigenergy, but it can be set up for any brand of battery (or none) and solar system.

No other custom cards (button-card, card-mod, Mushroom) are needed.

## Contents

- [Screenshots](#screenshots)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
  - [Marketplace](#marketplace)
  - [Moving from a manual install to Marketplace](#moving-from-a-manual-install-to-marketplace)
  - [Sensors to enable](#sensors-to-enable)
- [Configuration](#configuration)
  - [Example](#example)
  - [Standalone cards](#standalone-cards)
- [PV strings](#pv-strings)
- [Home power usage](#home-power-usage)
- [Grid details](#grid-details)
  - [Phase power mode](#phase-power-mode)
- [Electricity prices](#electricity-prices)
- [AC and DC car chargers](#ac-and-dc-car-chargers)
  - [Two AC chargers](#two-ac-chargers)
  - [Double garage](#double-garage)
  - [Which car is on which charger](#which-car-is-on-which-charger)
- [Solar production forecast](#solar-production-forecast)
- [Weather forecast](#weather-forecast)
- [Inverter efficiency](#inverter-efficiency)
- [Energy statistics](#energy-statistics)
- [sigenergy2mqtt](#sigenergy2mqtt)
- [Plant and inverter sensors](#plant-and-inverter-sensors)
- [Battery modules](#battery-modules)
- [Style](#style)
- [Flow animation](#flow-animation)
- [Custom entities](#custom-entities)
- [Using the card with a third-party charger](#using-the-card-with-a-third-party-charger)
- [Changing the car](#changing-the-car)
- [Changing the artwork](#changing-the-artwork)
- [Utilities](#utilities)
- [License](#license)
- [Acknowledgements](#acknowledgements)

## Screenshots

The screenshots show the day style. [Night](#night) shows the dark one.

### Desktop

The main view. Hovering over the chart shows the power metrics at that time:

![Desktop main view](docs/screenshots/desktop-main.png)

The previous week, chosen at the top. It shows the week's totals and each day's energy, hovered on the 14th:

![Desktop week view](docs/screenshots/desktop-week.png)

The Energy statistics panel, with SOLAR selected to show where its energy went:

![Energy statistics](docs/screenshots/stat-desk-day.png)

Tapping **SOLAR**:

![Desktop PV strings](docs/screenshots/desktop-solar.png)

Tapping **GRID**:

![Desktop grid details](docs/screenshots/desktop-grid.png)

Tapping **HOME**:

![Desktop home power usage](docs/screenshots/desktop-home.png)

Tapping the stored energy under **Battery level**:

![Desktop battery energy](docs/screenshots/desktop-energy.png)

Tapping **SigenStor**:

![Desktop SigenStor details](docs/screenshots/desktop-battery.png)

Tapping the SigenStor in the photo, with the battery modules from mySigen:

![Desktop battery modules](docs/screenshots/desktop-modules.png)

### iPhone (portrait)

<table>
  <tr>
    <th>Main view</th>
    <th>Week</th>
    <th>Energy statistics</th>
    <th>SOLAR</th>
    <th>GRID</th>
    <th>HOME</th>
    <th>Battery energy</th>
    <th>SigenStor</th>
    <th>Battery modules</th>
  </tr>
  <tr>
    <td><img src="docs/screenshots/iphone-main.png" alt="iPhone main view" width="200"></td>
    <td valign="top"><img src="docs/screenshots/iphone-week.png" alt="iPhone week view" width="200"></td>
    <td valign="top"><img src="docs/screenshots/stat-phone-day.png" alt="iPhone energy statistics, GRID selected" width="200"></td>
    <td valign="top"><img src="docs/screenshots/iphone-solar.png" alt="iPhone PV strings" width="200"></td>
    <td valign="top"><img src="docs/screenshots/iphone-grid.png" alt="iPhone grid details" width="200"></td>
    <td valign="top"><img src="docs/screenshots/iphone-home.png" alt="iPhone home power usage" width="200"></td>
    <td valign="top"><img src="docs/screenshots/iphone-energy.png" alt="iPhone battery energy" width="200"></td>
    <td valign="top"><img src="docs/screenshots/iphone-battery.png" alt="iPhone SigenStor details" width="200"></td>
    <td valign="top"><img src="docs/screenshots/iphone-modules.png" alt="iPhone battery modules" width="200"></td>
  </tr>
</table>

### Night

Between sunset and sunrise, or with `style: night`, the card shows the night photo. Here it is with Home Assistant in dark mode:

<table>
  <tr>
    <th>Desktop</th>
    <th>iPhone (portrait)</th>
  </tr>
  <tr>
    <td valign="top"><img src="docs/screenshots/desktop-main-night.png" alt="Desktop main view at night" width="720"></td>
    <td valign="top"><img src="docs/screenshots/iphone-main-night.png" alt="iPhone main view at night" width="200"></td>
  </tr>
  <tr>
    <td valign="top"><img src="docs/screenshots/stat-desk-night.png" alt="Desktop energy statistics at night, LOAD selected" width="720"></td>
    <td valign="top"><img src="docs/screenshots/stat-phone-night.png" alt="iPhone energy statistics at night" width="200"></td>
  </tr>
</table>

## Features

**The scene**

- Animated power flow between the solar panels, SigenStor, gateway, home and grid, drawn over a photo of the house. Each highlight moves the way power flows. It moves faster at higher power, and stops when idle.
- Day and night photos. The day photo shows between sunrise and sunset, the night photo otherwise. The `style` option forces either one.
- The colours follow Home Assistant's light or dark mode. The `theme` option forces either one.
- The photo follows the weather: cloud, fog, rain, storms, hail, snow or wind (see [Weather forecast](#weather-forecast)).
- The current weather at the top left, as in Sigenergy's app. An icon shows the condition, with a moon after sunset, next to the temperature. Tap it for the forecast.
- Power readings for solar, home, SigenStor (with its state of charge), grid, and the AC and DC chargers when present.
- Off grid, GRID and its line are hidden, and the title ends with "(Off Grid)" (from `grid_status`).

**The battery's remaining time**

Under SigenStor, the card shows how long the battery lasts at the current power, and the SOC it counts to, e.g. "Discharging (3h20m to 20%)".

- While charging, it counts to the charge cut-off SOC.
- While discharging on grid, it counts to the Backup SOC, where the battery stops discharging.
- While discharging off grid, it counts to the discharge cut-off SOC. `battery_remaining_target` changes this.
- From 100 hours, it shows "over 99h".
- While idle, it shows how long the battery would run the home in a power cut, down to the discharge cut-off SOC. That is the home's consumption plus the system's own base load. The card learns the base load while the battery alone supplies the home, typically at night, and keeps it in the browser. Until it has learnt it, idle shows no time.
- Without the cut-off and backup SOC entities, it counts to 100% and 0%. Sigenergy ESS disables them by default. Enable **Charge Cut-Off SOC**, **Discharge Cut-Off SOC** and **ESS Backup State of Charge**. sigenergy2mqtt enables its own.

**The period and its totals**

- The date and range picker at the top picks the day, week, month, year or lifetime the panels show. The arrows move between periods. The scene and the battery level always show now.
- A battery level panel.
- The **Energy statistics** totals for the period: solar produced and forecast, grid imported and exported, battery charged and discharged.
  - Today's totals come from the daily sensors.
  - Other periods come from the recorder's statistics of the lifetime counters (`stat_*`). The Energy metrics and the Energy statistics diagram use the same counters, so the three agree. A lifetime counter also keeps counting while Home Assistant is down, which a daily sensor doesn't.
  - A tile without its counter falls back to the daily sensor's statistics. These need `state_class: total_increasing`, which the Sigenergy integrations set.
  - The Solar forecast tile shows for a day only. On a previous day, it shows that day's last recorded forecast and **(Perf: N%)**, the day's production against it. This lasts as long as the forecast entity's history (10 days by default).
  - Tap a statistic or the battery level to open that sensor's details and history. Tap the stored energy (e.g. 4.4 of 40.3 kWh) for a chart of the energy in the battery today.

**The charts**

- **Power metrics**, for a day. The time axis runs from midnight to midnight, as in Sigenergy's app, and the lines run up to now. Sunrise and sunset times show below, for your Home Assistant location.
  - Power supplied (solar, battery discharging, grid import) is above zero. Power consumed (home, battery charging, grid export, EV charging) is below. This follows Sigenergy's app.
  - Hover or tap the chart to see every value at that time.
  - The rest of today shows a dashed solar and home forecast (see [Solar production forecast](#solar-production-forecast)).
  - A previous day shows its recorded history, midnight to midnight, without a forecast. Beyond the recorder's history (10 days by default), it shows the hourly averages from the long-term statistics, marked **Hourly averages**.
- **Energy metrics**, for a week, month, year or the lifetime. It draws a bar per day, month or year, from the same lifetime counters as the Energy statistics diagram.
  - Energy supplied (solar, battery discharged, EVDC discharged, imported) is stacked above zero. Energy consumed (battery charged, EVDC charged, exported, load, EVAC charged) is below.
  - Hover or tap a bar for its figures.
  - In the current week or month, dashed bars add the solar and home forecast. Today's bar gets the rest of today. The days ahead that Home Assistant's solar forecast covers get a bar each (Forecast.Solar gives tomorrow), with the home's average day over the last 7 days.
  - Sigenergy's app also forecasts the battery and grid. Home Assistant has no such forecast, so the card doesn't show one. `show_forecast: false` hides the forecast.

**Details on tap**

- Tap **SOLAR** for each PV string's voltage, current, power, and today's and lifetime production, with a chart of each string's power today. The integration counts the strings' lifetime energy from their power, so it can miss production. The **Total** is the inverter's own counter. A note shows when the strings don't add up to it.
- Tap **SigenStor** for the battery and the inverter. It shows their power, the inverter's loss and efficiency over the last 24 hours, and the battery's round trip and state of charge (see [Inverter efficiency](#inverter-efficiency)).
- With the battery modules from mySigen, tap the SigenStor in the photo for each module (see [Battery modules](#battery-modules)).
- Tap **HOME** for a live breakdown of power use across the entities you list, from highest to lowest.
- Tap **DC CHARGER** to adjust the DC charger's maximum charging power.

**More**

- The **Energy statistics** diagram shows where the period's energy came from and went (see [Energy statistics](#energy-statistics)).
- Each part also works as a card of its own, for your own dashboard layout (see [Standalone cards](#standalone-cards)).
- A ⚠ marks missing data: on the totals, the bars and the diagram's title, and as a shaded band on Power metrics. It shows wherever Home Assistant recorded no statistics for a counter, because it was down or the counter didn't exist yet. Hover or tap it for the dates.
  - The energy of that time is either missing, or added to the hour recording resumed, when the inverter kept counting.
  - The card shows the gap rather than guessing what happened in it.

## Requirements

The card reads all its data locally, over modbus, through the [Sigenergy ESS](https://github.com/TypQxQ/Sigenergy-Local-Modbus) integration (repository Sigenergy-Local-Modbus).

- Install it through Marketplace ([open it in Marketplace](https://my.home-assistant.io/redirect/hacs_repository/?owner=TypQxQ&repository=Sigenergy-Local-Modbus&category=integration)) and configure it first.
- The card uses its default entity IDs: `sensor.sigen_plant_*`, `sensor.sigen_inverter_*` and `sensor.sigen_ac_charger_*`.
  - Since 2026.8, Home Assistant puts a device's area in front of its new entity IDs, e.g. `sensor.garage_sigen_plant_pv_power`. The card finds these by itself, for each device.
  - It also finds a device you renamed, e.g. `sensor.home_battery_pv_power`.
- With [sigenergy2mqtt](https://github.com/seud0nym/sigenergy2mqtt) instead, set `sigenergy_backend: sigenergy2mqtt` (see [sigenergy2mqtt](#sigenergy2mqtt)).
- Optional: the [Sigenergy ESS – mySigen cloud](https://github.com/TypQxQ/Sigenergy-Local-Modbus-mySigen) add-on, or sigenergy2mqtt's cloud access, for each battery module's readings (see [Battery modules](#battery-modules)).

The house photos are AVIF images. They need a browser or Home Assistant app that can show AVIF:

- iPhone and iPad: iOS / iPadOS 16 or later.
- Mac: Safari on macOS 13 Ventura or later, or a current Chrome, Edge or Firefox.
- Android: the Home Assistant app or Chrome, on any Android version. Android System WebView (for the app) or Chrome must be version 85 or later; Play Store updates provide this.

On older systems, the card works but shows no photo.

## Installation

The artwork is built into `sigenergy-flow-card.js`, so the card is a single file. Nothing needs copying to `/config/www/Sigenergy/`.

### Marketplace

Marketplace (formerly HACS) is in Home Assistant's **Settings**. The card is in its default list.

[![Open your Home Assistant instance and open this repository in Marketplace.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=jyavenard&repository=sigenergy-flow-card&category=plugin)

The button opens the card in your own Home Assistant's Marketplace. Or do the same by hand:

1. In Home Assistant, open **Settings → Marketplace** and search for **Sigenergy Flow Card**.
2. Open it and select **Download**.
3. Reload the browser when asked. Marketplace registers the dashboard resource for you.
4. Add the card to a dashboard (**Edit dashboard → Add card → Manual**):

   ```yaml
   type: custom:sigenergy-flow-card
   ```

Marketplace offers an update whenever a new release is published on GitHub (see [CHANGELOG.md](CHANGELOG.md)). Download it and reload the browser.

### Moving from a manual install to Marketplace

Remove the `/local/sigenergy-flow-card.js` resource and delete `/config/www/sigenergy-flow-card.js`, so only the Marketplace copy loads. The `/config/www/Sigenergy/` artwork directory is no longer used, and can be deleted.

### Sensors to enable

Both integrations create some of the sensors the card reads disabled. The card works without them, but the parts that need them stay empty or less accurate.

- Enable them in **Settings → Devices & services → Entities**: search for the entity, open it, then ⚙ → **Enabled**.
- Home Assistant keeps statistics only from when a sensor is enabled, so enable the energy counters early.

**Sigenergy ESS (formerly Sigenergy Local Modbus):**

| Enable | For |
| --- | --- |
| `sensor.sigen_plant_charge_cut_off_soc`, `sensor.sigen_plant_discharge_cut_off_soc`, `number.sigen_plant_ess_backup_state_of_charge` | The battery's remaining time. Without them, it counts to 100% and 0%. |
| `sensor.sigen_inverter_phase_a_voltage`, `…_current` (and phases B, C), `sensor.sigen_inverter_power_factor`, `sensor.sigen_plant_grid_phase_a_active_power` (and B, C) | The grid details, when you tap GRID. |
| `sensor.sigen_plant_third_party_pv_power`, `sensor.sigen_plant_total_generation_of_third_party_inverter` | A third-party inverter: its row under SOLAR, and its solar in past periods. |
| `switch.sigen_plant_independent_phase_power_control` | The phase power mode under GRID, with `show_phase_mode: true`. |
| `sensor.sigen_plant_total_charged_energy_of_the_evdc`, `…_discharged_energy_of_the_evdc` | Energy statistics with DC chargers on several inverters. With one, the charger's own totals are enough. |

**sigenergy2mqtt** creates most sensors disabled:

| Enable | For |
| --- | --- |
| `sensor.sigen_0_plant_rated_energy_capacity` | The stored energy and the battery's remaining time. |
| `sensor.sigen_0_dc_charger_1_output_power`, `…_vehicle_soc`, `…_total_charging_capacity`, `…_total_discharging_capacity`, `sensor.sigen_0_evdc_total_charge_energy`, `…_discharge_energy` | A DC charger: its power, the car's SOC, and EVDC in Energy statistics. |
| `sensor.sigen_0_inverter_1_active_power` | The inverter's efficiency and the SigenStor details. |
| `sensor.sigen_0_inverter_1_pv1_voltage`, `…_pv1_current` (and each string) | The strings' voltage and current, when you tap SOLAR. |
| `sensor.sigen_0_general_load_power` | HOME as measured. Without it, the card calculates HOME. |
| `sensor.sigen_0_inverter_1_phase_a_voltage`, `…_current` (and phases B, C), `sensor.sigen_0_inverter_1_power_factor`, `sensor.sigen_0_plant_grid_phase_a_active_power` (and B, C) | The grid details, when you tap GRID. |
| `sensor.sigen_0_third_party_pv_power`, `sensor.sigen_0_third_party_pv_lifetime_production` | A third-party inverter's row under SOLAR. |

## Configuration

All options are optional.

| Option | Default | Description |
| --- | --- | --- |
| `sigenergy_backend` | `sigenergy_local_modbus` | The integration the default entities come from: `sigenergy_local_modbus` ([Sigenergy ESS](https://github.com/TypQxQ/Sigenergy-Local-Modbus)) or `sigenergy2mqtt` ([sigenergy2mqtt](https://github.com/seud0nym/sigenergy2mqtt)). See [sigenergy2mqtt](#sigenergy2mqtt). |
| `entities` | Sigenergy entities | Replaces the entities the card reads, for other inverter brands or integrations. See [Custom entities](#custom-entities). |
| `battery_present` | `true` | `false` hides everything battery-related, for a system without a battery: the SigenStor reading, the battery tiles, the battery level panel, and the battery in the charts and the Energy statistics. |
| `battery_power_invert` | `false` | `true` if your battery power sensor is positive while **discharging**. The card expects positive while charging. |
| `pv_strings` | `[PV1, PV2, PV3, PV4]` | The PV strings, in order. Each is a display name, or an object with its own entities (see [PV strings](#pv-strings)). The number of entries sets how many strings show. |
| `home_entities` | Energy dashboard devices | Power entities listed when tapping **HOME**. Without it, the card lists the Energy dashboard's devices that have a power sensor. `false` turns the list off (see [Home power usage](#home-power-usage)). |
| `ac_charger_soc` | none | The battery level entity of the vehicle on the AC charger. Same as `entities.ac_charger_vehicle_soc`. |
| `ac_charger_range` | none | That vehicle's range entity. It shows only with `ac_charger_soc`. Same as `entities.ac_charger_vehicle_range`. |
| `show_lifetime` | `true` | Show the AC charger's energy consumed, and the DC charger's lifetime energy charged and discharged. |
| `title` | `Sigenergy` | The first part of the card's heading. |
| `name` | `My Home` | The second part of the heading: your home's name. An empty value hides it. |
| `show_phase_mode` | `false` | Show the phase power mode under **GRID**. |
| `show_grid_voltage` | `false` | Show the voltage beside **GRID**, e.g. **GRID (231V)** (see [Grid details](#grid-details)). |
| `flow_line_scale` | `1` | The flow lines' thickness, as a multiple of the default. `1.5` is half as thick again, `0.5` is half. From 0.25 to 4. |
| `show_inverter_efficiency` | `false` | Show the inverter's efficiency beside SigenStor's power, e.g. **553 W (η 68%)** (see [Inverter efficiency](#inverter-efficiency)). |
| `battery_remaining_target` | `auto` | The SOC the remaining time counts down to while discharging. `auto`: the Backup SOC on grid, the discharge cut-off SOC off grid (by `grid_status`; on grid without it). `backup_soc`: always the Backup SOC, also for the idle power-cut estimate. `discharge_cut_off_soc`: always the discharge cut-off SOC. |
| `home_includes_ac_charger` | `false` | `true` when `home_power` includes the AC charger (and the second one), e.g. a third-party one. HOME, its chart line and its forecast then deduct the charger's power (see [Using the card with a third-party charger](#using-the-card-with-a-third-party-charger)). |
| `car_shown` | `auto` | Show the car in the garage. `auto`: while it charges. `true`: always. `false`: never. A `binary_sensor`: while it's on. A `device_tracker`: while it's home (see [AC and DC car chargers](#ac-and-dc-car-chargers)). |
| `car` | none | A different car for the garage, by name from the card's `cars/` folder, or an entity whose state is that name (see [Changing the car](#changing-the-car)). |
| `car_image` | none | The URL of your own car overlay, instead of `car`. |
| `car_image_night` | `car_image` | The same car at night. |
| `weather_scene` | `true` | Show the photo of the current weather, rather than the clear day or night (see [Weather forecast](#weather-forecast)). |
| `garage` | `auto` | `double` adds a second bay on the left for a second car, when the card is wide enough (see [Double garage](#double-garage)). `auto` adds it while there are two chargers (AC and DC, or two AC). `single` never adds it. |
| `car_shown_2`, `car_2`, `car_image_2`, `car_image_night_2` | as the first car's | The second car, in the double garage: the second AC charger's, else the DC charger's. The options work like `car_shown`, `car`, `car_image` and `car_image_night`. Without `car_2` or `car_image_2`, it's the same car as the first. |
| `grid_phases` | detected | The number of phases (1, 2 or 3) in the grid details, when detection gets it wrong. |
| `show_energy_statistics` | `true` | Show the **Energy statistics** panel (see [Energy statistics](#energy-statistics)). |
| `show_forecast` | `true` | Draw the dashed solar and home forecast: for the rest of the day on Power metrics, and as dashed bars in the current week or month (see [Solar production forecast](#solar-production-forecast)). |
| `debug_energy_statistics` | `false` | List the energy each statistics sensor recorded over the period, under the Energy statistics panel. Useful to check the sensors against another source. |
| `style` | `auto` | The artwork: `day`, `night`, or `auto` (day between sunrise and sunset). |
| `theme` | `auto` | The colours: `light`, `dark`, or `auto`. `auto` follows Home Assistant's light or dark mode, as set in your profile, else the artwork's. |
| `date_format` | `auto` | The period picker's date format, e.g. `DD/MM/YYYY`, `MM-DD-YY` or `YYYY.MM.DD`. `auto` follows your Home Assistant profile's **Date format**, else `YYYY-MM-DD`. |
| `tap_action` | none | A Home Assistant action, e.g. to open another dashboard. It runs on a tap on the title, which then ends with ›. It also runs on a tap anywhere on the card that isn't already tappable; on the full card, only the title and the house. |

### Example

```yaml
type: custom:sigenergy-flow-card
pv_strings: [NE, NW, S, W]
ac_charger_soc: sensor.my_car_battery_level
ac_charger_range: sensor.my_car_battery_range
```

### Standalone cards

Each part of the card is also a card of its own, so you can lay out a dashboard yourself. They take the same options as the main card (`entities`, `sigenergy_backend`, `battery_present`, `theme`…).

| Card | Shows |
| --- | --- |
| `custom:sigenergy-flow-scene` | The house with its live power flows, and the SOLAR, HOME, GRID and SigenStor details. |
| `custom:sigenergy-flow-battery` | The battery level and stored energy. |
| `custom:sigenergy-flow-statistics` | The Energy statistics totals: solar produced and forecast, grid, battery. |
| `custom:sigenergy-flow-metrics` | Power metrics for a day, Energy metrics bars for longer periods. |
| `custom:sigenergy-flow-sankey` | The Energy statistics diagram. |

The tiles, metrics and Sankey cards have two more options:

| Option | Default | Description |
| --- | --- | --- |
| `period` | `day` | The period the card opens on: `day`, `last_7_days` (today and the 6 days before), `week`, `month`, `year` or `lifetime`. A current period moves on with the clock. The main card takes it too, except `last_7_days`. |
| `show_period_picker` | `true` | Show the date and range picker. With `false`, the card stays on `period` and only shows its dates. |

- `title` sets the card's heading, e.g. `Energy statistics` or `Battery level`. The metrics card's heading follows its period.
- Each card only fetches the data it shows.
- The cards don't share their period: each has its own picker.

```yaml
type: custom:sigenergy-flow-sankey
period: last_7_days
```

```yaml
type: custom:sigenergy-flow-statistics
period: month
show_period_picker: false
```

On a summary dashboard, `tap_action` can open a more detailed one:

```yaml
type: custom:sigenergy-flow-scene
tap_action:
  action: navigate
  navigation_path: /dashboard-energy/details
```

## PV strings

Tapping **SOLAR** reads these entities for each string *n* (1 to the number of `pv_strings`):

```
sensor.sigen_inverter_pv<n>_voltage
sensor.sigen_inverter_pv<n>_current
sensor.sigen_inverter_pv<n>_power
sensor.sigen_inverter_pv<n>_daily_energy
sensor.sigen_inverter_pv<n>_accumulated_energy
```

With `sigenergy_backend: sigenergy2mqtt`, they are `sensor.sigen_0_inverter_1_pv<n>_voltage`, `_current`, `_power`, `_daily_energy` and `_lifetime_energy`.

- A string written as an object sets its own entities instead. It uses only the keys it lists: a column left out, or set to `false`, shows `—`. Names and objects can be mixed.
- A string none of whose entities exist in Home Assistant counts as not fitted. Its row, legend entry and chart line are hidden. So the default four names suit inverters with 2, 3 or 4 strings without changes.

**Third-party PV:** a **Third-party PV** row shows under the strings when `third_party_pv_power`, `third_party_pv_daily_energy` or `third_party_pv_lifetime_energy` reports any energy or power. The chart then draws the third-party inverter's power too.

- The integrations publish these as 0 on systems without a third-party inverter.
- The Sigenergy integration disables the third-party power and lifetime energy sensors by default, and derives the daily one from the lifetime one. Enable both in Home Assistant if a third-party inverter is connected.
- It counts towards the main card's solar (see [Custom entities](#custom-entities)).

**Total:** the **Total** row is the main card's solar: `pv_power`, `daily_pv_energy` and `stat_pv`. Without them, it adds up the rows above it. That's the system's own PV sensors when they exist (`pv_strings_power` and `pv_strings_lifetime_energy`), otherwise the sum of the strings shown, plus the Third-party PV row.

```yaml
pv_strings:
  - name: East
    power: sensor.east_power
    voltage: sensor.east_voltage
    current: sensor.east_current
    daily_energy: sensor.east_energy_today
    accumulated_energy: sensor.east_energy_total
  - PV2   # name only: uses sensor.sigen_inverter_pv2_*
```

## Home power usage

Without `home_entities`, tapping **HOME** lists the **individual devices** of Home Assistant's Energy dashboard (Settings → Dashboards → Energy) that have a power sensor.

- It needs Home Assistant 2025.12 or later. Earlier versions take only an energy sensor per device.
- Devices without a power sensor are left out.
- So are the AC and DC chargers, which Sigenergy doesn't count in the home consumption.
- A device whose **Upstream device** is set is listed under that device, and not counted again in **Measured**.
- A device without one is counted on its own. So a circuit and the meter that feeds it are counted twice, unless the circuit names the meter as its upstream device.
- With no device to list, HOME is a plain label. `home_entities: false` keeps it that way.

Each `home_entities` item is either an entity ID or an object with:

- `entity`: the power sensor (required)
- `name`: the label. By default, the entity's name as Home Assistant shows it, without the device's name.
- `icon`: e.g. `mdi:pool`. By default, the entity's `icon` attribute, if any.

Other keys are ignored. So a list written for [power-flow-card-plus](https://github.com/flixlix/power-flow-card-plus) `individual` entities can be pasted as is.

The list:

- shows only entities currently drawing power (anything that would show as more than 0.00 kW), from highest to lowest;
- adds them up as **Measured**, against the home consumption Sigenergy reports, and shows the rest as **Other (unmeasured)**;
- opens an entry's Home Assistant details when you tap it.

Avoid listing a sensor with another one that already includes it, e.g. a circuit and the phase meter that feeds it: it would be counted twice. A ⚠ note shows when the listed loads add up to more than the home consumption.

## Grid details

Tapping **GRID** shows, for each phase:

- the inverter's voltage and current;
- its apparent power (voltage × current, in kVA);
- the grid power: the grid sensor's active power, positive while importing.

The inverter's power factor shows below. Tap a value to chart its last 24 hours. A column shows only when its entities exist.

The inverter's readings are the first inverter's, at its AC terminals. Neither integration reads the grid side's voltage and current over Modbus. So the inverter's current and apparent power are not the grid's.

Entities:

- **Sigenergy ESS:** enable the inverter's **Phase A/B/C Voltage**, **Phase A/B/C Current** and **Power Factor** entities, and the plant's **Grid Phase A/B/C Active Power** entities. They're disabled by default. It creates all three phases' entities even on a single-phase system, where phases B and C read 0.
- **sigenergy2mqtt:** it creates only the phases the inverter has. A single-phase inverter keeps the `phase_a` entity IDs.

The phases shown are those whose voltage or grid power isn't 0, or `grid_phases` when set. A single-phase system can have phase B and C entities reading 0. Without any phase entity, GRID can't be tapped.

With `show_grid_voltage: true`, **GRID (231V)** shows the phases' average voltage, or the `grid_voltage` entity when set. In the narrow portrait layout, the voltage wraps below GRID.

### Phase power mode

With `show_phase_mode: true` (off by default), the card shows the inverter's phase balancing mode under **GRID**, from `switch.sigen_plant_independent_phase_power_control`. The line is hidden if the switch doesn't exist.

- **Power Per Phase Mode** (switch on): each phase is tracked and balanced on its own.
- **Total Power Mode** (switch off): the sum of the three phases is balanced, so import on one phase can offset export on another.

## Electricity prices

GRID shows the current electricity price beside the direction:

- while importing, the buy price, e.g. **Importing · 28.1¢/kWh**;
- while exporting, the sell price, e.g. **Exporting · 6.5¢/kWh**;
- while idle, nothing.

By default, the prices are the Energy dashboard's: Settings → Dashboards → Energy → the grid connection's **Cost tracking** and **Grid compensation**. Each is an entity with the current price, or a static price in Home Assistant's currency.

With several grid connections, one per tariff (e.g. peak and off-peak utility meters), the card uses the connection whose meter is the tariff collecting now (`status: collecting`). When that can't be told, no price shows.

To use other sensors, such as a dynamic tariff's, or to hide the prices, set the keys:

```yaml
entities:
  grid_import_price: sensor.amber_general_price   # or false to hide it
  grid_export_price: sensor.amber_feed_in_price
```

How prices show:

- A price per kWh in dollars (`$/kWh`, `AUD/kWh`, `USD/kWh`, `NZD/kWh`…), euros, pounds or Scandinavian crowns shows in cents (¢, c), pence (p) or øre/öre, e.g. **6.5¢/kWh**.
- Any other price shows with the entity's own unit, e.g. `c/kWh` as it is.
- The card shows the sensor's value as it is, so a negative price (paying to import, or to export) keeps its sign.

## AC and DC car chargers

Each charger's reading and chart line only appear if its power entity exists. The charger on the garage wall is drawn only then too.

- AC charger: `sensor.sigen_ac_charger_charging_power`
- DC charger: `sensor.sigen_inverter_dc_charger_output_power`

Unless `show_lifetime: false`, the card also shows under each charger's power:

- AC charger: the energy consumed (`sensor.sigen_ac_charger_total_energy_consumed`).
- DC charger: the lifetime energy charged and discharged, e.g. `Lifetime ↓ 3,456.7 kWh · ↑ 12.3 kWh`. It goes on two lines when the card is too small for one. The discharged part only appears for bidirectional (V2G / V2H) charging, while it's above 0.

Each line is hidden when its entities don't exist. The DC charger's vehicle state of charge is hidden while the charger is idle and reports 0%.

**Where the readings sit:** in the bottom row, level with SigenStor and GRID, with a line from the charger on the garage wall.

- They go there when they fit as they would read while charging, with the vehicle's SOC and range.
- The row rises a little to make room if needed. It doesn't move as the charger's state changes.
- Otherwise, e.g. with two chargers in the single garage, they stand at the left of the garage.

### Two AC chargers

A second Sigenergy AC charger shows as **AC CHARGER 2**, beside **AC CHARGER 1**. It takes the double garage's other bay.

The integrations number it by its Modbus address, so the card looks for it:

- Sigenergy ESS: `sensor.sigen_ac_charger_<number>_charging_power`. The first charger has no number.
- sigenergy2mqtt: `sensor.sigen_0_ac_charger_<number>_charging_power`, other than the first charger's.
- Its state and energy consumed are the same charger's `system_state` (sigenergy2mqtt: `running_state`) and `total_energy_consumed`.

The card only looks for it while `ac_charger_power` is left at its default. Otherwise, or to pick another, set the `_2` keys:

```yaml
entities:
  ac_charger_power_2: sensor.sigen_ac_charger_3_charging_power
  ac_charger_state_2: sensor.sigen_ac_charger_3_system_state
  ac_charger_total_energy_2: sensor.sigen_ac_charger_3_total_energy_consumed
  ac_charger_vehicle_soc_2: sensor.second_car_battery_level
```

- The Power metrics' EVAC line, HOME's balance and `home_includes_ac_charger` use both chargers' power.
- When `stat_evac_charge` falls back to the first charger's own energy consumed, Energy statistics and Energy metrics add the second's. The plant's EVAC counter is taken as covering both.
- With two AC chargers and a DC charger, all three readings show, but the garage holds the two AC chargers' cars.

### Double garage

With two chargers, the garage has two bays, each with its charger on the wall. That's an AC and a DC charger, or two AC chargers, or `garage: double`.

- The existing bay holds the second charger's car: the second AC charger's, else the DC charger's.
- A new bay on its left holds the AC charger's car. The main roof is lengthened over it, with more solar panels.

![Double garage](docs/screenshots/desktop-double-garage.png)

Each car shows as in the single garage with `car_shown: auto`:

- The first car shows while a vehicle is connected to the AC charger, the AC charger draws power, or `car_charging` says so.
- The second car shows while a vehicle is connected to the second AC charger, or it draws power. With the DC charger, it shows while a vehicle is connected to it, or it charges or discharges. It also shows while `car_charging_2` says so.

`car_shown_2`, `car_2`, `car_image_2` and `car_image_night_2` work like the first car's options, so either car can follow an entity:

```yaml
garage: double
car: byd-atto3-orange
car_2: input_select.second_car
car_shown_2: binary_sensor.second_car_home
```

- The double garage only shows when the card is wide enough for the new bay.
- On a phone in portrait, the card keeps the single garage, with whichever car is charging (the AC charger's when both are).
- With the double garage, the charger readings move onto the driveway, each under its car, level with SigenStor and GRID.
- The new bay and roof are an overlay that `tools/make-garage.py` makes from the card's own photos. It loads from GitHub like the cars. If it can't load, the card shows the single garage.

### Which car is on which charger

With two cars and the double garage, `car` and `car_2` can each follow an entity. Then the garage shows the right car at each charger.

- The car integration knows whether each car is plugged in, and how much power it takes.
- The Sigenergy integration knows whether a vehicle is connected to each charger, and how much power it delivers.
- An automation matches the two. It writes each charger's car into a text helper, which the card reads.

The example below uses [Tessie](https://www.home-assistant.io/integrations/tessie/). Its entities for a car named "car_a" are `sensor.car_a_charger_power`, `sensor.car_a_charging` and `binary_sensor.car_a_charge_cable`. Other car integrations work the same with their own entities: a charging power in kW, a charge cable sensor (on while plugged in) and a charging state.

1. **Create two text helpers**: Settings → Devices & services → Helpers → Create helper → Text. Name them "Garage AC car" and "Garage DC car". Check that their entity IDs are `input_text.garage_ac_car` and `input_text.garage_dc_car`.
2. **Create the automation**: Settings → Automations & scenes → Create automation → ⋮ → Edit in YAML, and paste the YAML below. Then replace:
   - `car_a` and `car_b` with your cars' names in their entity IDs (e.g. `sensor.glacier_charger_power`);
   - `model-y-glacier-blue` and `model-3-stealth-grey` with your cars from the [list above](#changing-the-car), car A's and car B's;
   - the Sigenergy entities, if yours differ from Sigenergy ESS's defaults. With sigenergy2mqtt, they are `sensor.sigen_0_ac_charger_1_charging_power`, `sensor.sigen_0_ac_charger_1_running_state`, `sensor.sigen_0_dc_charger_1_output_power`, `sensor.sigen_0_dc_charger_1_running_state` and `sensor.sigen_0_dc_charger_1_vehicle_soc`.

   Save it, then run it once from its ⋮ menu.
3. **Point the card at the helpers**:

   ```yaml
   car: input_text.garage_ac_car
   car_2: input_text.garage_dc_car
   ```

How the automation decides, whenever any of its entities changes, and at start-up:

- A car that's charging is on the charger whose power is closest to its own.
- Say one car is plugged in but not charging (charging complete, or waiting for solar), and the other isn't plugged in. That car is on the only charger that reports a vehicle:
  - the AC charger, while its state is Reserving, Preparing, EV Ready or Charging;
  - the DC charger, while it reports the vehicle's SOC or a connected state.
- The other car is then on the other charger.
- With both cars plugged in and neither charging, nothing changes. The cars stay where they were last seen charging.
- With no car plugged in, car B goes back to the AC charger, the default.

Whether each bay shows its car at all is still the card's decision, from the chargers (see [Double garage](#double-garage)). The helpers only say which car it is.

```yaml
alias: Garage cars follow the chargers
mode: queued
triggers:
  - trigger: state
    entity_id:
      - sensor.car_a_charger_power
      - sensor.car_b_charger_power
      - binary_sensor.car_a_charge_cable
      - binary_sensor.car_b_charge_cable
      - sensor.car_a_charging
      - sensor.car_b_charging
      - sensor.sigen_ac_charger_charging_power
      - sensor.sigen_inverter_dc_charger_output_power
      - sensor.sigen_ac_charger_system_state
      - sensor.sigen_inverter_dc_charger_running_state
      - sensor.sigen_inverter_dc_charger_vehicle_soc
  # Every input above triggers it as it changes; once more at start-up,
  # for a change missed while Home Assistant was down.
  - trigger: homeassistant
    event: start
variables:
  ac: >-
    {{ states('sensor.sigen_ac_charger_charging_power')
       | float(0) | abs }}
  dc: >-
    {{ states('sensor.sigen_inverter_dc_charger_output_power')
       | float(0) | abs }}
  car_a: "{{ states('sensor.car_a_charger_power') | float(0) }}"
  car_b: "{{ states('sensor.car_b_charger_power') | float(0) }}"
  # A car is plugged in while its charge cable is (on: Connected);
  # without that sensor, unless its charging state is disconnected.
  car_a_in: >-
    {%- set cable = states('binary_sensor.car_a_charge_cable') -%}
    {%- if cable in ['on', 'off'] -%} {{ cable == 'on' }}
    {%- else -%}
      {{ states('sensor.car_a_charging')
         not in ['disconnected', 'unknown', 'unavailable'] }}
    {%- endif -%}
  car_b_in: >-
    {%- set cable = states('binary_sensor.car_b_charge_cable') -%}
    {%- if cable in ['on', 'off'] -%} {{ cable == 'on' }}
    {%- else -%}
      {{ states('sensor.car_b_charging')
         not in ['disconnected', 'unknown', 'unavailable'] }}
    {%- endif -%}
  # A charger with a vehicle connected. Sigenergy ESS 2.0
  # stores keys (ev_ready), 1.x labels (EV Ready), sigenergy2mqtt longer
  # labels (Occupied (Charging Gun plugged in...)): all read as keys.
  ac_in: >-
    {{ states('sensor.sigen_ac_charger_system_state')
       | lower | regex_replace(' \\(.*', '') | replace(' ', '_')
       in ['reserving', 'preparing', 'ev_ready', 'charging',
           'charger_and_ev_not_ready', 'charger_ready;_ev_not_ready',
           'charger_not_ready;_ev_ready'] }}
  # The DC charger reads the vehicle's SOC while its gun is in, charging
  # or not.
  dc_in: >-
    {{ states('sensor.sigen_inverter_dc_charger_vehicle_soc')
       | float(0) > 0
       or states('sensor.sigen_inverter_dc_charger_running_state')
       | lower | regex_replace(' \\(.*', '') | replace(' ', '_')
       in ['occupied', 'preparing_comm', 'charging', 'scheduled',
           'ended', 'discharging', 'preparing_insulation',
           'preparing'] }}
  # A charging car goes with the charger whose power is closest to
  # its own.
  car_a_on: >-
    {%- if car_a < 0.5 -%} none
    {%- elif (car_a - ac) | abs <= (car_a - dc) | abs -%} ac
    {%- else -%} dc
    {%- endif -%}
  car_b_on: >-
    {%- if car_b < 0.5 -%} none
    {%- elif (car_b - ac) | abs <= (car_b - dc) | abs -%} ac
    {%- else -%} dc
    {%- endif -%}
  # Nothing charging: a car that's plugged in, alone, goes with the
  # only charger that has a vehicle connected.
  parked: >-
    {%- if car_a_in and not car_b_in -%} model-y-glacier-blue
    {%- elif car_b_in and not car_a_in -%} model-3-stealth-grey
    {%- endif -%}
  parked_on: >-
    {%- if ac_in and not dc_in -%} ac
    {%- elif dc_in and not ac_in -%} dc
    {%- endif -%}
  ac_car: >-
    {%- if car_a_on == 'ac' -%} model-y-glacier-blue
    {%- elif car_b_on == 'ac' -%} model-3-stealth-grey
    {%- elif car_a_on == 'dc' -%} model-3-stealth-grey
    {%- elif car_b_on == 'dc' -%} model-y-glacier-blue
    {%- elif parked and parked_on == 'ac' -%} {{ parked }}
    {%- elif parked == 'model-y-glacier-blue' and parked_on == 'dc' -%}
      model-3-stealth-grey
    {%- elif parked and parked_on == 'dc' -%} model-y-glacier-blue
    {%- elif not car_a_in and not car_b_in -%} model-3-stealth-grey
    {%- endif -%}
  dc_car: >-
    {%- if ac_car == 'model-y-glacier-blue' -%} model-3-stealth-grey
    {%- elif ac_car -%} model-y-glacier-blue
    {%- endif -%}
actions:
  # Both plugged in, neither charging: both keep their last car.
  # Nothing plugged in: back to the default, car B on AC.
  - condition: template
    value_template: "{{ ac_car != '' }}"
  - action: input_text.set_value
    target:
      entity_id: input_text.garage_ac_car
    data:
      value: "{{ ac_car }}"
  - action: input_text.set_value
    target:
      entity_id: input_text.garage_dc_car
    data:
      value: "{{ dc_car }}"
```

<!-- Badges -->

[hacs-url]: https://my.home-assistant.io/redirect/hacs_repository/?owner=jyavenard&repository=sigenergy-flow-card&category=plugin
[hacs-badge]: https://img.shields.io/badge/hacs-default-orange.svg?style=flat-square
[release-badge]: https://img.shields.io/github/v/release/jyavenard/sigenergy-flow-card?style=flat-square&color=green
[downloads-badge]: https://img.shields.io/github/downloads/jyavenard/sigenergy-flow-card/total?style=flat-square&label=total%20downloads
[downloads-latest-badge]: https://img.shields.io/github/downloads/jyavenard/sigenergy-flow-card/latest/total?style=flat-square&label=latest%20downloads
[maintained-badge]: https://img.shields.io/badge/maintained-yes-brightgreen?style=flat-square
[activity-badge]: https://img.shields.io/github/commit-activity/y/jyavenard/sigenergy-flow-card?style=flat-square
[license-badge]: https://img.shields.io/github/license/jyavenard/sigenergy-flow-card?style=flat-square
[release-url]: https://github.com/jyavenard/sigenergy-flow-card/releases
[commits-url]: https://github.com/jyavenard/sigenergy-flow-card/commits/main
[license-url]: https://github.com/jyavenard/sigenergy-flow-card/blob/main/LICENSE

## Solar production forecast

Today's Power metrics chart shows the rest of the day dashed: the solar production and home consumption expected. Hover over them to read the forecast.

- **Solar:** Home Assistant's own solar forecast. It comes from an integration such as [Forecast.Solar](https://www.home-assistant.io/integrations/forecast_solar/), Open-Meteo Solar Forecast or Solcast, added to the solar production in the **Energy** dashboard. Without one, the card uses the average production at each time of day over the last 7 days. That average doesn't know tomorrow's weather.
- **Home:** the average consumption at each time of day over the last 7 days.

The averages come from the recorder's statistics of `pv_power` and `home_power`: 5-minute statistics (kept 10 days by default), or hourly ones.

- Those sensors need `state_class: measurement`, which the Sigenergy integrations set. Without statistics, there's no forecast.
- Sigenergy's AI forecast of the battery and grid isn't available to Home Assistant.
- `show_forecast: false` hides the forecast.

The **Solar forecast** tile shows today's solar forecast, as last revised, from `solar_forecast_today`. By default, that's the today sensor of the solar forecast set in the Energy dashboard (Forecast.Solar or Solcast). Set another entity, or `false` to hide the tile. Below the forecast:

- **(Perf today: N%)**: the solar produced so far, against the forecast up to now.
  - The forecast up to now is Home Assistant's solar forecast. While an hour is missing from it (as with Forecast.Solar, below), it's the day's forecast less the forecast's remaining-today sensor.
  - Tap the tile for a chart of today's solar produced and its forecast, both cumulative. The forecast continues dashed to the end of the day.
- **(Perf 7 days: N%)**: the solar produced over the previous 7 days, today left out, against each day's last recorded forecast.
  - It needs the forecast entity's history (the recorder keeps 10 days by default) and the statistics of `stat_pv`.
  - Days missing either are left out.

Forecast.Solar's figures are wrong away from UTC (Australia, Asia, the Americas), until Home Assistant ships a fixed `forecast-solar` library. The fix ([forecast_solar#427](https://github.com/home-assistant-libs/forecast_solar/pull/427)) is merged but not yet released; Home Assistant 2026.11 still uses 5.0.1.

- Its today and tomorrow sensors cover UTC days, not Home Assistant's days.
- The hour ending at midnight UTC is missing from its forecast.
- The Solar forecast tile and its performance figures are wrong with them.

Fallbacks:

- If the `solar_forecast_today` entity doesn't exist, the tile shows the total of Home Assistant's solar forecast instead, without the 7 days.
- Without that either, it shows the average daily production of the last 7 days, from the statistics of `stat_pv`. It's marked **(7-day average)**, without the performance figures.
- With neither, or with `solar_forecast_today: false`, **Solar produced** takes the whole row.

On a previous day (chosen at the top of the card), the tile shows that day's last recorded forecast, and **(Perf: N%)**, the day's solar produced against it. It needs the forecast entity's history for that day. Without it, **Solar produced** takes the whole row. The tile doesn't open the chart then.

## Weather forecast

The scene shows the `weather` entity's condition by day and at night: cloud, fog, rain, storms, hail, snow or wind. `weather_scene: false` keeps the clear photos.

It uses Home Assistant's forecast entity, `weather.forecast_home`, else `weather.home`. The Met.no integration, which Home Assistant sets up for your home, makes it. To use another weather integration's entity:

```yaml
entities:
  weather: weather.my_station
```

![Snowy weather](docs/screenshots/desktop-weather-snowy.png)

The photos load from GitHub like the cars.

## Inverter efficiency

Tap **SigenStor** for the battery and the inverter. The dialog shows:

- the battery's power and state of charge;
- the inverter's intake, and where it comes from: solar DC, the battery, a car on the DC charger (V2X), or AC drawn;
- its AC output, loss and efficiency;
- the whole-system efficiency;
- the battery's round trip, AC and DC.

These figures are the current readings. The chart below them covers the last 24 hours, as 5-minute means. It draws the intake, the AC power, the battery, the DC charger (when it ran) and the loss, in kW. The efficiency is in % on the right axis. At any time, the intake equals the AC output, plus what charges the battery and the car, plus the loss.

**The loss** is what the inverter takes in, less what it delivers:

- It takes in power from the PV strings, the battery and a car on the DC charger. When it charges from the grid, it also draws AC.
- It delivers AC power, and the charge of the battery and the car.
- The efficiency is what it delivers over what it takes in. It is hidden below 20 W of intake.

The card reads the solar from the strings (voltage × current, the `pv_strings` entities). Sigenergy's own PV figures (`pv_power`, `pv_strings_power` and the PV energy counters) are measured after conversion, so they show no loss.

The inverter uses some power itself, for its fans, electronics and lights. That part is about constant, so the efficiency drops at low power: 200 W is a third of a 600 W discharge.

The inverter doesn't read the strings and its AC power at the same moment. While the sun moves, the live figures can disagree for a moment. The chart's 5-minute means smooth that out.

**Whole-system efficiency** compares the loss with everything the system takes in: the strings, any third-party inverter, grid import, and battery and car discharge.

**Battery round trip** covers the last 30 days. Both figures allow for the energy the battery gained over that time.

- **(AC)** is what you get back for what you put in. It is the energy the battery returned to the house, over the energy it took from the solar or the grid to charge it. It includes the inverter's loss both ways. The card splits each hour's loss between that hour's flows, in proportion to their size. So the inverter's own consumption weighs most on low-power hours, such as a discharge at night.
- **(DC)** is the battery alone. It comes from the battery's own counters (`stat_battery_charge`, `stat_battery_discharge`), which count at the battery.

Days without statistics are left out and marked ⚠. For the AC figure, so are hours without the inverter's statistics.

**Entities:**

- With sigenergy2mqtt, the card uses its **Self-Consumed Power** sensor, which gives the loss.
- With Sigenergy ESS, the card computes the loss from `sensor.sigen_inverter_active_power` and the PV string power entities.

**Several inverters:** by default, only the first inverter is covered, as its strings are the ones the card lists. To cover them all:

1. Set `inverter_active_power` to the plant's active power: `sensor.sigen_plant_plant_active_power` (`sensor.sigen_plant_active_power` on Sigenergy ESS 2.0 installs), or sigenergy2mqtt's `sensor.sigen_0_plant_active_power` (disabled by default).
2. List every inverter's strings in `pv_strings`, with their `power` entities.
3. With sigenergy2mqtt, also set `inverter_loss_power` to `sensor.sigen_0_self_consumed_power`.

`battery_power` already covers every battery.

## Energy statistics

The **Energy statistics** panel under the scene shows where energy came from and where it went. It's a diagram from sources (solar, battery, EVDC, grid import) to consumers (battery, EVDC, load, EVAC, grid export). It covers the period chosen at the top of the card: a day, week, month, year or the whole lifetime.

- Select a source to see how its energy was shared among the consumers.
- Select a consumer to see its sources.
- The percentages and kWh are also listed under the diagram.
- Select it again to go back.
- A source or consumer unused in the period is greyed out, with 0 kWh beside it, like the mySigen app does.

**The split is an estimate.** Home Assistant only records totals (solar, grid, battery, load, chargers), not which source charged which consumer.

- The card splits each interval of the period between sources and consumers, then adds the intervals up.
- An interval is 5 minutes for a day, an hour for a week or month, and a day for a year or lifetime.
- A device never feeds itself.
- Each source favours some consumers over others. For instance, solar favours the batteries and EVDC over the house.
- The preferences are fitted to the flows the Sigenergy app showed for one system. They reproduce them within a few hundredths of a kWh on that data. Other systems may differ somewhat.

**What it needs:** the totals come from the long-term statistics of the lifetime energy counters, so the panel needs the Home Assistant recorder and these sensors.

- The card reads them from `entities`: the `stat_*` keys, `third_party_pv_lifetime_energy` for a third-party inverter's solar, and `dc_charger_lifetime_charged_energy` and `dc_charger_lifetime_discharged_energy` for EVDC.
- **Load** has no sensor. As in the Sigenergy portal, it's what the sources supplied beyond the other consumers.
- A source or consumer whose sensor doesn't exist is left out.
- The Sigenergy integration disables the plant's EVDC and EVAC totals by default. The card then falls back to the first inverter's DC charger totals and the AC charger's energy consumed, which are enabled. With DC chargers on several inverters, enable the plant's EVDC totals to count them all.
- `show_energy_statistics: false` hides the panel.

## sigenergy2mqtt

With `sigenergy_backend: sigenergy2mqtt`, the card reads the entities [sigenergy2mqtt](https://github.com/seud0nym/sigenergy2mqtt) publishes to Home Assistant. It assumes sigenergy2mqtt's default entity ID prefix `sigen` and plant `0`.

- Inverter and charger entities carry their Modbus device address.
- The defaults assume the inverter, and its DC charger, at address 1.
- For the AC charger, the card tries address 1, then 2.
- With another prefix or address, set the affected keys under `entities:`. They still replace the defaults.

```yaml
type: custom:sigenergy-flow-card
sigenergy_backend: sigenergy2mqtt
```

| Key | sigenergy2mqtt default |
| --- | --- |
| `pv_power` | `sensor.sigen_0_total_pv_power`, fallback `sensor.sigen_0_plant_pv_power` |
| `home_power` | `sensor.sigen_0_general_load_power`; without it, calculated (see below) |
| `battery_power` | `sensor.sigen_0_plant_battery_power`, fallback `sensor.sigen_0_inverter_1_charge_discharge_power` |
| `battery_soc` | `sensor.sigen_0_plant_battery_soc`, fallback `sensor.sigen_0_inverter_1_battery_soc` |
| `battery_capacity` | `sensor.sigen_0_plant_rated_energy_capacity`, fallback `sensor.sigen_0_inverter_1_rated_battery_capacity` |
| `battery_charge_cut_off_soc` | `number.sigen_0_plant_ess_charge_cut_off_soc` |
| `battery_discharge_cut_off_soc` | `number.sigen_0_plant_ess_discharge_cut_off_soc` |
| `battery_backup_soc` | `number.sigen_0_plant_ess_backup_soc` |
| `grid_status` | `sensor.sigen_0_plant_grid_status` |
| `grid_import_power` | `sensor.sigen_0_grid_sensor_import_power` |
| `grid_export_power` | `sensor.sigen_0_grid_sensor_export_power` |
| `phase_mode` | `switch.sigen_0_plant_independent_phase_power_control` |
| `grid_voltage` | none (the phases' average voltage) |
| `grid_phase_a_voltage`, `…_b_…`, `…_c_…` | `sensor.sigen_0_inverter_1_phase_a_voltage`, `…_b_…`, `…_c_…` |
| `grid_phase_a_current`, `…_b_…`, `…_c_…` | `sensor.sigen_0_inverter_1_phase_a_current`, `…_b_…`, `…_c_…` |
| `grid_power_factor` | `sensor.sigen_0_inverter_1_power_factor` |
| `grid_import_price`, `grid_export_price` | the Energy dashboard's |
| `grid_phase_a_active_power`, `…_b_…`, `…_c_…` | `sensor.sigen_0_plant_grid_phase_a_active_power`, `…_b_…`, `…_c_…` |
| `ac_charger_power` | `sensor.sigen_0_ac_charger_1_charging_power`, fallback `sensor.sigen_0_ac_charger_2_charging_power`, then `sensor.sigen_0_ac_charger_1_rated_charging_power`, then `sensor.sigen_0_ac_charger_2_rated_charging_power` |
| `ac_charger_state` | `sensor.sigen_0_ac_charger_1_running_state`, fallback `sensor.sigen_0_ac_charger_2_running_state` |
| `ac_charger_total_energy` | `sensor.sigen_0_ac_charger_1_total_energy_consumed`, fallback `sensor.sigen_0_ac_charger_2_total_energy_consumed` |
| `ac_charger_vehicle_soc` | none |
| `ac_charger_vehicle_range` | none |
| `ac_charger_power_2`, `ac_charger_state_2`, `ac_charger_total_energy_2` | found (see [Two AC chargers](#two-ac-chargers)) |
| `ac_charger_vehicle_soc_2`, `ac_charger_vehicle_range_2` | none |
| `dc_charger_power` | `sensor.sigen_0_dc_charger_1_output_power` |
| `dc_charger_state` | `sensor.sigen_0_dc_charger_1_running_state` |
| `dc_charger_vehicle_soc` | `sensor.sigen_0_dc_charger_1_vehicle_soc` |
| `dc_charger_limit` | `number.sigen_0_dc_charger_1_max_charging_power_limit` |
| `car_charging` | none |
| `car_charging_2` | none |
| `dc_charger_lifetime_charged_energy` | `sensor.sigen_0_evdc_total_charge_energy`, fallback `sensor.sigen_0_si_evdc_total_charge_energy`, then `sensor.sigen_0_dc_charger_1_total_charging_capacity` |
| `dc_charger_lifetime_discharged_energy` | `sensor.sigen_0_evdc_total_discharge_energy`, fallback `sensor.sigen_0_si_evdc_total_discharge_energy`, then `sensor.sigen_0_dc_charger_1_total_discharging_capacity` |
| `pv_strings_power` | `sensor.sigen_0_plant_pv_power`, fallback `sensor.sigen_0_inverter_1_pv_power` |
| `pv_strings_lifetime_energy` | `sensor.sigen_0_si_total_self_pv_generation`, fallback `sensor.sigen_0_plant_lifetime_pv_energy`, then `sensor.sigen_0_inverter_1_lifetime_pv_energy` |
| `third_party_pv_power` | `sensor.sigen_0_third_party_pv_power` |
| `third_party_pv_daily_energy` | none |
| `third_party_pv_lifetime_energy` | `sensor.sigen_0_third_party_pv_lifetime_production`, fallback `sensor.sigen_0_si_total_third_party_pv_generation` |
| `inverter_active_power` | `sensor.sigen_0_inverter_1_active_power` |
| `inverter_loss_power` | `sensor.sigen_0_inverter_1_self_consumed_power` |
| `daily_pv_energy` | `sensor.sigen_0_total_daily_pv_energy`, fallback `sensor.sigen_0_daily_pv_energy`, then `sensor.sigen_0_inverter_1_daily_pv_energy` |
| `daily_grid_import_energy` | `sensor.sigen_0_grid_sensor_daily_import_energy` |
| `daily_grid_export_energy` | `sensor.sigen_0_grid_sensor_daily_export_energy` |
| `daily_battery_charge_energy` | `sensor.sigen_0_daily_charge_energy`, fallback `sensor.sigen_0_inverter_1_daily_charge_energy` |
| `stat_pv` | `sensor.sigen_0_lifetime_pv_energy`, fallback `sensor.sigen_0_plant_lifetime_pv_energy`, then `sensor.sigen_0_si_total_self_pv_generation`, then `sensor.sigen_0_inverter_1_lifetime_pv_energy` (the first inverter alone) |
| `stat_battery_charge` | `sensor.sigen_0_accumulated_charge_energy`, fallback `sensor.sigen_0_si_total_charged_energy` |
| `stat_battery_discharge` | `sensor.sigen_0_accumulated_discharge_energy`, fallback `sensor.sigen_0_si_total_discharged_energy` |
| `stat_grid_import` | `sensor.sigen_0_grid_sensor_lifetime_import_energy`, fallback `sensor.sigen_0_si_total_imported_energy` |
| `stat_grid_export` | `sensor.sigen_0_grid_sensor_lifetime_export_energy`, fallback `sensor.sigen_0_si_total_exported_energy` |
| `stat_evac_charge` | `sensor.sigen_0_si_total_ev_ac_charged_energy`, fallback `sensor.sigen_0_ac_charger_1_total_energy_consumed`, then `sensor.sigen_0_ac_charger_2_total_energy_consumed` |
| `daily_battery_discharge_energy` | `sensor.sigen_0_daily_discharge_energy`, fallback `sensor.sigen_0_inverter_1_daily_discharge_energy` |
| `solar_forecast_today` | the Energy dashboard's solar forecast: `sensor.energy_production_today` (Forecast.Solar) or `sensor.solcast_pv_forecast_forecast_today` (Solcast) |

Notes:

- `total_pv_power`, `total_daily_pv_energy` and `lifetime_pv_energy` include the third-party inverter. They're enabled by default.
- The fallbacks count only the Sigenergy PV: `plant_pv_power`, `daily_pv_energy`, `plant_lifetime_pv_energy`, and the `si_` and inverter counters. `plant_lifetime_pv_energy` and the `si_` counters are disabled by default.
- sigenergy2mqtt has no daily energy for a third-party inverter, so `third_party_pv_daily_energy` has no default. With a fallback, the **Solar produced** tile counts only the Sigenergy PV.
- Before July 2025, `lifetime_pv_energy` was sigenergy2mqtt's own sum of PV power. On installs that old, its statistics can jump that month. That shows as extra solar in a Year or Lifetime range that spans it. Developer Tools → Statistics can fix the jump.
- The `si_` sensors come from the Statistics Interface. Its counters restart from 0 when the firmware gains it, so the card tries the plant's lifetime counters first.
- `ac_charger_power` falls back to `rated_charging_power`, sigenergy2mqtt's name before February 2026. Home Assistant keeps the entity ID it first registered, so installs from before then still have it.
- `home_power` is General Load Power: the home without the EV chargers. The card doesn't use Total Load Power, nor `sensor.sigen_0_consumed_power`, which copies it with sigenergy2mqtt's default `consumption` setting. Both include the DC charger.
- Without General Load Power, HOME is calculated: solar + grid import − grid export − battery charging − AC charger − DC charger. This applies to the chart and the forecast too, unless `home_power` is set. sigenergy2mqtt removes a sensor whose register the inverter doesn't provide, so some systems have no General Load Power.

## Plant and inverter sensors

Plant sensors are the primary data source. They combine every inverter and battery in the system, while an inverter sensor reports only its own unit. Inverter sensors are the fallback, used only when the matching plant sensor doesn't exist or is unavailable.

| Value | Primary source (plant) | Secondary / fallback source (inverter) |
|---|---|---|
| Battery power | `sensor.sigen_plant_battery_power` | `sensor.sigen_inverter_battery_power` |
| Battery state of charge | `sensor.sigen_plant_battery_state_of_charge` | `sensor.sigen_inverter_battery_state_of_charge` |
| Today's solar produced | `sensor.sigen_plant_daily_pv_energy` | `sensor.sigen_inverter_daily_pv_energy` |
| Today's battery charged | `sensor.sigen_plant_daily_battery_charge_energy` | `sensor.sigen_inverter_daily_charge_energy` |
| Today's battery discharged | `sensor.sigen_plant_daily_battery_discharge_energy` | `sensor.sigen_inverter_daily_discharge_energy` |

The DC charger is attached to an inverter, so its entities are inverter sensors only: `sensor.sigen_inverter_dc_charger_output_power`, `sensor.sigen_inverter_dc_charger_vehicle_soc` and `number.sigen_inverter_dc_charger_max_charging_power_limit` (`…_maximum_charging_power_limit` on Sigenergy ESS 2.0 installs).

## Battery modules

mySigen knows each battery module. Two integrations bring those readings into Home Assistant:

- the [Sigenergy ESS – mySigen cloud](https://github.com/TypQxQ/Sigenergy-Local-Modbus-mySigen) add-on, for Sigenergy ESS;
- [sigenergy2mqtt](https://github.com/seud0nym/sigenergy2mqtt), with its Cloud access set up.

With either one, tap the SigenStor in the photo. The dialog shows the stack: the inverter, the DC charger, then each module filled to its charge level. Without them, the photo isn't clickable.

Beside each module:

- its state of charge;
- its average cell temperature and voltage;
- its total energy discharged;
- its cycles: the energy discharged over its rated capacity.

Tap a reading, other than cycles, to chart it for every module over the last 24 hours.

The card finds the modules by itself; there is nothing to configure. A reading whose entity is disabled shows "—".

The add-on reads each module about every 5 minutes, so the charts move in steps. Total energy discharged moves in steps of 10 kWh, as mySigen reports it in MWh.

With sigenergy2mqtt, enable each module's **Rated Battery Capacity** sensor (`sensor.sigen_0_cloud_4_<serial>_rated_battery_capacity`) for the cycles. It is disabled by default.

With several inverters, each one gets its own stack.

## Style

`style` selects the photo:

- `auto` (default): day between today's sunrise and sunset, night otherwise. The times are the ones shown under the chart. Without a location, the card uses `sun.sun`.
- `day`: always the day photo.
- `night`: always the night photo.

`theme` selects the colours:

- `auto` (default): Home Assistant's light or dark mode, as set in your profile. Its Auto setting follows the device. On an older Home Assistant that doesn't report it, the colours follow the photo: light by day, dark by night.
- `light`: always the light colours.
- `dark`: always the dark colours.

```yaml
type: custom:sigenergy-flow-card
style: day
theme: dark
```

## Flow animation

- Each flow's highlight moves from its source to its destination at `60 + 35 × √kW` scene units per second, using that flow's own power. So a 5 kW flow runs about 1.6 times faster than a 0.6 kW one.
- A flow below 0.025 kW is idle.
- The short branch of the home line, into the glass doors, continues the home flow's animation from where it forks, at the same speed.
- With *reduce motion* on in the operating system, the lines show without moving highlights.
- `flow_line_scale` makes the lines and highlights thicker or thinner. They scale with the photo either way.

## Custom entities

The solar keys `pv_power`, `daily_pv_energy` and `stat_pv` cover all PV, the third-party inverter's included.

- An entity you set for one of them is taken as that total.
- Some defaults count only the Sigenergy PV. With a third-party inverter fitted, the card adds its energy to them (`third_party_pv_daily_energy`, `third_party_pv_lifetime_energy`).

> **Third-party inverter, especially as the only PV (Sigenergy ESS):** enable **Total Generation of Third Party Inverter** (`sensor.sigen_plant_total_generation_of_third_party_inverter`) on the plant device, under Settings → Devices & services → Sigenergy. The integration creates it disabled.
>
> The totals for past periods, the Energy metrics and the Energy statistics read the solar from the lifetime counters. Without this one, the card falls back to the statistics of **Daily Third Party Inverter Energy**. Those miss any time Home Assistant wasn't recording. Home Assistant keeps statistics only from when the sensor is enabled.

You can replace every entity the card reads under `entities:`. For each key:

- **Not set:** the card uses the default for the `sigenergy_backend`. For the plant/inverter pairs, that's the plant sensor first, then the inverter one. The table below lists the Sigenergy ESS defaults; [sigenergy2mqtt](#sigenergy2mqtt) lists that backend's.
  - With Sigenergy ESS, each default follows its device's registered entity IDs. A plant in the Garage area reads `sensor.garage_sigen_plant_pv_power` for `sensor.sigen_plant_pv_power`.
- **Set to an entity ID:** the card uses that entity, with no fallback.
- **Set to `false`:** the item is hidden. Its tile, line or charger disappears.

Units:

- Power can be in W, kW or MW, and energy in Wh, kWh or MWh. The card converts them to kW and kWh from each entity's unit.
- Power shows in W below 1 kW, in kW up to 1000 kW, and in MW above.
- An unknown key, or a value that isn't an entity ID, shows a configuration error.

| Key | Default | Used for |
| --- | --- | --- |
| `pv_power` | `sensor.sigen_plant_pv_power` | SOLAR value, solar wire, chart. All PV, the third-party inverter's included. |
| `home_power` | `sensor.sigen_plant_consumed_power` | HOME value, home wire, chart, home usage dialog |
| `battery_power` | `sensor.sigen_plant_battery_power`, fallback `sensor.sigen_inverter_battery_power` | Battery value and status, wire, chart. Positive while charging (see `battery_power_invert`). |
| `battery_soc` | `sensor.sigen_plant_battery_state_of_charge`, fallback `sensor.sigen_inverter_battery_state_of_charge` | SOC label, tile, bar and stored-energy history |
| `battery_capacity` | `sensor.sigen_plant_rated_energy_capacity` | Stored energy (SOC × capacity), battery remaining time |
| `battery_charge_cut_off_soc` | `sensor.sigen_plant_charge_cut_off_soc`, fallback `number.sigen_plant_ess_charge_cut_off_state_of_charge` | Remaining time while charging. Without it, the time counts to 100%. Disabled by default in the Sigenergy integration. |
| `battery_discharge_cut_off_soc` | `sensor.sigen_plant_discharge_cut_off_soc`, fallback `number.sigen_plant_ess_discharge_cut_off_state_of_charge` | Remaining time while discharging off grid, and the idle power-cut estimate. Without it, the time counts to 0%. Disabled by default in the Sigenergy integration. |
| `battery_backup_soc` | `number.sigen_plant_ess_backup_state_of_charge` | Remaining time while discharging on grid, down to this SOC (see `battery_remaining_target`). Disabled by default in the Sigenergy integration. |
| `grid_status` | `sensor.sigen_plant_grid_connection_status` | On or off grid. Off grid, GRID is hidden and the title ends with "(Off Grid)". Also the remaining time's target. Without it, or with `false`, the card assumes on grid. |
| `grid_import_power` | `sensor.sigen_plant_grid_import_power` | GRID value and status, wire, chart. Positive while importing. |
| `grid_export_power` | `sensor.sigen_plant_grid_export_power` | GRID value and status, wire, chart. Positive while exporting. |
| `phase_mode` | `switch.sigen_plant_independent_phase_power_control` | Phase power mode line under GRID |
| `grid_voltage` | none (the phases' average voltage) | Value beside GRID with `show_grid_voltage` |
| `grid_phase_a_voltage`, `grid_phase_b_voltage`, `grid_phase_c_voltage` | `sensor.sigen_inverter_phase_a_voltage`, `…_b_…`, `…_c_…` | The inverter's voltage on each phase, in the grid details. Also phase detection and the GRID voltage. Disabled by default in the Sigenergy integration. |
| `grid_phase_a_current`, `grid_phase_b_current`, `grid_phase_c_current` | `sensor.sigen_inverter_phase_a_current`, `…_b_…`, `…_c_…` | The inverter's current on each phase, in the grid details. With the voltage, it gives the apparent power. Disabled by default in the Sigenergy integration. |
| `grid_power_factor` | `sensor.sigen_inverter_power_factor` | The inverter's power factor, in the grid details. Disabled by default in the Sigenergy integration. |
| `grid_import_price`, `grid_export_price` | the Energy dashboard's | Your electricity retailer's buy and sell prices, under GRID while importing or exporting. `false` hides them (see [Electricity prices](#electricity-prices)). |
| `grid_phase_a_active_power`, `grid_phase_b_active_power`, `grid_phase_c_active_power` | `sensor.sigen_plant_grid_phase_a_active_power`, `…_b_…`, `…_c_…` | The grid sensor's power on each phase, positive while importing, in the grid details. Also phase detection. Disabled by default in the Sigenergy integration. |
| `ac_charger_power` | `sensor.sigen_ac_charger_charging_power` | AC charger value, chart. The AC charger only appears if this exists. |
| `ac_charger_state` | `sensor.sigen_ac_charger_system_state` | AC charger state text |
| `ac_charger_total_energy` | `sensor.sigen_ac_charger_total_energy_consumed` | AC charger energy consumed |
| `ac_charger_vehicle_soc` | none | Vehicle battery level on the AC charger |
| `ac_charger_vehicle_range` | none | Vehicle range on the AC charger |
| `ac_charger_power_2`, `ac_charger_state_2`, `ac_charger_total_energy_2` | found (see [Two AC chargers](#two-ac-chargers)) | A second AC charger's power, state and energy consumed |
| `ac_charger_vehicle_soc_2`, `ac_charger_vehicle_range_2` | none | Vehicle battery level and range on the second AC charger |
| `dc_charger_power` | `sensor.sigen_inverter_dc_charger_output_power` | DC charger value, chart. The DC charger only appears if this exists. |
| `dc_charger_state` | `sensor.sigen_inverter_dc_charger_running_state` | DC charger state. A vehicle shows in the garage while it's connected: Occupied, Preparing, Charging, Scheduled, Ended or Discharging. |
| `dc_charger_vehicle_soc` | `sensor.sigen_inverter_dc_charger_vehicle_soc` | Vehicle battery level on the DC charger. It's above 0 while a vehicle is plugged in, which shows it in the garage. |
| `dc_charger_limit` | `number.sigen_inverter_dc_charger_max_charging_power_limit`, fallback `number.sigen_inverter_dc_charger_maximum_charging_power_limit` (Sigenergy ESS 2.0 installs) | Opens when you tap the DC charger (⚙) |
| `car_charging` | none | Shows the car in the garage while on, `charging` or above 0, e.g. a car's or third-party charger's charging sensor |
| `car_charging_2` | none | With the double garage, shows the second car while on, `charging` or above 0 |
| `dc_charger_lifetime_charged_energy` | `sensor.sigen_plant_total_charged_energy_of_the_evdc`, fallback `sensor.sigen_inverter_dc_charger_total_charging_capacity`, then `sensor.sigen_inverter_dc_charger_total_charging_energy` (Sigenergy ESS 2.0 installs) | DC charger lifetime line (↓ charged) |
| `dc_charger_lifetime_discharged_energy` | `sensor.sigen_plant_total_discharged_energy_of_the_evdc`, fallback `sensor.sigen_inverter_dc_charger_total_discharging_capacity`, then `sensor.sigen_inverter_dc_charger_total_discharging_energy` (Sigenergy ESS 2.0 installs) | DC charger lifetime line (↑ discharged, hidden while 0) |
| `pv_strings_power` | `sensor.sigen_plant_sigen_pv_power` | PV Strings **Total** power, for the Sigenergy PV inputs. The Total row adds `third_party_pv_power`. |
| `pv_strings_lifetime_energy` | `sensor.sigen_plant_total_generation_of_self_pv`, fallback `sensor.sigen_plant_total_pv_generation`, then `sensor.sigen_inverter_total_pv_energy` | PV Strings **Total** lifetime energy, for the Sigenergy PV inputs. The Total row adds `third_party_pv_lifetime_energy`. Systems with only Sigenergy PV usually have just `sensor.sigen_plant_total_pv_generation` enabled. |
| `third_party_pv_power` | `sensor.sigen_plant_third_party_pv_power` | PV Strings **Third-party PV** row and chart line |
| `third_party_pv_daily_energy` | `sensor.sigen_plant_daily_third_party_inverter_energy` | PV Strings **Third-party PV** row (Today). Added to a Sigenergy-only `daily_pv_energy` default. |
| `third_party_pv_lifetime_energy` | `sensor.sigen_plant_total_generation_of_third_party_inverter` | PV Strings **Third-party PV** row (Lifetime). Added to a Sigenergy-only `stat_pv` default. |
| `inverter_active_power` | `sensor.sigen_inverter_active_power` | The first inverter's AC power, for its loss and efficiency (see [Inverter efficiency](#inverter-efficiency)) |
| `inverter_loss_power` | none (computed) | The first inverter's loss, when an entity gives it. Otherwise the card computes it. |
| `daily_pv_energy` | `sensor.sigen_plant_daily_pv_energy`, fallback `sensor.sigen_inverter_daily_pv_energy` (the Sigenergy PV, plus `third_party_pv_daily_energy`) | Solar produced tile, PV Strings **Total** (Today). All PV, the third-party inverter's included. |
| `daily_grid_import_energy` | `sensor.sigen_plant_daily_grid_import_energy` | Grid imported tile |
| `daily_grid_export_energy` | `sensor.sigen_plant_daily_grid_export_energy` | Grid exported tile |
| `daily_battery_charge_energy` | `sensor.sigen_plant_daily_battery_charge_energy`, fallback `sensor.sigen_inverter_daily_charge_energy` | Battery charged tile |
| `daily_battery_discharge_energy` | `sensor.sigen_plant_daily_battery_discharge_energy`, fallback `sensor.sigen_inverter_daily_discharge_energy` | Battery discharged tile |
| `solar_forecast_today` | the Energy dashboard's solar forecast (Forecast.Solar or Solcast) | Solar forecast tile: today's forecast for all PV, in energy (see [Solar production forecast](#solar-production-forecast)) |
| `stat_pv` | `sensor.sigen_plant_total_pv_generation` (the Sigenergy PV, plus `third_party_pv_lifetime_energy`) | Energy statistics' solar, PV Strings **Total** (Lifetime). All PV, the third-party inverter's included. |
| `stat_battery_discharge` | `sensor.sigen_plant_total_discharged_energy_of_the_ess` | Energy statistics: the battery as a source |
| `stat_battery_charge` | `sensor.sigen_plant_total_charged_energy_of_the_ess` | Energy statistics: the battery as a consumer |
| `stat_grid_import` | `sensor.sigen_plant_total_imported_energy` | Energy statistics: the grid as a source |
| `stat_grid_export` | `sensor.sigen_plant_total_exported_energy` | Energy statistics: the grid as a consumer |
| `stat_evac_charge` | `sensor.sigen_plant_total_charged_energy_of_the_evac`, fallback `sensor.sigen_ac_charger_total_energy_consumed` | Energy statistics: the AC charger |
| `weather` | `weather.forecast_home`, fallback `weather.home` | Weather icon and temperature at the top left of the scene. Hidden when the entity doesn't exist. Tap it to open the forecast. |

An example for another brand:

```yaml
type: custom:sigenergy-flow-card
battery_power_invert: true
entities:
  pv_power: sensor.inverter_pv_power
  home_power: sensor.inverter_load_power
  battery_power: sensor.inverter_battery_power
  battery_soc: sensor.inverter_battery_soc
  battery_capacity: sensor.battery_capacity
  grid_import_power: sensor.grid_import_power
  grid_export_power: sensor.grid_export_power
  daily_pv_energy: sensor.pv_energy_today
  daily_grid_import_energy: sensor.grid_import_today
  daily_grid_export_energy: sensor.grid_export_today
  daily_battery_charge_energy: sensor.battery_charge_today
  daily_battery_discharge_energy: sensor.battery_discharge_today
  phase_mode: false
  ac_charger_power: false
  dc_charger_power: false
pv_strings:
  - name: East
    power: sensor.pv1_power
    voltage: sensor.pv1_voltage
    current: sensor.pv1_current
    daily_energy: false
    accumulated_energy: false
  - name: West
    power: sensor.pv2_power
    voltage: sensor.pv2_voltage
    current: sensor.pv2_current
    daily_energy: false
    accumulated_energy: false
```

## Using the card with a third-party charger

A charger from another brand can take the AC charger's place: point the AC charger's keys at its entities.

- Sigenergy doesn't know about it, so its home consumption (`sensor.sigen_plant_consumed_power`) includes the charger's power.
- `home_includes_ac_charger: true` deducts it from HOME, the Power metrics' Home line and the home's forecast.
- Energy statistics and Energy metrics need nothing. Their Load is what's left once the other flows, the charger included, are counted.

```yaml
home_includes_ac_charger: true
entities:
  ac_charger_power: sensor.wallbox_charging_power          # W or kW
  ac_charger_total_energy: sensor.wallbox_total_energy     # the lifetime reading
  stat_evac_charge: sensor.wallbox_total_energy            # the EVAC in Energy statistics and Energy metrics
  car_charging: binary_sensor.wallbox_cable_connected      # the car and its plugged-in cable while a car is connected
```

- `ac_charger_state` only knows Sigenergy's states. So `car_charging` takes the charger's (or the car's) plugged-in sensor instead.
- With sigenergy2mqtt and General Load Power disabled (its default), HOME is the balance of the other flows, which already leaves the charger out. The option has no effect then.

**A charger on the Gateway's smart port:** Sigenergy sees it as a smart load and counts its power in the home's consumption. It's set up like any other third-party charger, with the smart load's sensors.

1. Enable the smart load's power and total consumption sensors. Both integrations create them disabled. The number is the smart port's slot.
   - Sigenergy ESS: `sensor.sigen_plant_smart_load_1_power` and `sensor.sigen_plant_smart_load_1_total_consumption`.
   - sigenergy2mqtt: `sensor.sigen_0_smart_load_01_power` and `sensor.sigen_0_smart_load_01_total_consumption`.
2. Point the AC charger's keys at them:

   ```yaml
   home_includes_ac_charger: true
   entities:
     ac_charger_power: sensor.sigen_plant_smart_load_1_power
     ac_charger_total_energy: sensor.sigen_plant_smart_load_1_total_consumption
     stat_evac_charge: sensor.sigen_plant_smart_load_1_total_consumption
     car_charging: binary_sensor.garage_tesla_wall_connector_vehicle_connected
   ```

- The smart port reports only power and energy. `car_charging` takes the charger's own "vehicle connected" sensor, so the car and its cable show while it's plugged in, charging or not. The example is a Tesla Wall Connector named Garage, through Home Assistant's Tesla Wall Connector integration.
- The charger reads as charging while the smart load draws power. Its "contactor closed" sensor isn't needed.
- Home Assistant keeps statistics only from when a sensor is enabled, so EVAC in past periods starts then.

**When the car shows:** by default (`car_shown: auto`), the car in the garage only shows while one of these is true:

- a vehicle is connected to the AC charger (`ac_charger_state` reads Reserving, Preparing, EV Ready or Charging);
- the AC charger draws power;
- a vehicle is connected to the DC charger: it reports the vehicle's SOC, or `dc_charger_state` reads Occupied, Preparing, Charging, Scheduled, Ended or Discharging;
- the DC charger charges or discharges (V2H);
- the `car_charging` entity is on, `charging` or above 0.

`car_shown` changes this:

- `true` shows the car all the time; `false` never shows it.
- A `binary_sensor`, e.g. your car's "at home" or "plugged in" sensor: the car shows while it's on.
- A `device_tracker`, your car's location: the car shows while it's `home`.
- While either is unknown or unavailable, the card falls back to `auto`.

**The cable and light:**

- While the car shows and a vehicle is connected to its charger (or charging, by the same rules), the cable runs to the car. The charger's light is green.
- While the charger also has power, or reads Charging, the light glows and pulses. It stays steady with reduced motion.
- Otherwise, the cable hangs in a loop beside the charger.
- With `car_shown: true` and no vehicle connected, the car shows with the cable hanging.

## Changing the car

`car` replaces the car in the garage with one from the card's [`cars/`](cars) folder, listed in [`cars/cars.json`](cars/cars.json), by name:

```yaml
car: byd-atto3-orange
```

Or name an entity whose state is the car's name, such as an `input_select`, or a template sensor that says which car is plugged in. The garage follows its state:

```yaml
car: input_select.garage_car
```

While the entity is unknown or unavailable, or its state isn't a car's name, the card shows the built-in car.

<!-- cars: generated from cars/cars.json by tools/make-car.py -->
- `audi-q4-etron-black`: Audi Q4 e-tron, Black
- `byd-atto3-orange`: BYD Atto 3, Orange
- `byd-seal-indigo-grey`: BYD Seal, Indigo Grey
- `lotus-eletre-red`: Lotus Eletre, Red
- `mazda-cx80-machine-grey`: Mazda CX-80 PHEV, Machine Grey Metallic
- `mg-zsev-diamond-red`: MG ZS EV Excite, Diamond Red
- `mg4-camden-grey`: MG4, Camden Grey
- `mg4-urban-stone-green`: MG4 Urban, Stone Green
- `peugeot-e3008-ingaro-blue`: Peugeot E-3008, Ingaro Blue
- `polestar-2-storm`: Polestar 2, Storm
- `taycan-dolomite-grey`: Porsche Taycan, Dolomite Grey
- `model-3-stealth-grey`: Tesla Model 3, Stealth Grey
- `model-y-glacier-blue`: Tesla Model Y, Glacier Blue
- `model-y-stealth-grey`: Tesla Model Y, Stealth Grey
- `volvo-ex90-black`: Volvo EX90, Black
<!-- end cars -->

- The card loads the car from GitHub, so a car added there is available without updating the card.
- A name that doesn't load leaves the built-in car. The browser's console says which image is missing.
- The cars are overlays made by `tools/make-car.py`: small transparent images of the garage's inside. The card draws them at a fixed place over its own photo, so they can't move the house, the battery or the flows.
- `car_image` and `car_image_night` take your own overlay instead, by URL. A file in `/config/www/` works as `/local/<name>-day.avif`.

To make another car:

1. Run `python3 tools/make-car.py --sources DIR`. It writes `car-source-day.png` and `car-source-night.png`: the card's photos without the charger.
2. Ask an image generator (ChatGPT and Gemini work) to edit them, with the request in [`cars/PROMPT.md`](cars/PROMPT.md). Attach a photo of the real car as a reference. The request asks it to:
   - replace the car in the garage with your model and colour;
   - park it in the same place, at the same size and angle;
   - change nothing else, and keep the images at 1676 × 469.
3. Run `python3 tools/make-car.py car-day.png car-night.png cars/<name> --model "<model>" --colour "<colour>"`. It:
   - aligns each result to the card's photo, and refuses it if the house was reframed or redrawn;
   - writes `cars/<name>-day.avif`, `cars/<name>-night.avif` and `cars/<name>-preview.png`;
   - adds the car to `cars/cars.json` and to the list above.

   Check the preview: a car that the generator scaled or moved inside the garage still looks wrong.

Made a car that isn't listed? Please share it so others can use it too:

- Open a pull request with what step 3 wrote for a `<model>-<colour>` name: the two images, `cars/cars.json` and the README. Put the preview in its description.
- If you can't run the tool, open an issue with the two images from the generator, and the car's model and colour.

## Changing the artwork

The images:

- `images/house_day.png` and `images/house_night.png` are the scene photos. They show the house without a car charger.
- `images/garage_day.png` and `images/garage_night.png` are the same photos with the car removed, in the first photo's frame (1676 pixels wide). The tool keeps only the garage's inside from them, cut at the pillar the photos keep. The card draws that patch over the car to hide it.
- `images/charger_day.png` and `images/charger_night.png` are the charger on the garage wall: a separate transparent image of the same size. The card draws it only when an AC or DC charger is present.
- `images/charger_day_plugged.png` and `images/charger_night_plugged.png` show the charger plugged into the car.
- `images/charger_day_led.png` and `images/charger_night_led.png` are its light's glow while charging.
- `tools/make-plugged.py` makes the plugged and light images from the other two. It paints out the connector, turns the light green, and draws the cable into the dark under the car's front.

`tools/embed-artwork.py` embeds the images in the card:

- It places each photo in the card's coordinates, with a scale and offset measured against the first photo and kept in the tool.
- It adds a short band above and below for the readings.
- It scales each charger to the wall position.

After changing any image, regenerate the embedded copy. It needs [Pillow](https://python-pillow.org) 11.3 or later, for AVIF, and [NumPy](https://numpy.org). If a new photo is framed differently, update its entry in `REGISTRATION` first.

```sh
python3 tools/embed-artwork.py
```

The weather photos are made from the renders in `images/weather/`: `<condition>.jpg`, `<condition>-empty.jpg` without the car, and `<condition>-night.jpg`.

```sh
python3 tools/make-weather.py [condition ...]
```

## Utilities

Small Python scripts in `tools/` query the system directly over Modbus TCP (port 502). They need [pymodbus](https://github.com/pymodbus-dev/pymodbus). Each takes the Sigenergy system's address as its only argument, e.g. `tools/sigen_soc.py 192.168.1.50`.

- `tools/sigen_soc.py`: prints the battery state of charge.
- `tools/sigen_powermode.py`: reports whether Independent Phase Control is active.
- `tools/sigen_evac.py`: scans Modbus device IDs to find the AC charger (EVAC), and prints its total energy consumed.

The card itself reads everything from Home Assistant entities, battery level, phase power mode and AC charger energy included. It doesn't need these scripts: they're for use outside Home Assistant.

`tools/screenshots.js` regenerates the screenshots in `docs/screenshots/`. It renders one simulated day and the week before it, so the tiles, charts and statistics agree. It uses WebKit through [Playwright](https://playwright.dev), and needs Node.js (see the comment at its top).

## License

Copyright 2025-2026 Jean-Yves Avenard. Licensed under the [Apache License, Version 2.0](LICENSE).

## Acknowledgements

The original YAML version of this dashboard came from [this gist](https://gist.github.com/fbradyirl/08fef90bd11d7bdddf588a56e668d879).
