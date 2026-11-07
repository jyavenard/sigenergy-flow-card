/*
 * Copyright 2025-2026 Jean-Yves Avenard
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* Sigenergy Flow Card v71.3 — standalone Home Assistant Lovelace custom card */

// Scene coordinates: the house photo (1676x557 units) sits between a band above it for the SOLAR and HOME
// readings and a band below it for SigenStor and GRID. tools/embed-artwork.py builds both bands from
// the photo's edge rows, plus [bleed] more beyond the scene that shows when the card is taller than
// the scene; its TOP and BOTTOM must equal top + bleed and bottom + bleed.
// [keep] is the horizontal range (house and readings) that is never cropped as the card narrows.
// Below [narrowBelow] px in portrait, [keepNarrow] (the house and its readings, from the garage to the right wall)
// is protected instead; the SOLAR and HOME readings sit left of their leaders and the charger readings
// move onto the garage, to stay inside it.
const PHOTO = { width: 1676, height: 557, top: 56, bottom: 60, bleed: 100 };
// Where a car_image goes, in ARTWORK's coordinates (tools/make-car.py's CAR_FRAME, 44 units lower).
const CAR_FRAME = { at: [430, 242], size: [200, 192] };
// Where the top and bottom fades (which keep the readings legible) end and start.
const FADE = { topEnd: 140, bottomStart: 533 };
const SCENE = { width: PHOTO.width, height: PHOTO.top + PHOTO.height + PHOTO.bottom, keep: [160, 1320], keepNarrow: [385, 1215], narrowBelow: 560, scale: 1 };

// The Grid dialog's phases, and each phase's keys: the inverter's voltage and current, from [inverter] of the entity
// IDs, and the grid sensor's active power, from [plant].
const GRID_PHASES = ['a', 'b', 'c'];
const gridPhaseEntities = (inverter, plant) => Object.fromEntries(GRID_PHASES.flatMap(phase => [
    ...['voltage', 'current'].map(kind => [`grid_phase_${phase}_${kind}`, [`${inverter(phase)}_${kind}`]]),
    [`grid_phase_${phase}_active_power`, [`${plant(phase)}_active_power`]]]));
// The Grid dialog's columns: power is voltage × current, the apparent power; grid is the grid sensor's active power,
// positive while importing.
const GRID_KINDS = ['voltage', 'current', 'power', 'active_power'];
const GRID_UNITS = { voltage: 'V', current: 'A', power: 'kVA', active_power: 'kW', power_factor: '' };
const GRID_NAMES = { voltage: 'voltage', current: 'current', power: 'power', active_power: 'grid power' };

// Default entities for each `entities:` key in the card config, in priority order.
// Plant sensors are the primary source (they combine every inverter and battery);
// inverter sensors are the secondary / fallback source, used only when the plant sensor is unavailable.
// A key set in the config replaces its defaults entirely; `false` hides that item.
const DEFAULT_ENTITIES = {
    pv_power: ['sensor.sigen_plant_pv_power'],
    home_power: ['sensor.sigen_plant_consumed_power'],
    battery_power: ['sensor.sigen_plant_battery_power', 'sensor.sigen_inverter_battery_power'],
    battery_soc: ['sensor.sigen_plant_battery_state_of_charge', 'sensor.sigen_inverter_battery_state_of_charge'],
    battery_capacity: ['sensor.sigen_plant_rated_energy_capacity'],
    // The SOCs the battery stops charging and discharging at, for its remaining time (disabled by default).
    battery_charge_cut_off_soc: ['sensor.sigen_plant_charge_cut_off_soc', 'number.sigen_plant_ess_charge_cut_off_state_of_charge'],
    battery_discharge_cut_off_soc: ['sensor.sigen_plant_discharge_cut_off_soc', 'number.sigen_plant_ess_discharge_cut_off_state_of_charge'],
    // The SOC the battery can run down to in a power cut, for its remaining time while idle (disabled by default).
    battery_backup_soc: ['number.sigen_plant_ess_backup_state_of_charge'],
    grid_import_power: ['sensor.sigen_plant_grid_import_power'],
    grid_export_power: ['sensor.sigen_plant_grid_export_power'],
    phase_mode: ['switch.sigen_plant_independent_phase_power_control'],
    // Grid dialog: the inverter's per-phase readings at its AC terminals and the grid sensor's per-phase power (all
    // disabled by default), and the value shown beside GRID with show_grid_voltage (the phases' average voltage when
    // unset).
    grid_voltage: [],
    ...gridPhaseEntities(phase => `sensor.sigen_inverter_phase_${phase}`, phase => `sensor.sigen_plant_grid_phase_${phase}`),
    grid_power_factor: ['sensor.sigen_inverter_power_factor'],
    ac_charger_power: ['sensor.sigen_ac_charger_charging_power'],
    ac_charger_state: ['sensor.sigen_ac_charger_system_state'],
    ac_charger_total_energy: ['sensor.sigen_ac_charger_total_energy_consumed'],
    ac_charger_vehicle_soc: [],
    ac_charger_vehicle_range: [],
    dc_charger_power: ['sensor.sigen_inverter_dc_charger_output_power'],
    dc_charger_vehicle_soc: ['sensor.sigen_inverter_dc_charger_vehicle_soc'],
    dc_charger_limit: ['number.sigen_inverter_dc_charger_max_charging_power_limit'],
    // The car shows in the garage while either charger has power, or while this reads on, charging or more than 0.
    car_charging: [],
    // The plant's EVDC counters cover every inverter but are disabled by default; the first inverter's DC charger
    // totals are enabled.
    dc_charger_lifetime_charged_energy: ['sensor.sigen_plant_total_charged_energy_of_the_evdc', 'sensor.sigen_inverter_dc_charger_total_charging_capacity'],
    dc_charger_lifetime_discharged_energy: ['sensor.sigen_plant_total_discharged_energy_of_the_evdc', 'sensor.sigen_inverter_dc_charger_total_discharging_capacity'],
    // PV Strings dialog: the Sigenergy PV inputs and the third-party PV row, which the Total row adds up. The
    // third-party inverter's energy also counts towards Solar produced and the Energy statistics' solar.
    pv_strings_power: ['sensor.sigen_plant_sigen_pv_power'],
    pv_strings_lifetime_energy: ['sensor.sigen_plant_total_generation_of_self_pv', 'sensor.sigen_plant_total_pv_generation', 'sensor.sigen_inverter_total_pv_energy'],
    third_party_pv_power: ['sensor.sigen_plant_third_party_pv_power'],
    third_party_pv_daily_energy: ['sensor.sigen_plant_daily_third_party_inverter_energy'],
    third_party_pv_lifetime_energy: ['sensor.sigen_plant_total_generation_of_third_party_inverter'],
    daily_pv_energy: ['sensor.sigen_plant_daily_pv_energy', 'sensor.sigen_inverter_daily_pv_energy'],
    daily_grid_import_energy: ['sensor.sigen_plant_daily_grid_import_energy'],
    daily_grid_export_energy: ['sensor.sigen_plant_daily_grid_export_energy'],
    daily_battery_charge_energy: ['sensor.sigen_plant_daily_battery_charge_energy', 'sensor.sigen_inverter_daily_charge_energy'],
    // Energy statistics: lifetime counters, whose change per interval feeds the flow estimate.
    stat_pv: ['sensor.sigen_plant_total_pv_generation'],
    stat_battery_charge: ['sensor.sigen_plant_total_charged_energy_of_the_ess'],
    stat_battery_discharge: ['sensor.sigen_plant_total_discharged_energy_of_the_ess'],
    stat_grid_import: ['sensor.sigen_plant_total_imported_energy'],
    stat_grid_export: ['sensor.sigen_plant_total_exported_energy'],
    stat_evac_charge: ['sensor.sigen_plant_total_charged_energy_of_the_evac', 'sensor.sigen_ac_charger_total_energy_consumed'],
    daily_battery_discharge_energy: ['sensor.sigen_plant_daily_battery_discharge_energy', 'sensor.sigen_inverter_daily_discharge_energy'],
    // Today's solar forecast for all PV, in energy: Forecast.Solar's estimated energy production today, or Solcast's
    // forecast today. The one on the forecast the Energy dashboard uses comes first (_forecastToday).
    solar_forecast_today: ['sensor.energy_production_today', 'sensor.solcast_pv_forecast_forecast_today'],
    // The weather shown at the scene's top left: Home Assistant's default (Met.no) forecast entity.
    weather: ['weather.forecast_home', 'weather.home'],
};
// The same keys for sigenergy2mqtt (`sigenergy_backend: sigenergy2mqtt`), with its default entity ID prefix `sigen`
// and plant 0. Inverter and charger entities carry their Modbus device address: the inverter is assumed at 1, the
// AC charger at 1 or 2. The AC charger's power was `rated_charging_power` before February 2026; Home Assistant
// keeps the entity ID it first registered, so installs from before then still have that name. sigenergy2mqtt has
// no daily energy for a third-party inverter.
const SIGENERGY2MQTT_ENTITIES = {
    pv_power: ['sensor.sigen_0_total_pv_power', 'sensor.sigen_0_plant_pv_power'],
    // General Load Power is the home without the EV chargers; Total Load Power (and consumed_power, which copies it by
    // default) includes the DC charger. Without General Load Power, HOME is the balance of the other flows.
    home_power: ['sensor.sigen_0_general_load_power'],
    battery_power: ['sensor.sigen_0_plant_battery_power', 'sensor.sigen_0_inverter_1_charge_discharge_power'],
    battery_soc: ['sensor.sigen_0_plant_battery_soc', 'sensor.sigen_0_inverter_1_battery_soc'],
    battery_capacity: ['sensor.sigen_0_plant_rated_energy_capacity', 'sensor.sigen_0_inverter_1_rated_battery_capacity'],
    battery_charge_cut_off_soc: ['number.sigen_0_plant_ess_charge_cut_off_soc'],
    battery_discharge_cut_off_soc: ['number.sigen_0_plant_ess_discharge_cut_off_soc'],
    battery_backup_soc: ['number.sigen_0_plant_ess_backup_soc'],
    grid_import_power: ['sensor.sigen_0_grid_sensor_import_power'],
    grid_export_power: ['sensor.sigen_0_grid_sensor_export_power'],
    phase_mode: ['switch.sigen_0_plant_independent_phase_power_control'],
    grid_voltage: [],
    ...gridPhaseEntities(phase => `sensor.sigen_0_inverter_1_phase_${phase}`, phase => `sensor.sigen_0_plant_grid_phase_${phase}`),
    grid_power_factor: ['sensor.sigen_0_inverter_1_power_factor'],
    ac_charger_power: ['sensor.sigen_0_ac_charger_1_charging_power', 'sensor.sigen_0_ac_charger_2_charging_power', 'sensor.sigen_0_ac_charger_1_rated_charging_power', 'sensor.sigen_0_ac_charger_2_rated_charging_power'],
    ac_charger_state: ['sensor.sigen_0_ac_charger_1_running_state', 'sensor.sigen_0_ac_charger_2_running_state'],
    ac_charger_total_energy: ['sensor.sigen_0_ac_charger_1_total_energy_consumed', 'sensor.sigen_0_ac_charger_2_total_energy_consumed'],
    ac_charger_vehicle_soc: [],
    ac_charger_vehicle_range: [],
    dc_charger_power: ['sensor.sigen_0_dc_charger_1_output_power'],
    dc_charger_vehicle_soc: ['sensor.sigen_0_dc_charger_1_vehicle_soc'],
    dc_charger_limit: ['number.sigen_0_dc_charger_1_max_charging_power_limit'],
    car_charging: [],
    dc_charger_lifetime_charged_energy: ['sensor.sigen_0_evdc_total_charge_energy', 'sensor.sigen_0_si_evdc_total_charge_energy', 'sensor.sigen_0_dc_charger_1_total_charging_capacity'],
    dc_charger_lifetime_discharged_energy: ['sensor.sigen_0_evdc_total_discharge_energy', 'sensor.sigen_0_si_evdc_total_discharge_energy', 'sensor.sigen_0_dc_charger_1_total_discharging_capacity'],
    // plant_pv_power is the Sigenergy PV alone; total_pv_power, total_daily_pv_energy and lifetime_pv_energy add the
    // third-party inverter.
    pv_strings_power: ['sensor.sigen_0_plant_pv_power', 'sensor.sigen_0_inverter_1_pv_power'],
    pv_strings_lifetime_energy: ['sensor.sigen_0_si_total_self_pv_generation', 'sensor.sigen_0_plant_lifetime_pv_energy', 'sensor.sigen_0_inverter_1_lifetime_pv_energy'],
    third_party_pv_power: ['sensor.sigen_0_third_party_pv_power'],
    third_party_pv_daily_energy: [],
    third_party_pv_lifetime_energy: ['sensor.sigen_0_third_party_pv_lifetime_production', 'sensor.sigen_0_si_total_third_party_pv_generation'],
    daily_pv_energy: ['sensor.sigen_0_total_daily_pv_energy', 'sensor.sigen_0_daily_pv_energy', 'sensor.sigen_0_inverter_1_daily_pv_energy'],
    daily_grid_import_energy: ['sensor.sigen_0_grid_sensor_daily_import_energy'],
    daily_grid_export_energy: ['sensor.sigen_0_grid_sensor_daily_export_energy'],
    daily_battery_charge_energy: ['sensor.sigen_0_daily_charge_energy', 'sensor.sigen_0_inverter_1_daily_charge_energy'],
    // The plant's lifetime counters come first; the Statistics Interface (si_) ones restart from 0 when the firmware
    // gains that interface. lifetime_pv_energy, the plant's PV plus the third-party inverter's, is enabled by default;
    // plant_lifetime_pv_energy and the si_ counters are not.
    stat_pv: ['sensor.sigen_0_lifetime_pv_energy', 'sensor.sigen_0_plant_lifetime_pv_energy', 'sensor.sigen_0_si_total_self_pv_generation', 'sensor.sigen_0_inverter_1_lifetime_pv_energy'],
    stat_battery_charge: ['sensor.sigen_0_accumulated_charge_energy', 'sensor.sigen_0_si_total_charged_energy'],
    stat_battery_discharge: ['sensor.sigen_0_accumulated_discharge_energy', 'sensor.sigen_0_si_total_discharged_energy'],
    stat_grid_import: ['sensor.sigen_0_grid_sensor_lifetime_import_energy', 'sensor.sigen_0_si_total_imported_energy'],
    stat_grid_export: ['sensor.sigen_0_grid_sensor_lifetime_export_energy', 'sensor.sigen_0_si_total_exported_energy'],
    stat_evac_charge: ['sensor.sigen_0_si_total_ev_ac_charged_energy', 'sensor.sigen_0_ac_charger_1_total_energy_consumed', 'sensor.sigen_0_ac_charger_2_total_energy_consumed'],
    daily_battery_discharge_energy: ['sensor.sigen_0_daily_discharge_energy', 'sensor.sigen_0_inverter_1_daily_discharge_energy'],
    solar_forecast_today: DEFAULT_ENTITIES.solar_forecast_today,
    weather: DEFAULT_ENTITIES.weather,
};
const PV_KEYS = ['voltage', 'current', 'power', 'daily_energy', 'accumulated_energy'];
// The AC charger states (IEC 61851 B1 to C2) with a vehicle connected: Sigenergy Local Modbus's, then sigenergy2mqtt's.
const AC_CONNECTED = new Set(['reserving', 'preparing', 'ev ready', 'charging', 'charger and ev not ready', 'charger ready; ev not ready', 'charger not ready; ev ready']);
// Browser storage of the battery's learnt overhead (see _learnOverhead).
const OVERHEAD_KEY = 'sigenergy-flow-card-battery-overhead';
// The battery's keys, none of which is read with battery_present: false.
const BATTERY_KEYS = new Set(['battery_power', 'battery_soc', 'battery_capacity', 'battery_charge_cut_off_soc', 'battery_discharge_cut_off_soc',
    'battery_backup_soc', 'daily_battery_charge_energy', 'daily_battery_discharge_energy', 'stat_battery_charge', 'stat_battery_discharge']);
// Default entities and PV string entity for each `sigenergy_backend`; [homeBalance] computes HOME when its entity is missing.
const BACKENDS = {
    sigenergy_local_modbus: { entities: DEFAULT_ENTITIES, pvString: (n, key) => `sensor.sigen_inverter_pv${n}_${key}` },
    sigenergy2mqtt: { entities: SIGENERGY2MQTT_ENTITIES, homeBalance: true, pvString: (n, key) => `sensor.sigen_0_inverter_1_pv${n}_${key === 'accumulated_energy' ? 'lifetime_energy' : key}` },
};
// The solar keys (pv_power, daily_pv_energy, stat_pv) are all PV, the third-party inverter's included. These defaults
// leave the third-party inverter out, so its energy is added to them (see _pvSources).
const SIGEN_ONLY_PV = new Set([
    'sensor.sigen_plant_daily_pv_energy', 'sensor.sigen_inverter_daily_pv_energy', 'sensor.sigen_plant_total_pv_generation',
    'sensor.sigen_0_daily_pv_energy', 'sensor.sigen_0_inverter_1_daily_pv_energy', 'sensor.sigen_0_plant_lifetime_pv_energy',
    'sensor.sigen_0_si_total_self_pv_generation', 'sensor.sigen_0_inverter_1_lifetime_pv_energy',
]);
// The energy tiles: [value element id, daily sensor's entities key, label, the third-party inverter's daily key for a
// solar total, the lifetime counter's key, the third-party inverter's lifetime key].
const DAILY_TILES = [
    ['dayPv', 'daily_pv_energy', 'Solar produced', 'third_party_pv_daily_energy', 'stat_pv', 'third_party_pv_lifetime_energy'],
    ['dayImport', 'daily_grid_import_energy', 'Grid imported', null, 'stat_grid_import'],
    ['dayExport', 'daily_grid_export_energy', 'Grid exported', null, 'stat_grid_export'],
    ['dayCharge', 'daily_battery_charge_energy', 'Battery charged', null, 'stat_battery_charge'],
    ['dayDischarge', 'daily_battery_discharge_energy', 'Battery discharged', null, 'stat_battery_discharge'],
];

// Lines end at each device's edge; SOLAR's and HOME's leaders join their flow lines on the house.
// Lines follow the house's perspective: runs converge on the vanishing points of the roof ridge and eaves (along
// the front wall) and of the window and door edges (the glass-door side), plus verticals. The home line leaves the gateway along the front wall, turns along the
// side wall, climbs beside the glass doors and ends at HOME's leader; a short branch crosses to the doors.
const FLOWS = {
    solarFlow: 'M820 200 C820 226 775 224 775 250 V359',
    inverterFlow: 'M787 419 L836.5 425.6',
    homeFlow: 'M899.0 421.0 L968.1 429.8 Q975.0 430.7 981.8 429.1 L1027.2 418.4 Q1034.0 416.8 1034.0 409.8 L1034.0 242.2 Q1034.0 235.2 1041.0 234.4 L1110.0 226.5',
    homeBranch: 'M1034 362 L1057 357.4',
    gridFlow: 'M869.0 473.0 L869.0 492.0 Q869.0 499.0 875.9 500.1 L1030.0 526.0',
};
// A branch continues its parent's animation from the point where it leaves the parent's path.
const BRANCHES = { homeBranch: 'homeFlow' };
// The end of each line that meets the gateway.
const GATEWAY_ENDS = { inverterFlow: 'end', homeFlow: 'start', gridFlow: 'start' };
// As in Sigenergy's app, the pulses run on one cycle at one speed. The inverter's pulse starts once the home pulse has
// run into HOME, and lines out of the gateway start as it comes out of the gateway, so it appears to run on through
// it. The grid's pulse into the gateway starts with the inverter's, and the solar pulse is halfway into the inverter as
// the inverter's pulse starts, so a pulse runs on from SOLAR too. The speed, in scene units per second, is
// [speed][0] + [speed][1] × √(home kW), so everything runs quicker as the house uses more; [length] is in scene units.
const PULSE = { speed: [110, 65], length: 130 };
const LEADERS = ['M820 18 V200', 'M1110 18 V227', 'M712 498 V641', 'M1030 526 V641'];
// Reading positions: [x, y, edge], where y is the reading's top or bottom edge. [lower] places the
// SigenStor and GRID readings: the row's left edge, each reading's left edge, and the row's bottom edge.
// [chargers] is the left edge of the charger readings, which are centred vertically: [wide, narrow].
const READINGS = {
    pv: [832, 16, 'top'],
    home: [1122, 16, 'top'],
    lower: { left: 724, columns: [724, 1030], bottom: 628, start: 563 },
    chargers: [170, 410],
};

// Series colours are CSS variables so the day and night styles can each define their own.
// As in Sigenergy's app, power supplied to the home is positive (solar, battery discharging, grid import, a vehicle
// supplying the DC charger) and power consumed is negative (home, battery charging, grid export, vehicle charging);
// [negate] flips a sensor whose sign is the other way.
const CHART_SERIES = [
    { key: 'pv_power', color: 'var(--c-solar)', name: 'Solar' },
    { key: 'battery_power', color: 'var(--c-battery)', name: 'Battery', negate: true },
    { key: 'grid_import_power', color: 'var(--c-grid)', name: 'Grid' },
    { key: 'grid_export_power', color: 'var(--c-grid)', name: 'Grid', negate: true },
    { key: 'ac_charger_power', color: 'var(--c-ac)', name: 'EVAC', optional: true, negate: true },
    { key: 'dc_charger_power', color: 'var(--c-dc)', name: 'EVDC', optional: true, negate: true },
    { key: 'home_power', color: 'var(--c-home)', name: 'Home', negate: true },
];
const PV_COLORS = [0, 1, 2, 3, 4, 5].map(i => `var(--pv${i})`);
const STYLES = {
    night: {
        'fg': '#edf3f6', 'sub': '#96a5af', 'card': '#11191d', 'card-line': '#343b44', 'panel': '#222831', 'panel-line': '#35414a',
        'tile': '#2a323d', 'tile-hover': '#323b47', 'tile-sub': '#aabac5', 'heading': '#d5e5e8', 'bar': '#45515c', 'bar-fill': 'linear-gradient(90deg,#49b5ac,#9ee4db)',
        'pill': '#343b46', 'pill-fg': '#b8c3ce', 'legend': '#abb9c2', 'muted': '#8f9ea8', 'icon': '#b3c0c9', 'load-bar': '#3a4550', 'load-fill': '#b6d8db',
        'other-line': '#3f4c56', 'other-fill': '#5b6872', 'tip': 'rgba(17,25,29,.94)', 'tip-line': '#3f4c56', 'tip-shadow': '#0008', 'dialog': '#1a2227', 'dialog-line': '#35414a',
        'grid': '#43505a', 'axis': '#a5b3bf', 'cursor': '#9fb0bb', 'dot-edge': '#11191d', 'scene': '#11191d', 'fade': '#11191d', 'fade-opacity': 1, 'fade-left': .7,
        'node-fg': '#edf3f6', 'node-sub': '#d0dade', 'node-em': '#a5ecd9', 'node-shadow': '0 1px 2px #000,0 2px 10px #000c', 'leader': 'rgba(225,234,236,.55)',
        'wire-on': 'rgba(99,214,193,.85)', 'comet': '#8ff5e1',
        'c-solar': '#ead66c', 'c-battery': '#69d4d1', 'c-grid': '#8d8bff', 'c-ac': '#efa66a', 'c-dc': '#c28aff', 'c-home': '#c7d8df',
        'sk-evdc': '#f0b44c', 'sk-evac': '#d9726a', 'sk-load': '#9a6cf0',
        'pv0': '#6bd36b', 'pv1': '#5fd4dc', 'pv2': '#6a78f0', 'pv3': '#a868f0', 'pv4': '#efa66a', 'pv5': '#ead66c', 'pv-third': '#c9ced6',
    },
    day: {
        'fg': '#1f2733', 'sub': '#6c7a89', 'card': 'linear-gradient(180deg,#d6f4f3,#e9f5fa 45%,#f5f9fc)', 'card-line': '#d3e3ec', 'panel': 'rgba(255,255,255,.8)', 'panel-line': '#e0eaf1',
        'tile': '#edf3f8', 'tile-hover': '#e2ecf4', 'tile-sub': '#6c7a89', 'heading': '#2b3744', 'bar': '#d9e5ed', 'bar-fill': 'linear-gradient(90deg,#1fc2bc,#6fe0d6)',
        'pill': '#e6eef4', 'pill-fg': '#5d6c7b', 'legend': '#5d6c7b', 'muted': '#7a8794', 'icon': '#5d6c7b', 'load-bar': '#d5e1ea', 'load-fill': '#3fb6c6',
        'other-line': '#c3d2dd', 'other-fill': '#9fb0bd', 'tip': 'rgba(255,255,255,.96)', 'tip-line': '#d3e0ea', 'tip-shadow': '#3b536a30', 'dialog': '#f7fafc', 'dialog-line': '#d3e0ea',
        'grid': '#d0dce5', 'axis': '#7a8794', 'cursor': '#7a8794', 'dot-edge': '#fff', 'scene': '#e4f2f7', 'fade': '#0e1b26', 'fade-opacity': .7, 'fade-left': .6,
        'node-fg': '#fff', 'node-sub': '#f2f6f8', 'node-em': '#c4f6ea', 'node-shadow': '0 0 2px #000c,0 1px 3px #000,0 2px 10px #000d', 'leader': 'rgba(255,255,255,.7)',
        'wire-on': 'rgba(18,184,166,.9)', 'comet': '#5eead4',
        'c-solar': '#e2a900', 'c-battery': '#14b3ac', 'c-grid': '#6f6df2', 'c-ac': '#ea8a3c', 'c-dc': '#a35ff0', 'c-home': '#6b7f8c',
        'sk-evdc': '#e39a1b', 'sk-evac': '#d4584f', 'sk-load': '#7f4ee0',
        'pv0': '#3fb83f', 'pv1': '#14b5c0', 'pv2': '#5465e8', 'pv3': '#9b52e8', 'pv4': '#ea8a3c', 'pv5': '#e2a900', 'pv-third': '#7d8796',
    },
};
const styleVars = style => Object.entries(STYLES[style]).map(([name, value]) => `--${name}:${value}`).join(';');
const COMET_LAYERS = [1, .78, .56, .36, .18];

// Energy statistics: sources feed consumers. Solar is a total, with the third-party inverter's [third] counter (see
// _pvSources).
const STAT_SOURCES = [
    { name: 'SOLAR', color: 'var(--c-solar)', key: 'stat_pv', third: 'third_party_pv_lifetime_energy', caption: 'Solar' },
    { name: 'BATTERY', color: 'var(--c-battery)', key: 'stat_battery_discharge', caption: 'Battery' },
    { name: 'EVDC', color: 'var(--sk-evdc)', key: 'dc_charger_lifetime_discharged_energy', caption: 'EVDC' },
    { name: 'GRID', color: 'var(--c-grid)', key: 'stat_grid_import', caption: 'Imported' },
];
const STAT_SINKS = [
    { name: 'BATTERY', color: 'var(--c-battery)', key: 'stat_battery_charge', caption: 'Charged' },
    { name: 'EVDC', color: 'var(--sk-evdc)', key: 'dc_charger_lifetime_charged_energy', caption: 'EVDC Charged' },
    { name: 'LOAD', color: 'var(--sk-load)', key: null, caption: 'Load' },
    { name: 'EVAC', color: 'var(--sk-evac)', key: 'stat_evac_charge', caption: 'EVAC Charged' },
    { name: 'GRID', color: 'var(--c-grid)', key: 'stat_grid_export', caption: 'Exported' },
];
// How readily each source (solar, battery, EVDC, grid) feeds each consumer (battery, EVDC, load, EVAC, export); zero
// where a device would feed itself. Fitted so that the split reproduces the flows the Sigenergy app shows.
const STAT_AFFINITY = [
    [0.7921, 1, 0.0609, 0.0208, 0.0303],
    [0, 87.6811, 0.108, 0.0151, 0.0049],
    [0.02, 0, 0.02, 0.02, 0.02],
    [0.0247, 0.0192, 0.1678, 0.0631, 0],
];
const STAT_RANGES = ['Day', 'Week', 'Month', 'Year', 'Lifetime'];
// The standalone cards also have a rolling Last 7 days, today included.
const SOLO_RANGES = ['Day', 'Last 7 days', 'Week', 'Month', 'Year', 'Lifetime'];
const PERIODS = { day: 'Day', last_7_days: 'Last 7 days', week: 'Week', month: 'Month', year: 'Year', lifetime: 'Lifetime' };
// The ranges whose energy metrics have a bar per day.
const DAILY_BARS = new Set(['Week', 'Last 7 days', 'Month']);
// The card's parts; the standalone cards each show one (SOLO_CARDS).
const PARTS = ['scene', 'battery', 'tiles', 'metrics', 'sankey'];
// Energy metrics bars, with the names in Sigenergy's app: [at] is the index in STAT_SOURCES (for [source]) or
// STAT_SINKS, stacked in this order from 0 outwards. Charging and export are darker than discharging and import.
const BAR_SERIES = [
    { name: 'Solar', color: 'var(--c-solar)', source: true, at: 0 },
    { name: 'Discharged', color: 'var(--c-battery)', source: true, at: 1 },
    { name: 'EVDC Discharged', color: 'var(--sk-evdc)', source: true, at: 2 },
    { name: 'Imported', color: 'var(--c-grid)', source: true, at: 3 },
    { name: 'Charged', color: 'color-mix(in srgb, var(--c-battery) 62%, #000)', at: 0 },
    { name: 'EVDC Charged', color: 'color-mix(in srgb, var(--sk-evdc) 62%, #000)', at: 1 },
    { name: 'Exported', color: 'color-mix(in srgb, var(--c-grid) 62%, #000)', at: 4 },
    { name: 'Load', color: 'var(--sk-load)', at: 2 },
    { name: 'EVAC Charged', color: 'var(--sk-evac)', at: 3 },
];

// Weather icons in the style of Sigenergy's app (a sun or moon behind a white cloud), drawn in a 64-unit square.
// Clouds are circles over a rounded bar, filled with one gradient across the icon so the shapes merge.
const WX_CLOUD = '<rect x="10" y="36" width="46" height="16" rx="8"/><circle cx="24" cy="37" r="10"/><circle cx="37" cy="32" r="13"/><circle cx="48" cy="40" r="8"/>';
const WX_PARTS = {
    sun: '<circle cx="32" cy="32" r="17" fill="url(#wxSun)"/>',
    sunBehind: '<circle cx="23" cy="24" r="13" fill="url(#wxSun)"/>',
    moon: '<path d="M38 12A21 21 0 1 0 54 44A17 17 0 0 1 38 12Z" fill="url(#wxMoon)"/>',
    moonBehind: '<path d="M27 9A15 15 0 1 0 39 32A12 12 0 0 1 27 9Z" fill="url(#wxMoon)"/>',
    cloud: `<g fill="url(#wxCloud)" filter="url(#wxShadow)">${WX_CLOUD}</g>`,
    cloudBack: `<g fill="url(#wxCloudBack)" transform="translate(-6 -10) scale(.9)">${WX_CLOUD}</g>`,
    cloudHigh: `<g fill="url(#wxCloud)" filter="url(#wxShadow)" transform="translate(0 -10)">${WX_CLOUD}</g>`,
    cloudDark: `<g fill="url(#wxCloudDark)" filter="url(#wxShadow)" transform="translate(0 -10)">${WX_CLOUD}</g>`,
    rain: '<path d="M23 47l-3 7M33 47l-3 7M43 47l-3 7" stroke="#3d9cff" stroke-width="3.2" stroke-linecap="round"/>',
    pour: '<path d="M20 46l-4 10M28 46l-4 10M36 46l-4 10M44 46l-4 10" stroke="#2f7fe0" stroke-width="3.2" stroke-linecap="round"/>',
    snow: '<g fill="#fff" stroke="#8fc3ec" stroke-width="1.2"><circle cx="22" cy="51" r="3"/><circle cx="32" cy="56" r="3"/><circle cx="42" cy="51" r="3"/></g>',
    sleet: '<path d="M25 47l-3 7M41 47l-3 7" stroke="#3d9cff" stroke-width="3.2" stroke-linecap="round"/><circle cx="32" cy="54" r="3" fill="#fff" stroke="#8fc3ec" stroke-width="1.2"/>',
    hail: '<g fill="#eef6ff" stroke="#7fa6c8" stroke-width="1.4"><circle cx="22" cy="50" r="3.4"/><circle cx="32" cy="56" r="3.4"/><circle cx="42" cy="50" r="3.4"/></g>',
    bolt: '<path d="M35 38L25 53H32L28 63L42 46H35L39 38Z" fill="#ffc21a" stroke="#e59b00" stroke-width="1" stroke-linejoin="round"/>',
    boltRain: '<path d="M20 47l-3 7M46 47l-3 7" stroke="#3d9cff" stroke-width="3.2" stroke-linecap="round"/><path d="M35 38L25 53H32L28 63L42 46H35L39 38Z" fill="#ffc21a" stroke="#e59b00" stroke-width="1" stroke-linejoin="round"/>',
    fog: '<path d="M14 48H50M20 55H44" stroke="#aab6c4" stroke-width="3.2" stroke-linecap="round"/>',
    wind: '<path d="M8 26H38A6 6 0 1 0 32 20M8 36H48A6 6 0 1 1 42 42M14 46H30" fill="none" stroke="#9fb3c8" stroke-width="3.6" stroke-linecap="round"/>',
    windLow: '<path d="M10 52H40A5 5 0 1 1 35 57M16 60H30" fill="none" stroke="#9fb3c8" stroke-width="3" stroke-linecap="round"/>',
    alert: '<circle cx="32" cy="32" r="20" fill="#ff8a3d"/><path d="M32 21V35" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="43" r="3" fill="#fff"/>',
};
// Home Assistant's weather conditions; [night] replaces the parts after sunset.
const WX_CONDITIONS = {
    sunny: { day: ['sun'], night: ['moon'] },
    'clear-night': { day: ['moon'] },
    partlycloudy: { day: ['sunBehind', 'cloud'], night: ['moonBehind', 'cloud'] },
    cloudy: { day: ['cloudBack', 'cloud'] },
    fog: { day: ['cloudHigh', 'fog'] },
    rainy: { day: ['cloudHigh', 'rain'] },
    pouring: { day: ['cloudDark', 'pour'] },
    snowy: { day: ['cloudHigh', 'snow'] },
    'snowy-rainy': { day: ['cloudHigh', 'sleet'] },
    hail: { day: ['cloudHigh', 'hail'] },
    lightning: { day: ['cloudDark', 'bolt'] },
    'lightning-rainy': { day: ['cloudDark', 'boltRain'] },
    windy: { day: ['wind'] },
    'windy-variant': { day: ['cloudHigh', 'windLow'] },
    exceptional: { day: ['alert'] },
};
const WX_DEFS = `<defs>
    <radialGradient id="wxSun" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffe680"/><stop offset=".6" stop-color="#ffc21a"/><stop offset="1" stop-color="#ffa000"/></radialGradient>
    <linearGradient id="wxMoon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset="1" stop-color="#f5cf62"/></linearGradient>
    <linearGradient id="wxCloud" gradientUnits="userSpaceOnUse" x1="0" y1="18" x2="0" y2="52"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#dde5ef"/></linearGradient>
    <linearGradient id="wxCloudBack" gradientUnits="userSpaceOnUse" x1="0" y1="10" x2="0" y2="45"><stop offset="0" stop-color="#e3e9f1"/><stop offset="1" stop-color="#b9c4d2"/></linearGradient>
    <linearGradient id="wxCloudDark" gradientUnits="userSpaceOnUse" x1="0" y1="18" x2="0" y2="52"><stop offset="0" stop-color="#b9c3d0"/><stop offset="1" stop-color="#7e8a9a"/></linearGradient>
    <filter id="wxShadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#42566e" flood-opacity=".35"/></filter>
  </defs>`;
const weatherIcon = (condition, day) => {
    const icon = WX_CONDITIONS[condition];
    if (!icon) return '';
    return `<svg viewBox="0 0 64 64" aria-hidden="true">${WX_DEFS}${(day ? icon.day : icon.night ?? icon.day).map(part => WX_PARTS[part]).join('')}</svg>`;
};
const STAT_PERIODS = { Day: '5minute', Week: 'hour', 'Last 7 days': 'hour', Month: 'hour', Year: 'day', Lifetime: 'day' };

// Splits one interval's energy into a sources x consumers matrix with those totals (iterative proportional
// fitting from STAT_AFFINITY), so that sums over many intervals keep when each flow happened.
const allocateFlows = (sources, sinks) => {
    const flows = sources.map(() => sinks.map(() => 0));
    const supply = sources.reduce((a, b) => a + b, 0), demand = sinks.reduce((a, b) => a + b, 0);
    if (supply <= 1e-9 || demand <= 1e-9) return flows;
    const wanted = sinks.map(v => v * supply / demand);
    sources.forEach((source, i) => wanted.forEach((sink, j) => { flows[i][j] = source > 0 && sink > 0 ? STAT_AFFINITY[i][j] : 0; }));
    for (let pass = 0; pass < 60; pass++) {
        flows.forEach((row, i) => {
            const total = row.reduce((a, b) => a + b, 0);
            if (total > 0) row.forEach((_, j) => { row[j] *= sources[i] / total; });
        });
        wanted.forEach((sink, j) => {
            const total = flows.reduce((a, row) => a + row[j], 0);
            if (total > 0) flows.forEach(row => { row[j] *= sink / total; });
        });
    }
    return flows;
};

// Dates and times follow Home Assistant's time zone ([zone]), not the browser's; undefined is the browser's.
const zoneFormats = new Map();
// Wall-clock fields of the instant [t] in [zone].
const zoneParts = (t, zone) => {
    let format = zoneFormats.get(zone);
    if (!format) zoneFormats.set(zone, format = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }));
    const p = Object.fromEntries(format.formatToParts(t).map(part => [part.type, Number(part.value)]));
    return { y: p.year, m: p.month - 1, d: p.day, h: p.hour, min: p.minute, s: p.second };
};
// Instant of a wall-clock time in [zone]; out-of-range fields roll over as with new Date(y, m, d, h).
const zoneDate = (zone, y, m, d, h = 0) => {
    const wall = Date.UTC(y, m, d, h);
    let t = wall;
    for (let i = 0; i < 2; i++) {
        const p = zoneParts(t, zone);
        t = wall - (Date.UTC(p.y, p.m, p.d, p.h, p.min, p.s) - t);
    }
    return new Date(t);
};
const zoneMidnight = (t, zone) => {
    const { y, m, d } = zoneParts(t, zone);
    return zoneDate(zone, y, m, d);
};

// First and last instant (exclusive) of the range that contains [date].
const statWindow = (range, date, zone) => {
    const { y, m, d } = zoneParts(date, zone), at = (...fields) => zoneDate(zone, ...fields);
    if (range === 'Day') return [at(y, m, d), at(y, m, d + 1)];
    if (range === 'Week') { const start = d - (new Date(Date.UTC(y, m, d)).getUTCDay() + 6) % 7; return [at(y, m, start), at(y, m, start + 7)]; }
    if (range === 'Last 7 days') return [at(y, m, d - 6), at(y, m, d + 1)];
    if (range === 'Month') return [at(y, m, 1), at(y, m + 1, 1)];
    if (range === 'Year') return [at(y, 0, 1), at(y + 1, 0, 1)];
    return [at(2015, 0, 1), new Date()];
};
const statStep = (range, date, direction, zone) => {
    const { y, m, d } = zoneParts(date, zone);
    if (range === 'Day') return zoneDate(zone, y, m, d + direction);
    if (range === 'Week' || range === 'Last 7 days') return zoneDate(zone, y, m, d + 7 * direction);
    if (range === 'Month') return zoneDate(zone, y, m + direction, 1);
    return zoneDate(zone, y + direction, 0, 1);
};
const statLabel = (range, date, zone) => {
    const [start, end] = statWindow(range, date, zone), day = d => d.toLocaleDateString('en-CA', { timeZone: zone });
    if (range === 'Day') return day(start);
    if (range === 'Week' || range === 'Last 7 days') return `${day(start)} – ${day(new Date(end - 1))}`;
    if (range === 'Month') return day(start).slice(0, 7);
    return range === 'Year' ? day(start).slice(0, 4) : 'Lifetime';
};

// Power given in kW, shown as W below 1 kW and MW from 1000 kW.
const formatPower = kw => {
    const watts = Math.round(Math.abs(kw) * 1000);
    if (watts < 1000) return `${watts} W`;
    const k = Math.abs(kw);
    return k < 999.995 ? `${k.toFixed(2)} kW` : `${(k / 1000).toFixed(2)} MW`;
};
// SigenStor and GRID share one row so their tops line up whatever each one's number of lines;
// the row hangs from its bottom edge, which keeps the taller block inside the scene.
const lowerStyle = (({ left, columns: [first, second], bottom }) =>
    `left:${(left / SCENE.width * 100).toFixed(3)}%;width:${((SCENE.width - left) / SCENE.width * 100).toFixed(3)}%;bottom:${((SCENE.height - bottom) / SCENE.height * 100).toFixed(3)}%;grid-template-columns:${((second - first) / (SCENE.width - left) * 100).toFixed(3)}% auto`)(READINGS.lower);
const placeAt = ([x, y, edge]) => `left:${(x / SCENE.width * 100).toFixed(3)}%;${edge}:${((edge === 'top' ? y : SCENE.height - y) / SCENE.height * 100).toFixed(3)}%`;

class SigenergyFlowCard extends HTMLElement {
    // The parts this card shows, and its defaults over the main card's; the standalone cards change both.
    static tag = 'sigenergy-flow-card';
    static parts = PARTS;
    static defaults = {};
    static size = 12;
    static getStubConfig() {
        return {
            type: `custom:${this.tag}`
        };
    }
    get _solo() {
        return this.constructor.parts.length === 1;
    }
    setConfig(config) {
        const backend = config.sigenergy_backend ?? 'sigenergy_local_modbus';
        if (!Object.hasOwn(BACKENDS, backend)) throw new Error(`Unknown sigenergy_backend "${backend}". Valid values: ${Object.keys(BACKENDS).join(', ')}`);
        if (config.theme !== undefined && !['auto', 'light', 'dark'].includes(config.theme)) throw new Error(`Unknown theme "${config.theme}". Valid values: auto, light, dark`);
        if (config.car_shown !== undefined && !['auto', true, false].includes(config.car_shown)) throw new Error(`Unknown car_shown "${config.car_shown}". Valid values: auto, true, false`);
        for (const key of ['car_image', 'car_image_night'])
            if (config[key] !== undefined && config[key] !== null && typeof config[key] !== 'string') throw new Error(`${key} must be an image URL`);
        const periods = Object.keys(PERIODS).filter(period => this._solo || PERIODS[period] !== 'Last 7 days');
        if (config.period !== undefined && !periods.includes(config.period)) throw new Error(`Unknown period "${config.period}". Valid values: ${periods.join(', ')}`);
        const entities = config.entities ?? {};
        if (typeof entities !== 'object' || Array.isArray(entities)) throw new Error('entities must be a mapping of key: entity_id');
        for (const [key, value] of Object.entries(entities)) {
            if (!(key in DEFAULT_ENTITIES)) throw new Error(`Unknown entities key "${key}". Valid keys: ${Object.keys(DEFAULT_ENTITIES).join(', ')}`);
            if (value !== false && value !== null && (typeof value !== 'string' || !value.includes('.'))) throw new Error(`entities.${key} must be an entity ID or false`);
        }
        if (config.home_entities !== undefined && config.home_entities !== false && config.home_entities !== null && !Array.isArray(config.home_entities)) throw new Error('home_entities must be a list of entities or false');
        this.config = {
            pv_strings: ['PV1', 'PV2', 'PV3', 'PV4'],
            home_entities: [],
            battery_present: true,
            show_lifetime: true,
            show_phase_mode: false,
            show_grid_voltage: false,
            car_shown: 'auto',
            car_image: null,
            car_image_night: null,
            grid_phases: null,
            title: 'Sigenergy',
            name: 'My Home',
            show_energy_statistics: true,
            show_forecast: true,
            theme: 'auto',
            debug_energy_statistics: false,
            period: 'day',
            show_period_picker: true,
            ...this.constructor.defaults,
            ...config,
            sigenergy_backend: backend,
        };
        this._backend = BACKENDS[backend];
        this._shown = new Set(this.constructor.parts);
        // Each string is a name, which reads the backend's pattern (sensor.sigen_inverter_pv<n>_* for Sigenergy Local
        // Modbus, sensor.sigen_0_inverter_1_pv<n>_* for sigenergy2mqtt), or an object
        // { name, voltage, current, power, daily_energy, accumulated_energy } that uses only the keys it lists.
        // A string none of whose entities exist in Home Assistant is treated as not fitted and hidden.
        this._pv = this.config.pv_strings.map((item, i) => {
            const object = typeof item === 'object' && item !== null;
            const pv = { name: (object ? item.name : item) ?? `PV${i + 1}` };
            for (const key of PV_KEYS) pv[key] = object ? (typeof item[key] === 'string' ? item[key] : null) : this._backend.pvString(i + 1, key);
            return pv;
        });
        this._build();
        if (this.isConnected && !this._flowFrame) this._startFlowAnimation();
    }
    set hass(hass) {
        const previous = this._hass;
        this._hass = hass;
        if (!this.root)
            return;
        this._update();
        this._updateSunTimes();
        this._updateScene();
        if (this._shown.has('scene')) this._updateWeather();
        if (Date.now() - (this._energyDevicesAt ?? 0) > 3600e3) this._loadEnergyDevices();
        const today = new Date().toLocaleDateString('en-CA', { timeZone: this._zone });
        if (!previous || this._day !== today) {
            this._day = today;
            // A view that showed the current day, week… moves on with the clock.
            if (this._stat?.follow) this._stat.date = new Date();
            if (this._shown.has('tiles') || this._shown.has('metrics')) this._loadForecast();
            if (this._shown.has('tiles')) this._loadForecastWeek();
            this._loadView();
        }
    }
    getCardSize() {
        return this.constructor.size;
    }
    _build() {
        if (this._flowFrame) { cancelAnimationFrame(this._flowFrame); this._flowFrame = null; }
        if (!this.shadowRoot)
            this.attachShadow({
                mode: 'open'
            });
        const battery = this.config.battery_present;
        const legend = [...new Map(CHART_SERIES.filter(s => battery || !BATTERY_KEYS.has(s.key)).map(s => [s.name, s])).values()]
            .map(s => `<span id="legend${s.name}"><i class="dot" style="background:${s.color}"></i>${s.name}</span>`).join('')
            + '<span id="legendForecast" hidden><i class="dash"></i>Forecast</span>';
        const head = (id, title) => `<div class="dlg-head"><h2 id="${id}Title">${title}</h2><button title="Close" aria-label="Close">✕</button></div>`;
        const comets = id => COMET_LAYERS.map(() => `<path class="comet" d="${FLOWS[id]}"/>`).join('');
        const flows = Object.keys(FLOWS).map(id => `<g class="flow" id="${id}"><path class="wire" d="${FLOWS[id]}"/><path class="glow" d="${FLOWS[id]}"/>${comets(id)}</g>`).join('');
        const fixed = this.config.show_period_picker ? '' : ' hidden', solo = this._solo, [part] = this.constructor.parts;
        const picker = `<div class="statbar${fixed && ' fixed'}"><div class="statnav"><button id="statPrev" title="Previous" aria-label="Previous"${fixed}>‹</button><span id="statDate">—</span><button id="statNext" title="Next" aria-label="Next"${fixed}>›</button></div><select class="statrange" id="statRange" aria-label="Range"${fixed}>${(solo ? SOLO_RANGES : STAT_RANGES).map(range => `<option>${range}</option>`).join('')}</select></div>`;
        const scene = `<section class="scene" id="scene"><div class="plane" id="plane">
        <svg viewBox="0 0 ${SCENE.width} ${SCENE.height}" preserveAspectRatio="none" aria-label="Energy flow between equipment">
          <defs>
            <linearGradient id="fadeTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="fade" stop-opacity=".6"/><stop offset=".5" class="fade" stop-opacity=".35"/><stop offset="1" class="fade" stop-opacity="0"/></linearGradient>
            <linearGradient id="fadeBottom" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="fade" stop-opacity="0"/><stop offset=".45" class="fade" stop-opacity=".4"/><stop offset="1" class="fade" stop-opacity=".65"/></linearGradient>
            <linearGradient id="fadeLeft" x1="0" y1="0" x2="1" y2="0"><stop offset="0" class="fade" style="stop-opacity:var(--fade-left)"/><stop offset="1" class="fade" stop-opacity="0"/></linearGradient>
          </defs>
          <image class="photo" href="${ARTWORK['house_day.png'].href}" x="0" y="${-PHOTO.bleed}" width="${SCENE.width}" height="${SCENE.height + 2 * PHOTO.bleed}" preserveAspectRatio="none"/>
          <image id="garageArt" display="none" href="${ARTWORK['garage_day.png'].href}" x="${ARTWORK['garage_day.png'].at[0]}" y="${PHOTO.top + ARTWORK['garage_day.png'].at[1]}" width="${ARTWORK['garage_day.png'].size[0]}" height="${ARTWORK['garage_day.png'].size[1]}" preserveAspectRatio="none"/>
          <image id="carArt" display="none" x="${CAR_FRAME.at[0]}" y="${PHOTO.top + CAR_FRAME.at[1]}" width="${CAR_FRAME.size[0]}" height="${CAR_FRAME.size[1]}" preserveAspectRatio="none"/>
          <image id="chargerArt" display="none" href="${ARTWORK['charger_day.png'].href}" x="${ARTWORK['charger_day.png'].at[0]}" y="${PHOTO.top + ARTWORK['charger_day.png'].at[1]}" width="${ARTWORK['charger_day.png'].size[0]}" height="${ARTWORK['charger_day.png'].size[1]}" preserveAspectRatio="none"/>
          <rect x="0" y="${-PHOTO.bleed}" width="${PHOTO.width}" height="${PHOTO.bleed + FADE.topEnd}" class="fadeRect" fill="url(#fadeTop)"/>
          <rect x="0" y="${FADE.bottomStart}" width="${PHOTO.width}" height="${SCENE.height - FADE.bottomStart + PHOTO.bleed}" class="fadeRect" fill="url(#fadeBottom)"/>
          <rect x="0" y="${-PHOTO.bleed}" width="520" height="${SCENE.height + 2 * PHOTO.bleed}" fill="url(#fadeLeft)"/>
          ${LEADERS.map((d, i) => battery || i !== 2 ? `<path class="leader${i >= 2 ? ' lowerLeader' : ''}" data-d="${d}" d="${d}"/>` : '').join('')}
          ${flows}
        </svg>
        <div class="node weather" id="weather" hidden><button id="weatherButton" title="Show the weather forecast"><span id="weatherIcon"></span><strong id="weatherTemp"></strong></button></div>
        <div class="node lead" style="${placeAt(READINGS.pv)}"><button id="pvButton" title="Show PV string details"><strong id="pv">—</strong><small>SOLAR ›</small></button></div>
        <div class="node lead" style="${placeAt(READINGS.home)}"><button id="homeButton" title="Show home power usage" disabled><strong id="home">—</strong><small>HOME<span id="homeMore" hidden> ›</span></small></button></div>
        <div class="lower" style="${lowerStyle}">
          ${battery ? '<div class="node"><strong id="battery">—</strong><small>SigenStor · <button id="socButton" title="Show battery level history"><span id="soc">—</span></button></small><em id="battStatus"></em></div>' : ''}
          <div class="node"${battery ? '' : ' style="grid-column:2"'}><button id="gridButton" title="Show grid details"><strong id="grid">—</strong><small>GRID <span class="nobreak"><span id="gridLabel"></span><span id="gridMore"> ›</span></span></small></button><em id="gridStatus"></em><em id="phaseMode"></em></div>
        </div>
        <div class="sidecol" id="chargers">
          <div class="node" id="acNode"><strong id="ac">—</strong><small>AC CHARGER</small><em id="acSoc"></em><em id="acTotal"></em></div>
          <div class="node" id="dcNode"><button id="dcButton" title="Adjust DC charging power limit"><strong id="dc">—</strong><small>DC CHARGER<span id="dcGear"> ⚙</span></small><em id="dcSoc"></em><em id="dcLifetime" class="lifetime stack"></em></button></div>
        </div>
      </div></section>`;
        const batteryLevel = `<button class="link" id="socLevel"><strong id="socLarge">—</strong><div class="socbar"><div class="socfill" id="socFill"></div></div></button><button class="link muted" id="capacity" title="Show stored energy today"><span id="capacityText"></span></button>`;
        const tiles = `<div class="stats"${battery ? '' : ' style="grid-template-rows:repeat(2,minmax(10px,1fr) auto auto auto minmax(10px,1fr) 9px)"'}>
          ${DAILY_TILES.filter(([, key]) => battery || !BATTERY_KEYS.has(key)).map(([id, , label], i) => `<button class="stat" style="grid-row-start:${6 * Math.floor((i && i + 1) / 2) + 1}"><small>${label}<span class="gap" id="${id}Gap" title="Missing data" hidden>⚠</span></small><b id="${id}">—</b></button>`
              + (id === 'dayPv' ? '<button class="stat" id="forecastStat" style="grid-row-start:1" hidden><small>Solar forecast</small><b id="dayForecast">—</b><small id="forecastPerf"></small></button>' : '')).join('')}
        </div>`;
        const metrics = `<div class="legend" id="legendPower">${legend}</div><div class="legend" id="legendBars" hidden></div>
      <div class="chart-wrap"><svg id="chart"></svg><div class="tip" id="chartTip" hidden></div><div class="busy" id="chartBusy" hidden></div></div><div class="sun-times" id="sunTimes"><span id="sunrise">Sunrise —</span><span id="sunset">Sunset —</span></div>`;
        const sankey = `<div class="chart-wrap"><svg id="statChart" role="group" aria-label="Energy flows, estimated"></svg><div class="busy" id="statBusy" hidden></div></div><div class="statsum" id="statSummary" hidden></div><div class="statcards" id="statCards"></div><pre class="muted" id="statDebug" hidden></pre><div class="statdata" id="statData" hidden><button id="statCopy">Copy the recorded data</button><a id="statDownload" download="sigenergy-statistics.json">Download (JSON)</a><span class="muted" id="statCopied"></span></div>`;
        const dialogs = {
            pvDialog: `
    <dialog id="pvDialog" aria-labelledby="pvTitle"><div class="dlg">
      ${head('pv', 'PV Strings')}
      <section class="panel"><h3>PV real time info</h3><div class="pv-wrap"><table class="pv-table">
        <thead><tr><th></th><th>Voltage<br>(V)</th><th>Current<br>(A)</th><th>Power<br>(kW)</th><th>Today<br>(kWh)</th><th>Lifetime<br>(kWh)</th></tr></thead>
        <tbody>${this._pv.map(({ name }, i) => `<tr id="pvRow${i}"><th scope="row"><i class="dot" style="background:${PV_COLORS[i % PV_COLORS.length]}"></i></th>${['voltage', 'current', 'power', 'daily_energy', 'accumulated_energy'].map(k => `<td id="pv${i}_${k}">—</td>`).join('')}</tr>`).join('')}</tbody>
        <tfoot><tr id="pvThirdRow" hidden><th scope="row"><i class="dot" style="background:var(--pv-third)"></i>Third-party PV</th><td></td><td></td><td id="pvThird_power">—</td><td id="pvThird_daily_energy">—</td><td id="pvThird_accumulated_energy">—</td></tr><tr><th scope="row">Total</th><td></td><td></td><td id="pvTotal_power">—</td><td id="pvTotal_daily_energy">—</td><td id="pvTotal_accumulated_energy">—</td></tr></tfoot>
      </table></div><div class="muted" id="pvLifetimeNote" hidden>String lifetimes are counted by the integration and may miss past production. Total is the inverter's own counter.</div></section>
      <section class="panel"><div class="charthead"><h3>PV power (kW) · Today</h3><span class="muted" id="pvChartStatus"></span></div>
      <div class="legend">${this._pv.map(({ name }, i) => `<span id="pvLegend${i}"><i class="dot" style="background:${PV_COLORS[i % PV_COLORS.length]}"></i></span>`).join('')}<span id="pvLegendThird" hidden><i class="dot" style="background:var(--pv-third)"></i>Third-party PV</span></div>
      <div class="chart-wrap"><svg id="pvChart"></svg><div class="tip" id="pvChartTip" hidden></div></div></section>
    </div></dialog>`,
            gridDialog: `
    <dialog id="gridDialog" aria-labelledby="gridTitle"><div class="dlg">
      ${head('grid', 'Grid')}
      <section class="panel"><h3>Grid real time info</h3><div class="pv-wrap"><table class="pv-table">
        <thead><tr><th></th>${GRID_KINDS.map(kind => `<th data-column="${kind}">${{ voltage: 'Voltage', current: 'Current', power: 'Power', active_power: 'Grid' }[kind]}<br>(${GRID_UNITS[kind]})</th>`).join('')}</tr></thead>
        <tbody>${GRID_PHASES.map(phase => `<tr id="gridRow_${phase}"><th scope="row">Phase ${phase.toUpperCase()}</th>${GRID_KINDS.map(kind => `<td class="pick" data-column="${kind}"><button id="grid_${phase}_${kind}" data-phase="${phase}" data-kind="${kind}">—</button></td>`).join('')}</tr>`).join('')}</tbody>
      </table></div><div class="muted" id="gridNote">Grid: the grid sensor's active power, positive while importing.</div><button class="gridpf" id="gridPf" data-kind="power_factor">Power factor <span id="gridPfValue">—</span></button></section>
      <section class="panel"><div class="charthead"><h3 id="gridChartTitle"></h3><span class="muted" id="gridChartStatus"></span></div>
      <div class="chart-wrap"><svg id="gridChart"></svg><div class="tip" id="gridChartTip" hidden></div></div></section>
    </div></dialog>`,
            energyDialog: `
    <dialog id="energyDialog" aria-labelledby="energyTitle"><div class="dlg">
      ${head('energy', 'Battery energy')}
      <section class="panel"><div class="home-total"><span>Stored now</span><b id="energyNow">—</b></div><div class="muted" id="energyOf"></div></section>
      <section class="panel"><div class="charthead"><h3>Stored energy (kWh) · Today</h3><span class="muted" id="energyChartStatus"></span></div>
      <div class="chart-wrap"><svg id="energyChart"></svg><div class="tip" id="energyChartTip" hidden></div></div></section>
    </div></dialog>`,
            socDialog: `
    <dialog id="socDialog" aria-labelledby="socTitle"><div class="dlg">
      ${head('soc', 'Battery level')}
      <section class="panel"><div class="home-total"><span>State of charge</span><b id="socNow">—</b></div></section>
      <section class="panel"><div class="charthead"><h3>State of charge (%) · Today</h3><span class="muted" id="socChartStatus"></span></div>
      <div class="chart-wrap"><svg id="socChart"></svg><div class="tip" id="socChartTip" hidden></div></div></section>
    </div></dialog>`,
            homeDialog: `
    <dialog id="homeDialog" aria-labelledby="homeTitle"><div class="dlg">
      ${head('home', 'Home power usage')}
      <section class="panel"><div class="home-total"><span>Home consumption</span><b id="homeTotal">—</b></div><div class="muted" id="homeMeasured"></div><div class="homewarn" id="homeWarn" hidden>⚠ The listed loads exceed the home consumption: some may be counted twice. In the Energy dashboard, set the Upstream device of a device measured by another.</div></section>
      <section class="panel"><div class="loads" id="homeLoads"></div></section>
    </div></dialog>`,
            forecastDialog: `
    <dialog id="forecastDialog" aria-labelledby="forecastTitle"><div class="dlg">
      ${head('forecast', 'Solar performance')}
      <section class="panel"><div class="home-total"><span>Performance today</span><b id="forecastPerfNow">—</b></div><div class="muted" id="forecastSummary"></div><button class="link muted" id="forecastEntity" hidden>Forecast details ›</button></section>
      <section class="panel"><div class="charthead"><h3>Solar produced and forecast (kWh) · Today</h3><span class="muted" id="forecastChartStatus"></span></div>
      <div class="legend"><span><i class="dot" style="background:var(--c-solar)"></i>Produced</span><span><i class="dot" style="background:var(--sub)"></i>Forecast</span></div>
      <div class="chart-wrap"><svg id="forecastChart"></svg><div class="tip" id="forecastChartTip" hidden></div></div></section>
    </div></dialog>`,
        };
        // A standalone card is its part under a header that holds what the panel's heading held.
        const header = (heading, sub = '', bar = picker) => `<div class="header"><div class="title"><div class="heading">${heading}</div>${sub}</div>${bar}</div>`;
        const body = !solo ? `<div class="header"><div class="title"><div class="heading" id="heading"></div><div class="sub">Live power flow</div></div>${picker}<div class="sub" id="stamp"></div></div>
      <div class="frame"><div class="layout">${scene}<aside class="sidebar fill">${battery ? `<section class="panel"><h3>Battery level</h3>${batteryLevel}</section>` : ''}
        <section class="panel daypanel"><h3>Energy statistics</h3>${tiles}</section>
      </aside></div></div>
      <section class="panel chartpanel"><div class="charthead"><h3 id="chartTitle">Power metrics · Today</h3><span class="muted" id="chartStatus">Loading history…</span></div>
      ${metrics}</section>
      <section class="panel statpanel" id="statPanel"${this.config.show_energy_statistics ? '' : ' hidden'}><div class="charthead"><h3>Energy statistics<button class="gap" id="statGap" title="Missing data" hidden>⚠</button></h3><span class="muted" id="statStatus">Loading…</span></div>
      ${sankey}</section>` : {
            scene: () => header('<span id="heading"></span>', '<div class="sub">Live power flow</div>', '<div class="sub" id="stamp"></div>') + scene,
            battery: () => header('<span id="heading"></span>', '', '') + (battery ? batteryLevel : ''),
            tiles: () => header('<span id="heading"></span>') + tiles,
            metrics: () => header(`<span id="heading"></span><span id="chartTitle"${this.config.title ? ' hidden' : ''}>Power metrics · Today</span>`, '<div class="sub" id="chartStatus">Loading history…</div>') + metrics,
            sankey: () => header('<span id="heading"></span><button class="gap" id="statGap" title="Missing data" hidden>⚠</button>', '<div class="sub" id="statStatus">Loading…</div>') + sankey,
        }[part]();
        const dialogIds = !solo ? Object.keys(dialogs) : { scene: ['pvDialog', 'gridDialog', 'socDialog', 'homeDialog'], battery: ['energyDialog'], tiles: ['forecastDialog'] }[part] ?? [];
        this.shadowRoot.innerHTML = `<style>
      :host{display:block;color:var(--fg);font-family:Roboto,Arial,sans-serif;${styleVars('night')}}
      :host([light]){${styleVars('day')}}
      [hidden]{display:none !important}
      button *{pointer-events:none}
      ha-card{container-type:inline-size;display:block;background:var(--card);border:1px solid var(--card-line);border-radius:16px;overflow:hidden;color:inherit;padding:16px;box-sizing:border-box}
      .header{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:'title bar' 'title stamp';align-items:center;gap:4px 12px;margin-bottom:14px}.header>.title{grid-area:title}.header>#stamp{grid-area:stamp;justify-self:end}
      .heading{font-size:20px;font-weight:650;letter-spacing:.2px}.sub{font-size:12px;color:var(--sub)}
      .layout{display:grid;grid-template-columns:minmax(0,2.4fr) minmax(240px,.75fr);gap:14px}
      .scene{position:relative;overflow:hidden;border-radius:12px;background:var(--scene);height:${SCENE.height}px}
      .plane{position:absolute;top:0;left:0;width:${SCENE.width}px;height:${SCENE.height}px;--s:1}
      .plane>svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
      .fade{stop-color:var(--fade)}.fadeRect{opacity:var(--fade-opacity)}
      .leader{fill:none;stroke:var(--leader);stroke-width:1;vector-effect:non-scaling-stroke}
      .wire{fill:none;stroke:rgba(18,26,30,.4);stroke-width:3;stroke-linecap:round;stroke-linejoin:round;transition:stroke .4s}
      .flow.active .wire{stroke:var(--wire-on)}
      .glow,.comet{fill:none;stroke:var(--comet);stroke-linecap:round;stroke-linejoin:round;display:none}
      .glow{stroke-width:9;opacity:.6}.comet{stroke-width:3.4;opacity:.3}
      .flow.active.moving .glow,.flow.active.moving .comet{display:inline}
      .node{position:absolute;z-index:2;color:var(--node-fg);white-space:nowrap;line-height:1.2;text-shadow:var(--node-shadow)}
      .node strong{display:block;font-size:clamp(14px,calc(27px * var(--s)),30px);font-weight:580}
      .node small,.node em{font-weight:500}
      .node small{display:block;font-size:clamp(11px,calc(19px * var(--s)),20px);color:var(--node-sub);margin-top:.15em;letter-spacing:.3px}
      .node em{display:block;font-size:clamp(10px,calc(13px * var(--s)),14px);font-style:normal;color:var(--node-em);margin-top:.2em}
      .node em:empty{display:none}
      .node em.stack span{display:block}.node em.stack span+span::before{content:none}
      .compact .node em.lifetime:not(.stack) span{display:inline}.compact .node em.lifetime:not(.stack) span+span::before{content:' · '}
      .node em span+span::before{content:' · '}
      .narrow .lead{transform:translateX(calc(-100% - 24px * var(--s)));text-align:right}
      .compact .sidecol .node{max-width:calc(430px * var(--s))}.narrow .sidecol .node{max-width:calc(230px * var(--s))}.compact .sidecol em{white-space:normal}
      .compact .lower .node+.node{max-width:calc(240px * var(--s))}.narrow .lower .node+.node{max-width:calc(150px * var(--s))}.compact .lower em{white-space:normal}
      .compact .node em span{display:block}.compact .node em span+span::before{content:none}
      .node.weather button{display:flex;align-items:center;gap:calc(10px * var(--s))}.weather svg{width:clamp(30px,calc(58px * var(--s)),62px);height:clamp(30px,calc(58px * var(--s)),62px);overflow:visible}
      .sidecol{position:absolute;top:50%;transform:translateY(-50%);z-index:2;display:flex;flex-direction:column;justify-content:space-between;gap:max(14px,calc(24px * var(--s)));min-height:calc(184px * var(--s))}
      .lower{position:absolute;z-index:2;display:grid;align-items:start}.lower .node{position:static}.lower>.node:first-child{min-width:0;padding-right:calc(12px * var(--s))}.lower>.node:first-child em{white-space:normal}
      .sidecol .node{position:static;border-left:1px solid var(--leader);padding-left:max(6px,calc(10px * var(--s)))}
      .node button{all:unset;cursor:pointer;display:block}.node button[disabled]{cursor:default}.nobreak{white-space:nowrap}.narrow #gridButton small{white-space:normal}.node small button{display:inline}.node button:focus-visible{outline:2px solid #71d3d1}
      .sidebar{display:flex;flex-direction:column;gap:12px}.panel{background:var(--panel);border:1px solid var(--panel-line);border-radius:12px;padding:13px}
      .panel h3{margin:0 0 11px;font-size:14px;font-weight:600;color:var(--heading)}
      /* Each row of tiles is five tracks: space, label, value, notes, space, then the gap to the next row. The tiles share
         them (subgrid), so labels and values line up across a row however they wrap. */
      .stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:9px;grid-template-rows:repeat(3,minmax(10px,1fr) auto auto auto minmax(10px,1fr) 9px);margin-bottom:-9px}
      .sidebar.fill>.daypanel{flex:1;display:flex;flex-direction:column}.sidebar.fill .stats{flex:1}.stat.wide{grid-column:1/-1}
      .stat{all:unset;box-sizing:border-box;background:var(--tile);border-radius:8px;padding:10px;cursor:pointer;transition:background .2s}.stat:hover{background:var(--tile-hover)}.stat[disabled]{cursor:default}.stat[disabled]:hover{background:var(--tile)}.stat:focus-visible{outline:2px solid #71d3d1}.stat small{font-size:11px;color:var(--tile-sub);display:block}.stat b{font-size:18px;display:block;margin-top:4px}#forecastPerf{margin-top:4px}#forecastPerf span{display:block}
      .stat{grid-row-end:span 5;display:grid;grid-template-rows:minmax(10px,1fr) auto auto auto minmax(10px,1fr);grid-template-rows:subgrid;padding-block:0}
      .stat>small:first-child{grid-row:2}.stat>b{grid-row:3}#forecastPerf{grid-row:4}
      .link{all:unset;box-sizing:border-box;display:block;width:100%;cursor:pointer;border-radius:6px}.link:hover{filter:brightness(1.2)}.link:focus-visible{outline:2px solid #71d3d1}
      .socbar{height:10px;background:var(--bar);border-radius:8px;overflow:hidden;margin:9px 0}.socfill{height:100%;background:var(--bar-fill);width:0%;transition:width .5s}
      .statpanel{margin-top:14px}.statbar{grid-area:bar;display:flex;gap:10px;align-items:center;justify-content:flex-end}
      .statnav{display:flex;align-items:center;gap:4px;min-width:0;background:var(--tile);border-radius:10px;padding:3px}.statnav>span{flex:0 1 auto;min-width:170px;text-align:center;font-size:14px;font-variant-numeric:tabular-nums}.statnav>span>span{white-space:nowrap}
      .statnav button{all:unset;cursor:pointer;width:34px;height:30px;text-align:center;font-size:20px;line-height:30px;border-radius:8px;color:var(--icon)}.statnav button:hover{background:var(--tile-hover)}.statnav button[disabled]{opacity:.3;cursor:default}.statnav button:focus-visible,.statrange:focus-visible{outline:2px solid #71d3d1}
      .statbar.fixed .statnav{background:none;padding:0}.statbar.fixed .statnav>span{min-width:0;color:var(--sub)}
      .statrange{appearance:none;-webkit-appearance:none;background:var(--tile);color:var(--fg);border:1px solid var(--panel-line);border-radius:10px;padding:7px 28px 7px 12px;font:inherit;font-size:14px;cursor:pointer}
      #statChart{width:100%;display:block}.skn{cursor:pointer;transition:opacity .2s}.skn:focus-visible{outline:none}.skn:focus-visible rect.skbox{stroke:#71d3d1;stroke-width:2}.skr{opacity:.5;transition:opacity .2s}.skr.on{opacity:.8}.skr.dim{opacity:.1}.skn.dim{opacity:.3}
      .sktext{font-family:inherit;fill:#142024;pointer-events:none}.skpct{font-family:inherit;font-size:11px;fill:var(--fg);pointer-events:none;paint-order:stroke;stroke:var(--panel);stroke-width:3px}
      .statsum{text-align:center;margin:12px 0 8px;padding:10px;border:1px solid var(--panel-line);border-radius:12px}.statsum b{font-size:24px}.statsum small{font-size:13px;color:var(--sub);margin-left:4px}.statsum div{color:var(--sub);font-size:14px;margin-top:2px}
      .statdata{display:flex;flex-wrap:wrap;gap:14px;align-items:center;margin-top:8px;font-size:13px}.statdata button{all:unset;cursor:pointer;color:var(--c-battery)}.statdata a{color:var(--c-battery);cursor:pointer}
      .statpanel pre{user-select:text;-webkit-user-select:text;white-space:pre-wrap;font-family:inherit;font-size:12px;margin:10px 0 0}
      .statcards{display:flex;flex-wrap:wrap;gap:9px}.statcard{flex:1 1 140px;box-sizing:border-box;background:var(--tile);border-radius:10px;padding:10px 12px}.statcard b{font-size:18px;display:block}.statcard span{font-size:13px;color:var(--tile-sub);display:block}
      .chartpanel{margin-top:14px}.charthead{display:flex;justify-content:space-between;align-items:center}.legend{font-size:11px;color:var(--legend)}
      .legend span{margin-right:12px}.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px}.dash{display:inline-block;width:14px;border-top:2px dashed var(--legend);vertical-align:middle;margin-right:4px}
      .sun-times{display:flex;justify-content:space-between;gap:12px;margin-top:10px;padding:10px 15px;border-radius:24px;background:var(--pill);color:var(--pill-fg);font-size:12px}
      #chart,#pvChart{width:100%;height:170px;display:block;touch-action:pan-y}.muted{color:var(--muted);font-size:12px}
      .chart-wrap{position:relative}.gap{all:unset;cursor:pointer;color:#e0a030;margin-left:4px}.gap[hidden]{display:none}.note{position:fixed;z-index:20;max-width:270px;background:var(--tip);color:inherit;border:1px solid var(--tip-line);border-radius:8px;padding:8px 10px;font-size:12px;line-height:1.45;box-shadow:0 6px 18px var(--tip-shadow)}.note[hidden]{display:none}.tip .gaptip{color:#d08a16;white-space:normal;max-width:250px}.busy{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}.busy[hidden]{display:none}.busy::after{content:'';width:22px;height:22px;border:2.5px solid var(--grid);border-top-color:var(--axis);border-radius:50%;animation:busy .8s linear infinite}@keyframes busy{to{transform:rotate(360deg)}}
      .tip{position:absolute;top:4px;z-index:3;pointer-events:none;background:var(--tip);border:1px solid var(--tip-line);border-radius:8px;padding:8px 10px;font-size:12px;line-height:1.5;white-space:nowrap;box-shadow:0 6px 18px var(--tip-shadow);font-variant-numeric:tabular-nums}
      .tip b{display:block;font-size:12px;color:var(--heading);margin-bottom:2px}
      .tip div{display:flex;align-items:center;gap:6px}.tip span{margin-left:auto;padding-left:14px;color:var(--fg)}.tip em{font-style:normal;color:var(--muted)}
      dialog{background:var(--dialog);color:var(--fg);border:1px solid var(--dialog-line);border-radius:16px;padding:0;width:min(760px,calc(100vw - 24px));max-height:calc(100vh - 32px);box-sizing:border-box;font-family:Roboto,Arial,sans-serif}
      dialog::backdrop{background:rgba(0,0,0,.6)}
      .dlg{padding:16px;display:flex;flex-direction:column;gap:14px}
      .dlg-head{display:flex;justify-content:space-between;align-items:center}.dlg-head h2{margin:0;font-size:18px;font-weight:600}
      .dlg-head button{all:unset;cursor:pointer;font-size:20px;line-height:1;padding:4px 8px;border-radius:8px;color:var(--icon)}.dlg-head button:focus-visible{outline:2px solid #71d3d1}
      .pv-wrap{overflow-x:auto}
      .pv-table{width:100%;border-collapse:separate;border-spacing:6px;font-size:14px;font-variant-numeric:tabular-nums}
      .pv-table th{font-size:12px;font-weight:500;color:var(--sub);text-align:center;padding:0 4px}
      .pv-table td{background:var(--tile);border-radius:8px;padding:9px 8px;text-align:center;white-space:nowrap}
      .pv-table th[scope=row]{text-align:left;font-size:13px;color:var(--fg);white-space:nowrap}
      .pv-table tfoot td{background:transparent;color:var(--heading);font-weight:600}
      .pv-table .dot{margin-right:6px}
      .pv-table td.pick{padding:0}.pick button{all:unset;box-sizing:border-box;display:block;width:100%;padding:9px 8px;border-radius:8px;cursor:pointer}.pick button[disabled]{cursor:default}
      .pick button[aria-pressed=true],.gridpf[aria-pressed=true]{outline:2px solid var(--c-grid);outline-offset:-2px}.pick button:focus-visible,.gridpf:focus-visible{outline:2px solid #71d3d1}
      #gridNote,#pvLifetimeNote{margin:4px 14px 0}.gridpf{all:unset;cursor:pointer;display:inline-block;margin:6px 6px 0;padding:4px 8px;border-radius:8px;font-size:14px;font-variant-numeric:tabular-nums}
      .loads{display:flex;flex-direction:column;gap:6px}
      .load{all:unset;box-sizing:border-box;display:grid;grid-template-columns:minmax(0,1fr) auto 3.5em;gap:2px 12px;align-items:center;background:var(--tile);border-radius:8px;padding:9px 12px;cursor:pointer;font-size:14px;font-variant-numeric:tabular-nums}
      .load:focus-visible{outline:2px solid #71d3d1}
      .load .name{display:flex;align-items:center;gap:8px;min-width:0}.load .name span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .load ha-icon{--mdc-icon-size:18px;color:var(--icon);flex:none}
      .load .pct{color:var(--muted);font-size:12px;text-align:right}
      .load .bar{grid-column:1/-1;height:4px;border-radius:2px;background:var(--load-bar);overflow:hidden}.load .bar i{display:block;height:100%;background:var(--load-fill)}
      .homewarn{color:#d08a16;font-size:12px;margin-top:6px}.homewarn[hidden]{display:none}
      .load.other{cursor:default;background:transparent;border:1px dashed var(--other-line)}.load.other .bar i{background:var(--other-fill)}
      .home-total{display:flex;justify-content:space-between;align-items:baseline;font-size:14px;color:var(--icon)}.home-total b{font-size:22px;color:var(--fg)}
      .frame{container-type:inline-size}
      @container (max-width:800px){.layout{grid-template-columns:1fr}}
      @container (max-width:680px){.header{grid-template-areas:'title stamp' 'bar bar'}.statbar{justify-content:space-between;margin-top:8px}}
      @container (max-width:420px){.statnav>span{min-width:0}}
    </style>
    <ha-card>${body}
    </ha-card><div class="note" id="gapNote" role="status" hidden></div>${dialogIds.map(id => dialogs[id]).join('')}`;
        this.root = this.shadowRoot;
        this._id('heading').textContent = [this.config.title, this.config.name].filter(Boolean).join(' · ');
        // The PV string names come from the card config, so they go in as text rather than through the template.
        if (this._id('pvDialog')) this._pv.forEach(({ name }, i) => {
            this._id(`pvRow${i}`).querySelector('th').append(String(name));
            this._id(`pvLegend${i}`).append(String(name));
        });
        this._sceneFile = null;
        this._loadRows = new Map();
        this._loadsEmpty = null;
        this._flowItems = !this._shown.has('scene') ? [] : Object.keys(FLOWS).map(id => {
            const group = this._id(id);
            return { id, group, wire: group.querySelector('.wire'), length: 0, glow: group.querySelector('.glow'), comets: [...group.querySelectorAll('.comet')] };
        });
        for (const item of this._flowItems)
            item.parent = this._flowItems.find(other => other.id === BRANCHES[item.id]);
        // Each dialog: the button that opens it, and what it shows when it opens. A dialog closes with its ✕ or a click
        // on its backdrop.
        for (const [button, id, show] of [
            ['pvButton', 'pvDialog', () => { this._updatePv(); this._loadPvHistory(); }],
            ['gridButton', 'gridDialog', () => { this._updateGrid(); this._loadGridHistory(); }],
            ['homeButton', 'homeDialog', () => this._updateHome()],
            ['capacity', 'energyDialog', () => { this._updateEnergy(); this._loadEnergyHistory(); }],
            ['socButton', 'socDialog', () => { this._updateSoc(); this._loadSocHistory(); }],
            ['forecastStat', 'forecastDialog', () => { this._updateForecastDialog(); this._loadForecastChart(); }],
        ]) if (this._id(id)) this._id(button)?.addEventListener('click', () => { this._id(id).showModal(); show(); });
        for (const d of this.root.querySelectorAll('dialog')) {
            d.querySelector('.dlg-head button').addEventListener('click', () => d.close());
            d.addEventListener('click', e => { if (e.target === d) d.close(); });
        }
        // A modal dialog sits above HA's more-info dialog, so it closes first.
        this._id('homeLoads')?.addEventListener('click', e => {
            const entityId = e.target.closest('[data-entity]')?.dataset.entity;
            if (!entityId) return;
            this._id('homeDialog').close();
            this._moreInfo(entityId);
        });
        this._id('forecastEntity')?.addEventListener('click', () => {
            this._id('forecastDialog').close();
            this._moreInfo(this._ent('solar_forecast_today'));
        });
        // A grid reading or the power factor charts its history.
        this._gridPick ??= { phase: 'a', kind: 'voltage' };
        this._id('gridDialog')?.addEventListener('click', e => {
            const pick = e.target.closest('[data-kind]');
            if (!pick || pick.disabled) return;
            this._gridPick = { phase: pick.dataset.phase ?? null, kind: pick.dataset.kind };
            this._updateGrid();
            this._loadGridHistory();
        });
        for (const stat of this.root.querySelectorAll('.stat:not(#forecastStat), #socLevel'))
            stat.addEventListener('click', e => {
                const gap = e.target.closest('.gap');
                if (gap) { e.stopPropagation(); this._showNote(gap); }
                else this._moreInfo(stat.dataset.entity);
            });
        this._id('statGap')?.addEventListener('click', e => this._showNote(e.currentTarget));
        // A missing-data mark explains itself on hover or tap; the note closes on the next tap elsewhere.
        for (const gap of this.root.querySelectorAll('.gap')) {
            gap.addEventListener('pointerenter', () => this._showNote(gap));
            gap.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') this._id('gapNote').hidden = true; });
        }
        this.root.addEventListener('pointerdown', e => { if (!e.target.closest?.('.gap')) this._id('gapNote').hidden = true; });
        this._observeCharts();
        for (const [chart, tip] of [['chart', 'chartTip'], ['pvChart', 'pvChartTip'], ['gridChart', 'gridChartTip'], ['energyChart', 'energyChartTip'], ['socChart', 'socChartTip'], ['forecastChart', 'forecastChartTip']]) {
            const svg = this._id(chart), box = this._id(tip);
            if (!svg) continue;
            const show = e => this._hoverChart(svg, box, e);
            svg.addEventListener('pointermove', show);
            svg.addEventListener('pointerdown', show);
            svg.addEventListener('pointerleave', () => this._hideHover(svg, box));
        }
        this._id('dcButton')?.addEventListener('click', () => this._moreInfo(this._ent('dc_charger_limit')));
        this._id('weatherButton')?.addEventListener('click', () => this._moreInfo(this._ent('weather')));
        this._weatherKey = null;
        this._wireStatistics();
        if (this._flowStates) for (const id of Object.keys(this._flowStates)) this._applyFlowClass(id);
    }
    _observeCharts() {
        if (this._chartObserver) this._chartObserver.disconnect();
        this._chartObserver = new ResizeObserver(entries => {
            for (const entry of entries) (entry.target._redraw ?? entry.target.fit)?.();
        });
        for (const id of ['chart', 'pvChart', 'gridChart', 'energyChart', 'socChart', 'forecastChart', 'statChart']) if (this._id(id)) this._chartObserver.observe(this._id(id));
        const scene = this._id('scene'), sidebar = this.root.querySelector('.sidebar');
        if (!scene) return;
        scene.fit = () => this._fitScene();
        if (sidebar) sidebar.fit = scene.fit;
        this._chartObserver.observe(scene);
        for (const el of [this.root.querySelector('.lower'), this._id('chargers')]) {
            el.fit = scene.fit;
            this._chartObserver.observe(el);
        }
        if (sidebar) this._chartObserver.observe(sidebar);
    }
    // The lifetime parts (charged, discharged) share a line when it fits beside the garage, else stack;
    // with a single charger the line must also stop short of the charger on the garage wall.
    _stackLifetime(narrow, scale) {
        const art = ARTWORK['charger_day.png'], single = this._id('acNode').hidden !== this._id('dcNode').hidden;
        const room = narrow ? 230 : single ? art.at[0] - READINGS.chargers[0] - 8 : 420;
        const el = this._id('dcLifetime');
        el.classList.remove('stack');
        el.style.whiteSpace = 'nowrap';
        const range = document.createRange();
        range.selectNodeContents(el);
        const width = range.getBoundingClientRect().width;
        el.style.whiteSpace = '';
        el.classList.toggle('stack', width > room * scale);
    }
    // With one charger its readings are level with the charger on the garage wall; otherwise they are
    // centred vertically.
    _alignChargers(narrow) {
        const chargers = this._id('chargers'), ac = this._id('acNode'), dc = this._id('dcNode');
        if (ac.hidden === dc.hidden) {
            Object.assign(chargers.style, { top: '', transform: '', minHeight: '' });
            return;
        }
        const art = ARTWORK['charger_day.png'];
        Object.assign(chargers.style, { top: `${(PHOTO.top + art.at[1] + art.size[1] / 2) / SCENE.height * 100}%`, transform: '', minHeight: '0' });
        if (narrow) chargers.style.left = `${(art.at[0] + art.size[0] + 14) / SCENE.width * 100}%`;
    }
    // The scene is shown at its preferred scale with the sides cropped; once the visible width reaches
    // the protected range, the whole scene scales down instead, so the house always stays in view.
    // Beside a taller sidebar, it scales up to fill the row as far as the protected range allows.
    _fitScene() {
        const scene = this._id('scene'), plane = this._id('plane'), sidebar = this.root.querySelector('.sidebar');
        const width = scene.clientWidth;
        if (!width) return;
        const narrow = width < SCENE.narrowBelow && matchMedia('(orientation: portrait)').matches;
        const [keepLeft, keepRight] = narrow ? SCENE.keepNarrow : SCENE.keep, keepWidth = keepRight - keepLeft;
        let scale = width / Math.min(SCENE.width, Math.max(keepWidth, width / SCENE.scale));
        let height = SCENE.height * scale;
        if (sidebar && sidebar.offsetTop === scene.offsetTop && sidebar.lastElementChild) {
            // The sidebar's own height: stretched to fill the row, it would keep the scene from ever shrinking.
            sidebar.classList.remove('fill');
            const sidebarHeight = sidebar.lastElementChild.offsetTop + sidebar.lastElementChild.offsetHeight - sidebar.firstElementChild.offsetTop;
            sidebar.classList.add('fill');
            if (sidebarHeight > height) {
                scale = Math.max(scale, Math.min(sidebarHeight / SCENE.height, width / keepWidth));
                height = sidebarHeight;
            }
        }
        const visible = width / scale;
        const centre = Math.min(SCENE.width - visible / 2, Math.max(visible / 2, (keepLeft + keepRight) / 2));
        scene.style.height = `${height}px`;
        Object.assign(plane.style, { width: `${SCENE.width * scale}px`, height: `${SCENE.height * scale}px`, left: `${-(centre - visible / 2) * scale}px`, top: `${(height - SCENE.height * scale) / 2}px` });
        // The weather stays in the top left corner of the visible sky: the photo's top edge (bleed included), or the
        // scene's when the photo is cropped, wherever the plane is cropped or centred.
        const inset = Math.max(10, 24 * scale), planeTop = (height - SCENE.height * scale) / 2;
        Object.assign(this._id('weather').style, { left: `${(centre - visible / 2) * scale + inset}px`, top: `${Math.max(0, planeTop - PHOTO.bleed * scale) - planeTop + inset}px` });
        plane.style.setProperty('--s', scale);
        plane.classList.toggle('compact', scale < .6);
        plane.classList.toggle('narrow', narrow);
        const chargers = this._id('chargers');
        chargers.style.left = `${(READINGS.chargers[narrow ? 1 : 0] / SCENE.width * 100).toFixed(3)}%`;
        this._stackLifetime(narrow, scale);
        this._alignChargers(narrow);
        // When the scene is taller than the photo, the SigenStor and GRID row starts at [lower.start], as long
        // as it keeps clear of the scene's bottom edge.
        const lower = this.root.querySelector('.lower'), planeHeight = SCENE.height * scale, spare = (height - planeHeight) / 2;
        const drop = narrow || spare <= 0 ? 0 : Math.max(0, Math.min(READINGS.lower.start * scale - lower.offsetTop, planeHeight + spare - 12 - lower.offsetTop - lower.offsetHeight));
        lower.style.transform = drop ? `translateY(${drop}px)` : '';
        for (const leader of this.root.querySelectorAll('.lowerLeader'))
            leader.setAttribute('d', leader.dataset.d.replace(/V([\d.]+)/, (_, end) => `V${+end + drop / scale}`));
    }
    // Home Assistant's time zone, or the browser's when it is missing or unknown to the browser.
    get _zone() {
        const zone = this._hass?.config?.time_zone;
        if (zone !== this._zoneName) {
            this._zoneName = zone;
            try {
                this._zoneValid = zone ? (new Intl.DateTimeFormat('en-US', { timeZone: zone }), zone) : undefined;
            } catch (e) {
                this._zoneValid = undefined;
            }
        }
        return this._zoneValid;
    }
    // Day between today's sunrise and sunset (as shown under the chart), or as sun.sun reports without a location.
    _isDay() {
        const { style } = this.config;
        if (style === 'day' || style === 'night') return style === 'day';
        if (this._sunTimes) {
            const now = Date.now();
            return now >= this._sunTimes.rise && now < this._sunTimes.set;
        }
        const sun = this._hass?.states['sun.sun']?.state;
        return sun ? sun === 'above_horizon' : true;
    }
    // The light or dark colours: [theme] forces one, else they follow Home Assistant's dark mode, or the artwork when
    // Home Assistant doesn't report one.
    _isLight() {
        const { theme } = this.config, dark = this._hass?.themes?.darkMode;
        if (theme === 'light' || theme === 'dark') return theme === 'light';
        return typeof dark === 'boolean' ? !dark : this._isDay();
    }
    _updateScene() {
        const day = this._isDay();
        this.toggleAttribute('day', day);
        this.toggleAttribute('light', this._isLight());
        const file = day ? 'house_day.png' : 'house_night.png';
        if (this._sceneFile === file || !this._shown.has('scene')) return;
        this._sceneFile = file;
        this._id('chargerArt').setAttribute('href', ARTWORK[day ? 'charger_day.png' : 'charger_night.png'].href);
        const garage = ARTWORK[day ? 'garage_day.png' : 'garage_night.png'];
        for (const [name, value] of Object.entries({ href: garage.href, x: garage.at[0], y: PHOTO.top + garage.at[1], width: garage.size[0], height: garage.size[1] }))
            this._id('garageArt').setAttribute(name, value);
        this._id('carArt').setAttribute('href', (day ? this.config.car_image : this.config.car_image_night ?? this.config.car_image) ?? '');
        for (const photo of this.root.querySelectorAll('.photo')) photo.setAttribute('href', ARTWORK[file].href);
    }
    // The weather entity's condition as an icon, and its current temperature.
    _updateWeather() {
        const state = this._hass.states[this._ent('weather')];
        const condition = state && !['unknown', 'unavailable'].includes(state.state) ? state.state : null;
        const temperature = Number.parseFloat(state?.attributes?.temperature);
        const unit = state?.attributes?.temperature_unit ?? this._hass.config?.unit_system?.temperature ?? '';
        const icon = weatherIcon(condition, this._isDay());
        this._id('weather').hidden = !icon && !Number.isFinite(temperature);
        this._text('weatherTemp', Number.isFinite(temperature) ? `${Math.round(temperature)}\u00A0${unit}`.trim() : '');
        if (this._weatherKey === icon) return;
        this._weatherKey = icon;
        this._id('weatherIcon').innerHTML = icon;
    }
    _id(id) {
        return this.root.getElementById(id)
    }
    _moreInfo(entityId) {
        if (!entityId) return;
        this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId } }));
    }
    _has(id) {
        return !!id && !!this._hass?.states[id];
    }
    // Entity for an `entities:` key: the configured one, else the first available default; null when disabled or for
    // the battery's keys without a battery.
    _ent(key) {
        if (!this.config.battery_present && BATTERY_KEYS.has(key)) return null;
        const set = this.config.entities?.[key];
        if (set === false || set === null) return null;
        if (set) return set;
        if (key === 'solar_forecast_today' && this._forecastToday()) return this._forecastToday();
        const ids = this._backend.entities[key];
        return ids.find(id => !['unknown', 'unavailable', undefined].includes(this._hass?.states[id]?.state)) ?? ids[0] ?? null;
    }
    _num(id) {
        const s = id ? this._hass?.states[id]?.state : undefined;
        return s === undefined || s === null || s === '' || ['unknown', 'unavailable', 'none'].includes(String(s).toLowerCase()) ? null : (Number.isFinite(Number(s)) ? Number(s) : null)
    }
    // Rewriting unchanged text under the pointer between press and release cancels the click.
    _text(id, v) {
        this._setText(this._id(id), v);
    }
    // Status parts sit on one line, or one per line when the scene is small.
    _parts(id, parts) {
        const el = this._id(id), list = parts.filter(Boolean);
        if (el.dataset.parts === list.join('\n')) return;
        el.dataset.parts = list.join('\n');
        el.replaceChildren(...list.map(text => Object.assign(document.createElement('span'), { textContent: text })));
    }
    _setText(el, v) {
        if (el.textContent !== String(v)) el.textContent = v;
    }
    // Value in kW or kWh when the entity reports W, Wh, MW or MWh.
    _scaled(id) {
        const v = this._num(id);
        return v === null ? null : v * this._factor(id);
    }
    _factor(id) {
        return { W: .001, Wh: .001, MW: 1000, MWh: 1000 }[this._hass?.states[id]?.attributes?.unit_of_measurement] ?? 1;
    }
    // Time until the battery reaches its charge cut-off SOC while charging, or its discharge cut-off SOC while
    // discharging, at the current power, as "1h10m". While idle, it is how long the battery would run the home in a power
    // cut, down to its Backup SOC: the home's consumption plus the base load learnt by _learnOverhead, and nothing until it
    // has been learnt. Empty when unknown, at the limit or 100 hours or more. Without the cut-off and backup entities, it
    // counts to 100% and 0%.
    _batteryRemaining(bat, soc, home) {
        const cap = this._scaled(this._ent('battery_capacity'));
        if (bat === null || soc === null || cap === null) return '';
        const idle = Math.abs(bat) <= .025, overhead = this._overhead();
        if (idle && overhead.samples < 10) return '';
        const charging = bat > .025, power = idle ? (home === null ? 0 : home + overhead.kw) : Math.abs(bat);
        if (power <= .025) return '';
        const cutOff = this._num(this._ent(charging ? 'battery_charge_cut_off_soc' : idle ? 'battery_backup_soc' : 'battery_discharge_cut_off_soc')) ?? (charging ? 100 : 0);
        const minutes = Math.round((charging ? cutOff - soc : soc - cutOff) / 100 * cap / power * 60);
        return minutes > 0 && minutes < 6000 ? `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}m` : '';
    }
    // While the battery alone supplies the home (discharging, with no solar, grid or charger flow), what it supplies
    // beyond the home's consumption is the base load of the inverters and the system. A running average of it, in kW, is
    // kept in the browser, at most a sample every 30 s, for the remaining time while idle.
    _learnOverhead(pv, imp, exp, bat, ac, dc, home) {
        const now = Date.now();
        if (now - (this._overheadAt ?? 0) < 30e3 || bat === null || home === null || bat > -.1 || home < .1) return;
        if ((pv ?? 0) > .05 || Math.max(imp ?? 0, exp ?? 0) > .05 || Math.abs(ac ?? 0) > .05 || Math.abs(dc ?? 0) > .05) return;
        const kw = -bat - home;
        if (kw < 0 || kw > 1) return;
        this._overheadAt = now;
        const { kw: average, samples } = this._overhead();
        // The mean of the first 100 samples, then a slowly moving average.
        this._overheadValue = { kw: samples ? average + (kw - average) / Math.min(samples + 1, 100) : kw, samples: samples + 1 };
        try {
            localStorage.setItem(OVERHEAD_KEY, JSON.stringify(this._overheadValue));
        } catch (e) {
            // Without storage the average lasts until the page reloads.
        }
    }
    _overhead() {
        if (!this._overheadValue) {
            let stored = null;
            try {
                stored = JSON.parse(localStorage.getItem(OVERHEAD_KEY));
            } catch (e) {
                // Nothing usable stored.
            }
            this._overheadValue = stored && stored.kw >= 0 && stored.kw <= 1 && stored.samples > 0 ? stored : { kw: 0, samples: 0 };
        }
        return this._overheadValue;
    }
    // Battery power with charging positive, whatever the source's sign convention.
    _batterySign() {
        return this.config.battery_power_invert ? -1 : 1;
    }
    _pvEntity(i, key) {
        return this._pv[i][key];
    }
    // HOME is the balance of the other flows for a backend without a home entity (sigenergy2mqtt when the inverter
    // doesn't provide General Load Power), unless home_power is set: what solar, grid and battery supply less the chargers.
    _homeFromBalance() {
        return !!this._backend.homeBalance && this.config.entities?.home_power === undefined && !this._has(this._ent('home_power'));
    }
    // Home consumption in kW.
    _homePower() {
        if (!this._homeFromBalance()) return this._scaled(this._ent('home_power'));
        const kw = key => this._scaled(this._ent(key));
        const pv = kw('pv_power'), bat = this.config.battery_present ? kw('battery_power') : 0, imp = kw('grid_import_power'), exp = kw('grid_export_power');
        if (pv === null || bat === null || (imp === null && exp === null)) return null;
        return Math.max(0, pv + (imp ?? 0) - (exp ?? 0) - bat * this._batterySign() - (kw('ac_charger_power') ?? 0) - (kw('dc_charger_power') ?? 0));
    }
    _updateHome() {
        if (!this._hass || !this._id('homeDialog')?.open) return;
        const home = this._homePower();
        const loads = this._homeLoads().map(item => {
            const entity = typeof item === 'string' ? item : item.entity;
            // The entity's own name, as Home Assistant shows it (without its device's), else the friendly name (a
            // device's main entity has no name of its own).
            const name = (typeof item === 'object' && item.name) || this._hass.entities?.[entity]?.name || this._hass.states[entity]?.attributes?.friendly_name || entity;
            const icon = (typeof item === 'object' && item.icon) || this._hass.states[entity]?.attributes?.icon || '';
            return { entity, name, icon, parent: item.parent ?? null, kw: this._scaled(entity) };
        }).sort((a, b) => (b.kw ?? -Infinity) - (a.kw ?? -Infinity));
        // A device inside another (its Upstream device) is part of that one's reading, so only the outer ones add up.
        const measured = loads.reduce((sum, l) => sum + (l.parent ? 0 : Math.max(0, l.kw ?? 0)), 0);
        const scale = Math.max(home ?? 0, measured, .001);
        const other = home === null ? null : home - measured;
        const drawing = loads.filter(l => l.kw !== null && l.kw >= .005);
        // Each device follows the one it's inside, indented; one whose outer device isn't drawing stands on its own.
        const shown = new Set(drawing.map(l => l.entity)), rows = [];
        const place = (l, depth) => {
            rows.push(this._loadRow(l, l.entity, scale, home, depth));
            for (const child of drawing) if (child.parent === l.entity) place(child, depth + 1);
        };
        for (const l of drawing) if (!shown.has(l.parent)) place(l, 0);
        if (!drawing.length) rows.push(this._loadsEmpty ??= Object.assign(document.createElement('div'), { className: 'muted', textContent: 'No listed load is drawing power' }));
        if (other !== null && other >= .005) rows.push(this._loadRow({ name: 'Other (unmeasured)', icon: '', kw: other }, null, scale, home));
        const list = this._id('homeLoads');
        if (rows.length !== list.children.length || rows.some((row, i) => row !== list.children[i])) list.replaceChildren(...rows);
        this._text('homeTotal', this._power(home));
        this._text('homeMeasured', home === null || home <= 0 ? '' : `Measured ${formatPower(measured)} · ${Math.round(Math.min(measured / home, 1) * 100)}% of home consumption`);
        this._id('homeWarn').hidden = home === null || measured <= home + Math.max(.1, home * .1);
    }
    // The loads HOME lists: home_entities, else (left out or empty) the Energy dashboard's individual devices that have a
    // power sensor. The chargers are left out: HOME doesn't include them. A device's parent is its Upstream device's
    // power sensor, when that one is listed.
    _homeLoads() {
        const list = this.config.home_entities;
        if (!Array.isArray(list)) return [];
        if (list.length) return list;
        const chargers = new Set([this._ent('ac_charger_power'), this._ent('dc_charger_power')]);
        const devices = (this._energyDevices ?? []).filter(d => typeof d.stat_rate === 'string' && !chargers.has(d.stat_rate));
        const rates = new Map(devices.map(d => [d.stat_consumption, d.stat_rate]));
        return devices.map(d => ({ entity: d.stat_rate, name: d.name, parent: rates.get(d.included_in_stat) ?? null }));
    }
    // The Energy dashboard's individual devices, for HOME when home_entities is left out. HA before 2025.12 has no
    // device power sensor, and no saved energy preferences is an error: both leave HOME a plain label.
    // The Energy dashboard's preferences: its individual devices, for HOME when home_entities is left out, and the solar
    // forecast it uses, for the Solar forecast tile.
    async _loadEnergyDevices() {
        const home = this._shown.has('scene') && this.config.home_entities?.length === 0;
        if (!home && !this._shown.has('tiles') || typeof this._hass?.callWS !== 'function') return;
        this._energyDevicesAt = Date.now();
        const forecast = this._ent('solar_forecast_today');
        try {
            const prefs = await this._hass.callWS({ type: 'energy/get_prefs' });
            this._energyDevices = prefs?.device_consumption ?? [];
            this._forecastEntries = new Set((prefs?.energy_sources ?? []).flatMap(source => source.type === 'solar' ? source.config_entry_solar_forecast ?? [] : []));
        } catch {
            this._energyDevices ??= [];
        }
        if (!this._hass) return;
        this._update();
        this._updateHome();
        // Another forecast entity: its history and the forecast are loaded again.
        if (this._shown.has('tiles') && this._ent('solar_forecast_today') !== forecast) {
            this._loadForecast();
            this._loadForecastWeek();
        }
    }
    // The today sensor of the solar forecast the Energy dashboard uses (Forecast.Solar's or Solcast's), if it has one.
    _forecastToday() {
        const entries = this._forecastEntries, registry = this._hass?.entities, devices = this._hass?.devices;
        if (!entries?.size || !registry || !devices) return null;
        // Found again only when the registry or the preferences change.
        const cache = this._forecastTodayCache;
        if (cache?.registry !== registry || cache.entries !== entries) {
            const entry = Object.values(registry).find(e => ['energy_production_today', 'total_kwh_forecast_today'].includes(e.translation_key)
                && devices[e.device_id]?.config_entries?.some(id => entries.has(id)));
            this._forecastTodayCache = { registry, entries, id: entry?.entity_id ?? null };
        }
        const id = this._forecastTodayCache.id;
        return id && this._has(id) ? id : null;
    }
    // Rows are kept per entity and updated in place, so a click is not lost to a refresh.
    _loadRow(load, entity, scale, home, depth = 0) {
        const key = entity ?? '';
        let row = this._loadRows.get(key);
        if (!row) {
            row = document.createElement('button');
            row.className = entity ? 'load' : 'load other';
            if (entity) Object.assign(row.dataset, { entity }), row.title = entity;
            else row.tabIndex = -1;
            row.innerHTML = '<span class="name"><span></span></span><span></span><span class="pct"></span><span class="bar"><i></i></span>';
            this._loadRows.set(key, row);
        }
        row.style.marginLeft = depth ? `${depth * 18}px` : '';
        const [name, value, pct, bar] = row.children;
        let icon = name.querySelector('ha-icon');
        if (load.icon && !icon) name.prepend(icon = document.createElement('ha-icon'));
        if (icon && icon.getAttribute('icon') !== load.icon) load.icon ? icon.setAttribute('icon', load.icon) : icon.remove();
        this._setText(name.lastElementChild, load.name);
        this._setText(value, formatPower(load.kw));
        this._setText(pct, home === null || home <= 0 ? '' : `${Math.round(Math.max(0, load.kw) / home * 100)}%`);
        bar.firstChild.style.width = `${(Math.max(0, load.kw) / scale * 100).toFixed(1)}%`;
        return row;
    }
    // A string is fitted when at least one of its entities exists in Home Assistant.
    _pvFitted(i) {
        return PV_KEYS.some(key => this._has(this._pv[i][key]));
    }
    _updatePv() {
        if (!this._hass || !this._id('pvDialog')?.open) return;
        const digits = { voltage: 1, current: 2, power: 2, daily_energy: 2, accumulated_energy: 2 };
        const sums = { power: null, daily_energy: null, accumulated_energy: null };
        this._pv.forEach((_, i) => {
            const fitted = this._pvFitted(i);
            this._id(`pvRow${i}`).hidden = !fitted;
            this._id(`pvLegend${i}`).hidden = !fitted;
            if (!fitted) return;
            for (const key of Object.keys(digits)) {
                const id = this._pvEntity(i, key);
                const v = key === 'voltage' || key === 'current' ? this._num(id) : this._scaled(id);
                this._text(`pv${i}_${key}`, v === null ? '—' : v.toFixed(digits[key]));
                if (key in sums && v !== null) sums[key] = (sums[key] ?? 0) + v;
            }
        });
        // Total row: the solar totals the main card shows, else the system's own PV sensors or the sum of the strings
        // above, plus the third-party PV row. The Sigenergy sensors leave out the third-party inverter; without them the
        // Total is unknown rather than the third-party PV alone.
        const kw = key => this._scaled(this._ent(key));
        const third = { power: kw('third_party_pv_power'), daily_energy: kw('third_party_pv_daily_energy'), accumulated_energy: kw('third_party_pv_lifetime_energy') };
        const totals = {
            power: kw('pv_power'),
            daily_energy: this._pvTotal('daily_pv_energy', 'third_party_pv_daily_energy'),
            accumulated_energy: this._pvTotal('stat_pv', 'third_party_pv_lifetime_energy'),
        };
        const own = {
            power: kw('pv_strings_power') ?? sums.power,
            daily_energy: sums.daily_energy,
            accumulated_energy: kw('pv_strings_lifetime_energy') ?? sums.accumulated_energy,
        };
        for (const [key, v] of Object.entries(own)) {
            const total = totals[key] ?? (v === null ? null : v + (third[key] ?? 0));
            this._text(`pvTotal_${key}`, total === null ? '—' : total.toFixed(2));
            this._text(`pvThird_${key}`, third[key] === null ? '—' : third[key].toFixed(2));
        }
        // The integrations count the strings' lifetime energy themselves, from their power, and can miss production the
        // inverter's own counter has; say so when the strings don't add up to the Total.
        const strings = sums.accumulated_energy === null ? null : sums.accumulated_energy + (third.accumulated_energy ?? 0);
        const ratio = strings === null || !(totals.accumulated_energy > 0) ? 1 : strings / totals.accumulated_energy;
        this._id('pvLifetimeNote').hidden = ratio >= .95 && ratio <= 1.05;
        const fitted = this._hasThirdPartyPv();
        this._id('pvThirdRow').hidden = !fitted;
        this._id('pvLegendThird').hidden = !fitted || !this._has(this._ent('third_party_pv_power'));
    }
    // A third-party inverter is fitted when its sensors have recorded any energy or power: the integrations create some
    // of them, reading 0, on systems without one.
    _hasThirdPartyPv() {
        return ['third_party_pv_lifetime_energy', 'third_party_pv_daily_energy', 'third_party_pv_power'].some(key => (this._scaled(this._ent(key)) ?? 0) > .005);
    }
    // The entities whose sum is the solar total of [key]: its entity, plus the third-party inverter's [thirdKey] when
    // [key] is left at a default that leaves that inverter out and one is fitted. An entity set in the config is the
    // total as it is. For [statistics], a missing third-party lifetime counter (Sigenergy Local Modbus creates it
    // disabled) gives way to the third-party daily sensor, whose statistics give the same energy per period.
    _pvSources(key, thirdKey, statistics = false) {
        const id = this._ent(key);
        if (!id) return [];
        if (this.config.entities?.[key] !== undefined || !SIGEN_ONLY_PV.has(id) || !this._hasThirdPartyPv()) return [id];
        let third = this._ent(thirdKey);
        if (statistics && !(third && this._has(third)) && thirdKey === 'third_party_pv_lifetime_energy' && this.config.entities?.[thirdKey] === undefined)
            third = this._ent('third_party_pv_daily_energy');
        return third && this._has(third) ? [id, third] : [id];
    }
    // The solar total of [key], in kW or kWh; null without its own entity's value.
    _pvTotal(key, thirdKey) {
        const [own, ...rest] = this._pvSources(key, thirdKey).map(id => this._scaled(id));
        return own === null || own === undefined ? null : rest.reduce((sum, v) => sum + (v ?? 0), own);
    }
    // The phases: grid_phases when set, else the last phase whose voltage or grid power isn't 0 (a single-phase system
    // can have phase B and C entities that read 0), else 1 when phase A has an entity; 0 is none.
    _gridPhases() {
        const set = Number(this.config.grid_phases);
        if ([1, 2, 3].includes(set)) return set;
        const live = phase => (this._num(this._ent(`grid_phase_${phase}_voltage`)) ?? 0) > 0 || Math.abs(this._num(this._ent(`grid_phase_${phase}_active_power`)) ?? 0) > 0;
        const last = GRID_PHASES.map(live).lastIndexOf(true);
        if (last >= 0) return last + 1;
        return ['voltage', 'current', 'active_power'].some(kind => this._has(this._ent(`grid_phase_a_${kind}`))) ? 1 : 0;
    }
    // Beside GRID: the grid_voltage entity, else the phases' average voltage, as "(231V)"; it wraps below GRID in the
    // narrow layout.
    _gridLabel(phases) {
        const set = this._ent('grid_voltage');
        const ids = set ? [set] : GRID_PHASES.slice(0, phases).map(phase => this._ent(`grid_phase_${phase}_voltage`));
        const values = ids.map(id => this._num(id)).filter(v => v !== null);
        if (!values.length) return '';
        const unit = this._hass.states[ids[0]]?.attributes?.unit_of_measurement ?? (set ? '' : 'V');
        return `(${Math.round(values.reduce((a, b) => a + b, 0) / values.length)}${unit})`;
    }
    // The entities a Grid dialog reading comes from: power is voltage × current.
    _gridIds(phase, kind) {
        if (kind === 'power_factor') return [this._ent('grid_power_factor')];
        return (kind === 'power' ? ['voltage', 'current'] : [kind]).map(k => this._ent(`grid_phase_${phase}_${k}`));
    }
    _gridValue(phase, kind) {
        if (kind === 'active_power') return this._scaled(this._ent(`grid_phase_${phase}_active_power`));
        const [first, second] = this._gridIds(phase, kind).map(id => this._num(id));
        return kind !== 'power' ? first : first === null || second === null ? null : first * second / 1000;
    }
    _gridAvailable(phase, kind) {
        return this._gridIds(phase, kind).every(id => this._has(id));
    }
    _updateGrid() {
        if (!this._hass || !this._id('gridDialog')?.open) return;
        const phases = Math.max(1, this._gridPhases()), pick = this._gridPick;
        // A column shows when any phase has its entities.
        for (const kind of GRID_KINDS) {
            const shown = GRID_PHASES.slice(0, phases).some(phase => this._gridAvailable(phase, kind));
            for (const el of this._id('gridDialog').querySelectorAll(`[data-column="${kind}"]`)) el.hidden = !shown;
            if (kind === 'active_power') this._id('gridNote').hidden = !shown;
        }
        GRID_PHASES.forEach((phase, i) => {
            this._id(`gridRow_${phase}`).hidden = i >= phases;
            for (const kind of GRID_KINDS) {
                const cell = this._id(`grid_${phase}_${kind}`), v = this._gridValue(phase, kind);
                this._setText(cell, v === null ? '—' : v.toFixed(kind === 'voltage' ? 1 : 2));
                cell.disabled = !this._gridAvailable(phase, kind);
                cell.setAttribute('aria-pressed', pick.phase === phase && pick.kind === kind);
            }
        });
        const pfId = this._ent('grid_power_factor'), pf = this._num(pfId), button = this._id('gridPf');
        button.hidden = !this._has(pfId);
        button.setAttribute('aria-pressed', pick.kind === 'power_factor');
        this._text('gridPfValue', pf === null ? '—' : pf.toFixed(2));
    }
    // The last 24 hours of the chosen reading; power is voltage × current at each time either changed.
    // Without the chosen reading's entities, the first available reading is charted.
    async _loadGridHistory() {
        if (!this._hass) return;
        const available = ({ phase, kind }) => kind === 'power_factor' ? this._has(this._ent('grid_power_factor')) : this._gridAvailable(phase, kind);
        if (!available(this._gridPick)) {
            const first = GRID_PHASES.flatMap(phase => GRID_KINDS.map(kind => ({ phase, kind }))).find(available);
            if (first) {
                this._gridPick = first;
                this._updateGrid();
            }
        }
        const { phase, kind } = this._gridPick, ids = this._gridIds(phase, kind), unit = GRID_UNITS[kind];
        const name = kind === 'power_factor' ? 'Power factor' : `Phase ${phase.toUpperCase()} ${GRID_NAMES[kind]}`;
        this._text('gridChartTitle', `${name}${unit ? ` (${unit})` : ''}`);
        if (!ids.every(id => this._has(id))) {
            this._id('gridChart').replaceChildren();
            this._text('gridChartStatus', 'Not available');
            return;
        }
        await this._dialogChart('gridChart', 'gridChartStatus', 'No recorded history in the last 24 hours', ids, ([first, second]) => {
            if (kind === 'active_power') {
                const factor = this._factor(ids[0]);
                return [{ points: first.map(p => ({ t: p.t, v: p.v * factor })), color: 'var(--c-grid)', name, unit, digits: 2, note: v => v > .005 ? 'import' : v < -.005 ? 'export' : '' }];
            }
            const points = kind !== 'power' ? first : [...new Set([...first, ...second].map(p => p.t))].sort((a, b) => a - b)
                .map(t => ({ t, volts: this._valueAt(first, t), amps: this._valueAt(second, t) }))
                .filter(p => p.volts !== null && p.amps !== null).map(p => ({ t: p.t, v: p.volts * p.amps / 1000 }));
            return [{ points, color: 'var(--c-grid)', name, unit, digits: kind === 'voltage' || kind === 'current' ? 1 : 2 }];
        }, undefined, { hours: 24, fit: kind === 'voltage' || kind === 'current' || kind === 'power_factor', signed: kind === 'active_power' });
    }
    // Stored energy is SOC × rated capacity; no sensor reports it directly.
    _updateEnergy() {
        if (!this._hass || !this._id('energyDialog')?.open) return;
        const soc = this._num(this._socEntity), cap = this._scaled(this._ent('battery_capacity'));
        this._text('energyNow', soc === null || cap === null ? '—' : `${(soc * cap / 100).toFixed(1)} kWh`);
        this._text('energyOf', cap === null ? '' : `of ${cap.toFixed(1)} kWh rated capacity${soc === null ? '' : ` · ${soc.toFixed(1)}%`}`);
    }
    async _loadEnergyHistory() {
        if (!this._hass) return;
        const cap = this._scaled(this._ent('battery_capacity'));
        if (cap === null) {
            this._text('energyChartStatus', 'Rated capacity unavailable');
            return;
        }
        if (!this._socEntity) {
            this._text('energyChartStatus', 'Battery SOC not configured');
            return;
        }
        await this._dialogChart('energyChart', 'energyChartStatus', 'No recorded battery history today', [this._socEntity],
            ([points]) => [{ points: points.map(p => ({ t: p.t, v: p.v * cap / 100 })), color: 'var(--c-battery)', name: 'Stored', unit: 'kWh' }], Math.ceil(cap / 2) * 2);
    }
    // Today's solar forecast, the latest; today's production so far against the forecast up to now, the current hour
    // counted pro rata; and the last 7 days' production against their forecasts. Without the forecast entity, the total
    // is Home Assistant's solar forecast's, else the average production of the last 7 days, without the ratios; with the
    // entity disabled, there is no tile. Without any of them, Solar produced takes both columns.
    // The forecast up to now adds up each past hour's forecast as recorded during that hour by the forecast's sensor
    // for the current hour, since Home Assistant's solar forecast drops an hour once it has passed; without that
    // sensor, it is Home Assistant's solar forecast for the hours it still has.
    _updateForecastTile() {
        const id = this._ent('solar_forecast_today'), hours = this._solarHours, recorded = this._forecastRecorded, now = Date.now();
        if (recorded) {
            // While the card is open, the sensor's live state extends its recorded history.
            const live = this._num(recorded.id), points = recorded.points;
            if (live !== null && live !== points[points.length - 1].v) points.push({ t: now, v: live });
        }
        const tile = this._id('forecastStat'), view = this._view();
        if (!tile) return;
        // A past day: its forecast and its production against it; the dialog charts today only. Longer ranges have none.
        tile.disabled = !view.live;
        if (!view.live) {
            const tiles = this._tiles?.key === view.key ? this._tiles : null;
            const actual = tiles?.values?.get('dayPv') ?? null, forecast = view.range === 'Day' ? tiles?.forecast ?? null : null;
            tile.hidden = forecast === null;
            this._id('dayPv').closest('.stat').classList.toggle('wide', tile.hidden);
            if (tile.hidden) return;
            this._text('dayForecast', this._energy(forecast));
            this._parts('forecastPerf', [actual !== null && forecast >= .1 ? `(Perf: ${Math.round(actual / forecast * 100)}%)` : '']);
            return;
        }
        // Until the forecast entity has updated since midnight, it is yesterday's: today's hours of Home Assistant's solar
        // forecast stand in, else —.
        const stale = this._stale(id);
        let total = this._today(id);
        const expected = id ? this._forecastSoFar(now) : null;
        if (id && hours) total ??= [...hours.values()].reduce((a, b) => a + b, 0);
        const average = id && total === null && !stale ? this._pvWeekAverage ?? null : null;
        total ??= average;
        tile.hidden = total === null && !stale;
        this._id('dayPv').closest('.stat').classList.toggle('wide', tile.hidden);
        if (tile.hidden) return;
        this._text('dayForecast', total === null ? '—' : this._energy(total));
        // Before .1 kWh of forecast, today's ratio means little.
        const actual = this._pvTotal('daily_pv_energy', 'third_party_pv_daily_energy'), week = this._forecastWeek;
        const ratio = (a, f) => `${Math.round(a / f * 100)}%`;
        this._parts('forecastPerf', average !== null ? ['(7-day average)']
            : [actual !== null && expected >= .1 ? `(Perf today: ${ratio(actual, expected)})` : '', week ? `(Perf 7 days: ${ratio(week.actual, week.forecast)})` : '']);
        this._updateForecastDialog();
    }
    // Today's forecast up to [now], in kWh: Home Assistant's solar forecast up to now while it has no gap; else the day's
    // forecast less its remaining-today sensor, so that by the evening it is the day's forecast, as a past day shows it,
    // plus the hourly forecast for the time since that sensor last changed, pro rata. Without that sensor, the forecast
    // recorded hour by hour.
    _forecastSoFar(now) {
        const slots = this._slotsUpTo(now);
        if (slots !== null) return slots;
        const remainingId = this._forecastEntity('energy_production_today_remaining', 'forecast_remaining_today');
        const total = this._today(this._ent('solar_forecast_today')), remaining = remainingId ? this._today(remainingId) : null;
        if (total === null || remaining === null) return this._forecastUpTo(now);
        const since = Date.parse(this._hass.states[remainingId].last_updated);
        let sum = Math.max(0, total - remaining);
        for (const [hour, kwh] of Number.isFinite(since) ? this._solarHours ?? [] : [])
            sum += kwh * Math.max(0, Math.min(now, hour + 3600e3) - Math.max(since, hour)) / 3600e3;
        return sum;
    }
    // A forecast sensor not updated since midnight still holds yesterday's forecast (Forecast.Solar updates hourly from
    // its last fetch, not at midnight).
    _stale(id) {
        return Date.parse(this._hass?.states[id]?.last_updated) < zoneMidnight(Date.now(), this._zone).getTime();
    }
    // A forecast sensor's reading for today, in kWh: null while it is yesterday's.
    _today(id) {
        return this._stale(id) ? null : this._scaled(id);
    }
    // Home Assistant's solar forecast from today's midnight up to [t], in kWh, each entry (half an hour for Solcast, an
    // hour for Forecast.Solar) lasting until the next and the one at [t] counted pro rata; null without one, or with an
    // entry missing before [t] (an interval longer than the usual one).
    _slotsUpTo(t) {
        const slots = this._solarSlots?.filter(([start]) => start < t);
        if (!slots?.length) return null;
        const counts = new Map();
        for (let i = 1; i < this._solarSlots.length; i++) {
            const gap = this._solarSlots[i][0] - this._solarSlots[i - 1][0];
            counts.set(gap, (counts.get(gap) ?? 0) + 1);
        }
        const step = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 3600e3;
        let sum = 0;
        for (let i = 0; i < slots.length; i++) {
            const [start, kwh] = slots[i];
            let length = (this._solarSlots[i + 1]?.[0] ?? start + step) - start;
            if (length > step * 1.5) {
                if (t > start + step) return null;
                length = step;
            }
            sum += kwh * Math.min(1, (t - start) / length);
        }
        return sum;
    }
    // The forecast's production from today's midnight up to [t] (now or earlier), in kWh: Home Assistant's solar forecast
    // while it has no gap; else, the hour at [t] counted pro rata, each hour's forecast as the forecast's sensor for the
    // current hour recorded it up to [t], else Home Assistant's solar forecast for the hours it still has; null without
    // either.
    _forecastUpTo(t) {
        const slots = this._slotsUpTo(t);
        if (slots !== null) return slots;
        const recorded = this._forecastRecorded, hours = this._solarHours;
        let sum = 0;
        if (recorded) {
            const { points, factor } = recorded;
            const at = time => {
                let v = null;
                for (const p of points) if (p.t <= time) v = p.v; else break;
                return v ?? 0;
            };
            for (let hour = zoneMidnight(t, this._zone).getTime(); hour < t; hour += 3600e3)
                sum += at(Math.min(hour + 3600e3, t) - 1) * factor * Math.min(1, (t - hour) / 3600e3);
            return sum;
        }
        if (!hours) return null;
        for (const [hour, kwh] of hours) sum += kwh * Math.min(1, Math.max(0, (t - hour) / 3600e3));
        return sum;
    }
    // Solar performance dialog: today's performance, as the Solar forecast tile shows it, and its figures.
    _updateForecastDialog() {
        if (!this._hass || !this._id('forecastDialog')?.open) return;
        const id = this._ent('solar_forecast_today'), now = Date.now();
        const actual = this._pvTotal('daily_pv_energy', 'third_party_pv_daily_energy'), expected = id ? this._forecastSoFar(now) : null;
        const total = this._today(id) ?? (this._solarHours ? [...this._solarHours.values()].reduce((a, b) => a + b, 0) : null);
        this._text('forecastPerfNow', actual !== null && expected >= .1 ? `${Math.round(actual / expected * 100)}%` : '—');
        this._text('forecastSummary', [actual === null ? '' : `${this._kwh(actual)} produced`, expected === null ? '' : `${this._kwh(expected)} forecast up to now`,
            total === null ? '' : `${this._kwh(total)} forecast today`].filter(Boolean).join(' · '));
        this._id('forecastEntity').hidden = !this._has(id);
    }
    // Today's solar produced and the forecast up to each moment, both cumulative, the forecast continuing dashed to the
    // end of the day from Home Assistant's solar forecast; the tip adds the performance against that forecast.
    async _loadForecastChart() {
        if (!this._hass) return;
        const ids = this._pvSources('daily_pv_energy', 'third_party_pv_daily_energy').filter(id => this._has(id));
        if (!ids.length || !this._ent('solar_forecast_today')) {
            this._text('forecastChartStatus', 'Solar forecast not configured');
            return;
        }
        await this._dialogChart('forecastChart', 'forecastChartStatus', 'No recorded solar history today', ids, sources => {
            const now = Date.now(), midnight = zoneMidnight(now, this._zone).getTime();
            // A daily counter can reset some time after midnight: what it read before its last drop is yesterday's.
            const counters = sources.map((points, i) => {
                const factor = this._factor(ids[i]);
                const reset = points.reduce((last, p, j) => j && p.v < points[j - 1].v ? j : last, 0);
                return points.slice(reset).map(p => ({ t: p.t, v: p.v * factor }));
            });
            const times = [...new Set(counters.flat().map(p => p.t))].sort((a, b) => a - b);
            const produced = times.map(t => ({ t, v: counters.reduce((sum, points) => sum + (this._valueAt(points, t) ?? 0), 0) }));
            const hourly = [];
            for (let t = midnight; t < now; t += 3600e3) hourly.push(t);
            const forecast = [...hourly, now].map(t => ({ t, v: this._forecastUpTo(t) ?? 0 }));
            // The rest of the day: what is left of the current hour, then Home Assistant's forecast hour by hour.
            const ahead = [forecast[forecast.length - 1]], hours = this._solarHours ?? new Map();
            const current = hourly[hourly.length - 1] ?? midnight, left = (this._forecastRecorded
                ? this._scaled(this._forecastRecorded.id) ?? 0 : hours.get(current) ?? 0) * Math.max(0, (current + 3600e3 - now) / 3600e3);
            let sum = ahead[0].v + left;
            ahead.push({ t: current + 3600e3, v: sum });
            for (const [t, kwh] of [...hours].filter(([t]) => t > current).sort((a, b) => a[0] - b[0])) {
                if (t > ahead[ahead.length - 1].t) ahead.push({ t, v: sum });
                sum += kwh;
                ahead.push({ t: t + 3600e3, v: sum });
            }
            const perf = produced.map(p => ({ t: p.t, f: this._forecastUpTo(p.t) ?? 0, v: p.v })).filter(p => p.f >= .1).map(p => ({ t: p.t, v: p.v / p.f * 100 }));
            // Where the forecast stays flat between stretches where it rises, an hour is missing from it: the line
            // breaks across it rather than drawing it as no production.
            const flats = (points, rose) => {
                const up = points.map((p, i) => i > 0 && p.v - points[i - 1].v > 1e-6), last = up.lastIndexOf(true), breaks = [];
                for (let i = 1; i < last; i++) { if (up[i]) rose = true; else if (rose) breaks.push({ start: points[i - 1].t, end: points[i].t }); }
                return breaks.length ? { breaks } : {};
            };
            const rose = forecast.some((p, i) => i && p.v - forecast[i - 1].v > 1e-6);
            return [
                { points: produced, color: 'var(--c-solar)', name: 'Produced', unit: 'kWh', digits: 2 },
                { points: forecast, color: 'var(--sub)', name: 'Forecast', unit: 'kWh', digits: 2, ...flats(forecast, false) },
                { points: ahead, color: 'var(--sub)', name: 'Forecast', unit: 'kWh', digits: 2, forecast: true, ...flats(ahead, rose) },
                { points: perf, color: 'var(--c-solar)', name: 'Performance', unit: '%', digits: 0, tipOnly: true },
            ];
        });
    }
    // A sensor of the forecast on the same device as solar_forecast_today, found by any of its [keys] (translation keys,
    // e.g. Forecast.Solar's energy_production_today_remaining and Solcast's forecast_remaining_today).
    _forecastEntity(...keys) {
        const registry = this._hass?.entities, device = registry?.[this._ent('solar_forecast_today')]?.device_id;
        if (!device) return null;
        const patterns = keys.map(key => new RegExp(`${key}(_\\d+)?$`));
        const entry = Object.values(registry).find(e => e.device_id === device && (keys.includes(e.translation_key) || patterns.some(p => p.test(e.entity_id))));
        return entry && this._has(entry.entity_id) ? entry.entity_id : null;
    }
    // The previous 7 days' solar production and forecasts, today left out. A day's forecast is the last state the
    // forecast entity recorded that day, its latest; a day's production is the change of the solar lifetime counters.
    // Days missing either are left out of the ratio; the average production counts every day with production data.
    async _loadForecastWeek() {
        const request = this._forecastWeekRequest = (this._forecastWeekRequest ?? 0) + 1;
        this._forecastWeek = this._pvWeekAverage = null;
        const id = this._ent('solar_forecast_today'), pv = this._pvSources('stat_pv', 'third_party_pv_lifetime_energy', true).filter(source => this._has(source));
        if (!id || !pv.length || typeof this._hass.callWS !== 'function' || typeof this._hass.callApi !== 'function') return;
        const zone = this._zone, today = zoneMidnight(Date.now(), zone), day = zoneParts(today, zone), from = zoneDate(zone, day.y, day.m, day.d - 7);
        try {
            const [{ data }, statistics] = await Promise.all([
                this._has(id) ? this._history([id], from) : { data: [] },
                this._statistics(pv, from, today, 'day', ['change']),
            ]);
            if (request !== this._forecastWeekRequest) return;
            const forecasts = new Map(), actual = new Map(), factor = this._factor(id);
            for (const p of this._series(data, [id])[0])
                if (p.t >= from.getTime() && p.t < today.getTime()) forecasts.set(zoneMidnight(p.t, zone).getTime(), p.v * factor);
            for (const source of pv)
                for (const row of statistics?.[source] ?? []) {
                    const t = zoneMidnight(typeof row.start === 'number' ? row.start : Date.parse(row.start), zone).getTime(), v = Number(row.change);
                    if (Number.isFinite(v)) actual.set(t, (actual.get(t) ?? 0) + Math.max(0, v * this._factor(source)));
                }
            const week = { actual: 0, forecast: 0 };
            for (const [t, forecast] of forecasts)
                if (actual.has(t)) { week.actual += actual.get(t); week.forecast += forecast; }
            this._forecastWeek = week.forecast > 0 ? week : null;
            this._pvWeekAverage = actual.size ? [...actual.values()].reduce((a, b) => a + b, 0) / actual.size : null;
        } catch (e) {
            if (request !== this._forecastWeekRequest) return;
        }
        this._updateForecastTile();
    }
    _updateSoc() {
        if (!this._hass || !this._id('socDialog')?.open) return;
        const soc = this._num(this._socEntity);
        this._text('socNow', soc === null ? '—' : `${soc.toFixed(1)}%`);
    }
    async _loadSocHistory() {
        if (!this._hass) return;
        if (!this._socEntity) {
            this._text('socChartStatus', 'Battery SOC not configured');
            return;
        }
        await this._dialogChart('socChart', 'socChartStatus', 'No recorded battery history today', [this._socEntity],
            ([points]) => [{ points, color: 'var(--c-battery)', name: 'SOC', unit: '%' }], 100);
    }
    async _loadPvHistory() {
        if (!this._hass) return;
        const strings = this._pv.map((pv, i) => ({ ...pv, color: PV_COLORS[i % PV_COLORS.length] })).filter(pv => this._has(pv.power));
        const third = this._ent('third_party_pv_power');
        if (this._has(third) && this._hasThirdPartyPv()) strings.push({ name: 'Third-party PV', power: third, color: 'var(--pv-third)' });
        const ids = strings.map(pv => pv.power);
        if (!ids.length) {
            this._text('pvChartStatus', 'No PV power entities configured');
            return;
        }
        await this._dialogChart('pvChart', 'pvChartStatus', 'No recorded PV history today', ids, series => series.map((points, i) => {
            const factor = this._factor(ids[i]);
            return { points: points.map(p => ({ t: p.t, v: p.v * factor })), color: strings[i].color, name: strings[i].name };
        }));
    }
    // Recorded states of [ids] from [start] (today's midnight in Home Assistant's time zone) until now.
    async _history(ids, start = zoneMidnight(Date.now(), this._zone), end = new Date()) {
        const query = `history/period/${encodeURIComponent(start.toISOString())}?filter_entity_id=${encodeURIComponent(ids.join(','))}&end_time=${encodeURIComponent(end.toISOString())}&minimal_response&no_attributes`;
        return { start: start.getTime(), data: await this._hass.callApi('GET', query) };
    }
    // A dialog's chart of today's history and its status: [toSeries] turns each id's points into the chart's series.
    // With [hours], it shows the last [hours] hours instead; [fit] fits the value axis to the data.
    // [signed] draws values either side of 0.
    async _dialogChart(chart, status, empty, ids, toSeries, top, { hours, fit, signed = false } = {}) {
        const svg = this._id(chart), request = svg._request = (svg._request ?? 0) + 1;
        this._text(status, 'Loading history…');
        try {
            const { start, data } = await this._history(ids, hours ? new Date(Date.now() - hours * 3600e3) : undefined);
            if (request !== svg._request) return;
            const hasData = this._showChart(svg, toSeries(this._series(data, ids)), start, signed, top, hours ? { end: Date.now(), fit } : undefined);
            this._text(status, hasData ? hours ? `Last ${hours} hours` : 'Midnight → now' : empty);
        } catch (e) {
            if (request !== svg._request) return;
            this._text(status, 'Recorder history unavailable');
            svg.replaceChildren();
        }
    }
    _power(v) {
        return v === null ? '—' : formatPower(v)
    }
    _kwh(v) {
        return `${v.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}\u00A0kWh`;
    }
    // Lifetime charged / discharged; discharged (V2G / V2H) is left out while it reads 0.
    _lifetime(charged, discharged) {
        return [charged === null ? '' : `Lifetime ↓\u00A0${this._kwh(charged)}`, discharged === null || discharged === 0 ? '' : `↑\u00A0${this._kwh(discharged)}`];
    }
    _energy(v) {
        return v === null ? '—' : `${v.toFixed(2)} kWh`
    }
    // Positive power runs from the start of the flow's path to its end.
    _flow(id, power) {
        if (!this._flowStates) this._flowStates = {};
        this._flowStates[id] = { active: power !== null && Math.abs(power) >= .025, reverse: power !== null && power < 0, kw: power === null ? 0 : Math.abs(power) };
        this._applyFlowClass(id);
    }
    _applyFlowClass(id) {
        const group = this._id(id);
        if (!group) return;
        group.classList.toggle('active', !!this._flowStates[id].active);
        group.classList.toggle('moving', !matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
    connectedCallback() {
        if (!this.root) return;
        if (!this._chartObserver) this._observeCharts();
        if (!this._flowFrame) this._startFlowAnimation();
        this._statTimer ??= setInterval(() => { if (this._view().current) this._loadView(true); }, 300000);
        this._historyTimer ??= setInterval(() => {
            if (document.hidden) return;
            this._advanceChart();
            if ((this._shown.has('tiles') || this._shown.has('metrics')) && Date.now() - (this._forecastAt ?? 0) > 3600e3) this._loadForecast();
        }, 30000);
    }
    _startFlowAnimation() {
        if (this._flowFrame) cancelAnimationFrame(this._flowFrame);
        if (!this._shown.has('scene')) return;
        let previousFrame = null;
        const draw = (now) => {
            if (!this.isConnected) {
                this._flowFrame = null;
                return;
            }
            const dt = previousFrame === null ? 0 : Math.min(now - previousFrame, 100) / 1000;
            previousFrame = now;
            // The speed eases towards the home power's, and the cycle advances by distance so a change of speed
            // moves no pulse.
            const home = this._flowStates?.homeFlow, target = PULSE.speed[0] + PULSE.speed[1] * Math.sqrt(home?.active ? home.kw : 0);
            this._pulseSpeed = this._pulseSpeed === undefined ? target : this._pulseSpeed + (target - this._pulseSpeed) * Math.min(1, dt * 2);
            const { cycle } = this._pulseCycle();
            this._pulseAt = ((this._pulseAt ?? 0) + this._pulseSpeed * dt) % cycle;
            for (const item of this._flowItems) {
                const state = this._flowStates?.[item.id];
                if (!state?.active || (item.parent && !this._flowStates[item.parent.id]?.active)) continue;
                if (!item.length) {
                    item.length = item.wire.getTotalLength();
                    this._addGlowFilter(item);
                    if (item.parent) item.fork = this._forkDistance(item.parent, item);
                }
                // Centre of the pulse, measured along the direction of travel.
                const travelled = this._pulseAt - this._pulseStart(item.parent ?? item) - PULSE.length / 2 - (item.fork ?? 0);
                const centre = state.reverse ? item.length - travelled : travelled;
                const place = (el, dash) => {
                    el.setAttribute('stroke-dasharray', `${dash} ${cycle - dash}`);
                    el.setAttribute('stroke-dashoffset', `${dash / 2 - centre}`);
                };
                place(item.glow, PULSE.length * .6);
                item.comets.forEach((el, i) => place(el, PULSE.length * COMET_LAYERS[i]));
            }
            this._flowFrame = requestAnimationFrame(draw);
        };
        this._flowFrame = requestAnimationFrame(draw);
    }
    // The cycle, measured as the distance the pulses travel in it: the inverter's pulse crossing its line and the
    // gateway ([toGateway]) and then running on into HOME. Both are fixed by the scene's geometry.
    _pulseCycle() {
        if (!this._cycle) {
            const wire = id => this._flowItems.find(item => item.id === id).wire;
            const inverter = wire('inverterFlow'), home = wire('homeFlow');
            const exit = inverter.getPointAtLength(inverter.getTotalLength()), entry = home.getPointAtLength(0);
            const toGateway = inverter.getTotalLength() + Math.hypot(entry.x - exit.x, entry.y - exit.y);
            this._cycle = { toGateway, cycle: toGateway + home.getTotalLength() + PULSE.length };
        }
        return this._cycle;
    }
    // How far into the cycle a line's pulse starts: the inverter's pulse and the lines into the gateway start the
    // cycle, lines out of the gateway start as the inverter's pulse comes out of the gateway, and the solar pulse is
    // halfway into the inverter as the cycle starts.
    _pulseStart(item) {
        const { toGateway, cycle } = this._pulseCycle();
        if (item.id === 'solarFlow') {
            item.length ||= item.wire.getTotalLength();
            return cycle - item.length - PULSE.length / 2;
        }
        const end = GATEWAY_ENDS[item.id];
        return end && (end === 'start') !== !!this._flowStates[item.id].reverse ? toGateway : 0;
    }
    // The blur region is fixed in scene units because a level or upright path has no area to scale from.
    _addGlowFilter(item) {
        const ns = 'http://www.w3.org/2000/svg', pad = 24, box = item.wire.getBBox();
        const filter = document.createElementNS(ns, 'filter');
        filter.id = `glow-${item.id}`;
        for (const [name, value] of Object.entries({ filterUnits: 'userSpaceOnUse', x: box.x - pad, y: box.y - pad, width: box.width + 2 * pad, height: box.height + 2 * pad }))
            filter.setAttribute(name, value);
        filter.innerHTML = '<feGaussianBlur stdDeviation="3"/>';
        this.root.querySelector('defs').append(filter);
        item.glow.setAttribute('filter', `url(#${filter.id})`);
    }
    // Distance along the parent's path to the point where the branch starts.
    _forkDistance(parent, branch) {
        const start = branch.wire.getPointAtLength(0);
        let nearest = 0, best = Infinity;
        for (let at = 0; at <= parent.length; at += .5) {
            const point = parent.wire.getPointAtLength(at);
            const distance = Math.hypot(point.x - start.x, point.y - start.y);
            if (distance < best) { best = distance; nearest = at; }
        }
        return nearest;
    }
    disconnectedCallback() {
        if (this._chartObserver) { this._chartObserver.disconnect(); this._chartObserver = null; }
        if (this._flowFrame) cancelAnimationFrame(this._flowFrame);
        this._flowFrame = null;
        clearInterval(this._statTimer);
        this._statTimer = null;
        clearInterval(this._historyTimer);
        this._historyTimer = null;
    }
    _update() {
        if (!this._hass)
            return;
        this._socEntity = this._ent('battery_soc');
        if (this._shown.has('scene')) this._updateReadings();
        if (this._shown.has('metrics')) {
            this._id('legendEVAC').hidden = !this._has(this._ent('ac_charger_power'));
            this._id('legendEVDC').hidden = !this._has(this._ent('dc_charger_power'));
        }
        if (this._shown.has('tiles')) this._updateDaily();
        if (this._shown.has('battery') && this.config.battery_present) this._updateBattery();
        this._updateSoc();
        this._updateEnergy();
    }
    // The scene's readings and flows.
    _updateReadings() {
        const n = x => this._num(x)
          , e = key => this._ent(key)
          , kw = key => this._scaled(this._ent(key))   // kW or kWh, whatever unit the entity reports
          , pv = kw('pv_power')
          , home = this._homePower();
        // Without a battery, its power is 0.
        const batRaw = this.config.battery_present ? kw('battery_power') : 0, bat = batRaw === null ? null : batRaw * this._batterySign();
        const soc = n(this._socEntity);
        const imp = kw('grid_import_power')
          , exp = kw('grid_export_power');
        const ac = kw('ac_charger_power')
          , dc = kw('dc_charger_power');
        const hasAc = this._has(e('ac_charger_power')), hasDc = this._has(e('dc_charger_power'));
        this._id('dcGear').hidden = !this._has(e('dc_charger_limit'));
        this._id('acNode').hidden = !hasAc;
        this._id('dcNode').hidden = !hasDc;
        this._id('chargerArt').setAttribute('display', hasAc || hasDc ? 'inline' : 'none');
        // With car_shown: auto, the garage patch hides the car unless a vehicle is connected to the AC charger, a charger
        // has power (either way for DC: the car may supply the house) or car_charging says so.
        const plugged = this._hass.states[e('car_charging')]?.state?.toLowerCase()
          , connected = AC_CONNECTED.has(this._hass.states[e('ac_charger_state')]?.state?.toLowerCase())
          , showCar = this.config.car_shown !== 'auto' ? this.config.car_shown : connected || ac > 0.025 || Math.abs(dc ?? 0) > 0.025 || ['on', 'charging', 'true'].includes(plugged) || Number(plugged) > 0;
        // A car_image is drawn over the empty garage.
        this._id('garageArt').setAttribute('display', showCar && !this.config.car_image ? 'none' : 'inline');
        this._id('carArt').setAttribute('display', showCar && this.config.car_image ? 'inline' : 'none');
        const grid = imp !== null && imp > 0 ? imp : exp !== null && exp > 0 ? -exp : imp ?? (exp === null ? null : -exp);
        this._text('pv', this._power(pv));
        this._text('home', this._power(home));
        if (this.config.battery_present) {
            this._text('battery', this._power(bat));
            this._text('soc', soc === null ? '—' : `${soc.toFixed(1)}%`);
            const battStatus = bat === null ? '' : bat > 0.025 ? 'Charging' : bat < -.025 ? 'Discharging' : 'Idle', remaining = this._batteryRemaining(bat, soc, home);
            this._learnOverhead(pv, imp, exp, bat, ac, dc, home);
            // The bracket stays on one line: a narrow column wraps before it.
            this._text('battStatus', remaining ? `${battStatus} (remaining\u00A0time:\u00A0${remaining})` : battStatus);
        }
        this._text('grid', this._power(grid));
        this._text('gridStatus', grid === null ? '' : grid > 0.025 ? 'Importing' : grid < -.025 ? 'Exporting' : 'Idle');
        const phases = this._gridPhases();
        this._id('gridButton').disabled = !phases;
        this._id('gridMore').hidden = !phases;
        const loads = this._homeLoads().length;
        this._id('homeButton').disabled = !loads;
        this._id('homeMore').hidden = !loads;
        this._text('gridLabel', this.config.show_grid_voltage ? this._gridLabel(phases) : '');
        const phase = this._hass.states[e('phase_mode')]?.state;
        this._text('phaseMode', !this.config.show_phase_mode ? '' : phase === 'on' ? 'Power Per Phase Mode' : phase === 'off' ? 'Total Power Mode' : '');
        const acTotal = kw('ac_charger_total_energy');
        this._text('acTotal', !this.config.show_lifetime || acTotal === null ? '' : `${this._kwh(acTotal)} consumed`);
        this._parts('dcLifetime', !this.config.show_lifetime ? [] : this._lifetime(kw('dc_charger_lifetime_charged_energy'), kw('dc_charger_lifetime_discharged_energy')));
        this._text('ac', this._power(ac));
        this._text('dc', this._power(dc));
        // ac_charger_soc / ac_charger_range at the top level are the original keys and still work.
        const carEntity = e('ac_charger_vehicle_soc') ?? (this.config.entities?.ac_charger_vehicle_soc === undefined ? this.config.ac_charger_soc : null)
          , rangeEntity = e('ac_charger_vehicle_range') ?? (this.config.entities?.ac_charger_vehicle_range === undefined ? this.config.ac_charger_range : null);
        const car = carEntity ? n(carEntity) : null
          , range = rangeEntity ? n(rangeEntity) : null
          , dcsoc = n(e('dc_charger_vehicle_soc'));
        const acState = this._hass.states[e('ac_charger_state')]?.state?.split('-')[0];
        const carText = !carEntity ? '' : car === null ? 'Vehicle SOC unavailable' : `${car.toFixed(0)}%${range === null ? '' : ` · ${range.toFixed(0)} km`}`;
        this._parts('acSoc', [acState && !['unknown', 'unavailable'].includes(acState) ? acState : '', carText]);
        // The inverter reports 0% with no DC vehicle attached; a genuine 0% while charging is still shown.
        // Negative DC power is the vehicle supplying the house.
        const dcState = dc === null ? '' : dc > 0.025 ? 'Charging' : dc < -0.025 ? 'Discharging' : '';
        const dcSocText = dcsoc === null || (dcsoc === 0 && !dcState) ? '' : `Vehicle SOC ${dcsoc.toFixed(0)}%`;
        this._parts('dcSoc', [dcState, dcSocText]);
        // SigenStor's AC output: solar less battery charging (positive battery power) less DC charging.
        const inverter = pv !== null && bat !== null ? pv - bat - (dc ?? 0) : home !== null && grid !== null ? home - grid : null;
        this._flow('solarFlow', pv);
        this._flow('inverterFlow', inverter);
        this._flow('homeFlow', home);
        this._flow('homeBranch', home);
        this._flow('gridFlow', grid === null ? null : -grid);
        this._updatePv();
        this._updateGrid();
        this._updateHome();
        this._text('stamp', new Date().toLocaleTimeString([], { timeZone: this._zone }));
    }
    // The Battery level panel.
    _updateBattery() {
        const soc = this._num(this._socEntity), cap = this._scaled(this._ent('battery_capacity'));
        this._id('socLevel').dataset.entity = this._socEntity ?? '';
        this._text('socLarge', soc === null ? '—' : `${soc.toFixed(1)}%`);
        this._id('socFill').style.width = `${Math.min(100, Math.max(0, soc ?? 0))}%`;
        this._text('capacityText', cap === null ? '' : `${((soc ?? 0) * cap / 100).toFixed(1)} of ${cap.toFixed(1)} kWh`);
    }
    // Today's sunrise and sunset, for the scene's day and night; the chart shows those of the day it shows.
    _updateSunTimes() {
        this._sunTimes = this._sunFor(new Date());
        if (!this._id('sunTimes')) return;
        const view = this._view(), sun = view.live ? this._sunTimes : this._sunFor(view.start);
        this._id('sunTimes').style.display = view.range === 'Day' ? '' : 'none';
        const fmt = t => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: this._zone });
        this._text('sunrise', `Sunrise ${sun ? fmt(sun.rise) : '—'}`);
        this._text('sunset', `Sunset ${sun ? fmt(sun.set) : '—'}`);
    }
    // Sunrise and sunset on [date]'s day from Home Assistant's location, null without one or in polar day or night.
    // (sun.sun's next_rising / next_setting move to tomorrow once today's have passed.)
    _sunFor(date) {
        const lat = Number(this._hass?.config?.latitude);
        const lon = Number(this._hass?.config?.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
        // SunCalc solar equations, evaluated at local noon for the selected day.
        const day = zoneParts(date, this._zone);
        const noon = zoneDate(this._zone, day.y, day.m, day.d, 12);
        const rad = Math.PI / 180, dayMs = 86400000, J1970 = 2440588, J2000 = 2451545;
        const toJulian = d => d.valueOf() / dayMs - .5 + J1970;
        const fromJulian = j => new Date((j + .5 - J1970) * dayMs);
        const lw = -lon * rad, phi = lat * rad;
        const d = toJulian(noon) - J2000;
        const n = Math.round(d - .0009 - lw / (2 * Math.PI));
        const ds = .0009 + lw / (2 * Math.PI) + n;
        const M = rad * (357.5291 + .98560028 * ds);
        const C = rad * (1.9148 * Math.sin(M) + .02 * Math.sin(2 * M) + .0003 * Math.sin(3 * M));
        const L = M + C + rad * 102.9372 + Math.PI;
        const dec = Math.asin(Math.sin(L) * Math.sin(rad * 23.4397));
        const Jnoon = J2000 + ds + .0053 * Math.sin(M) - .0069 * Math.sin(2 * L);
        const cosH = (Math.sin(-.833 * rad) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
        if (cosH < -1 || cosH > 1) return null;
        const h = Math.acos(cosH);
        const Jset = J2000 + (.0009 + (h + lw) / (2 * Math.PI) + n) + .0053 * Math.sin(M) - .0069 * Math.sin(2 * L);
        const Jrise = Jnoon - (Jset - Jnoon);
        return { rise: fromJulian(Jrise).getTime(), set: fromJulian(Jset).getTime() };
    }
    _wireStatistics() {
        // The view starts at the configured period, and keeps the one chosen in the header while the period is unchanged.
        if (this._stat?.period !== this.config.period) this._stat = { range: PERIODS[this.config.period], date: new Date(), selection: null, flows: null, period: this.config.period };
        const stat = this._stat;
        if (!this._id('statRange')) return;
        this._id('statRange').value = stat.range;
        this._id('statRange').addEventListener('change', event => {
            Object.assign(stat, { range: event.target.value, date: new Date(), selection: null });
            this._loadView();
        });
        const step = direction => {
            Object.assign(stat, { date: statStep(stat.range, stat.date, direction, this._zone), selection: null });
            this._loadView();
        };
        this._id('statPrev').addEventListener('click', () => step(-1));
        this._id('statNext').addEventListener('click', () => step(1));
        const chart = this._id('statChart');
        if (!chart) return this._statControls();
        const choose = target => {
            const node = target.closest?.('[data-side]');
            if (!node) return;
            const { side } = node.dataset, index = Number(node.dataset.index);
            stat.selection = stat.selection?.side === side && stat.selection.index === index ? null : { side, index };
            this._drawStat();
        };
        chart.addEventListener('click', event => choose(event.target));
        chart.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            choose(event.target);
        });
        chart._redraw = () => this._drawStat();
        this._id('statCopy').addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(`${this._statJson}\n${this._id('statDebug').textContent}`);
                this._text('statCopied', 'Copied');
            } catch (error) {
                this._text('statCopied', 'Copy failed: use Download');
            }
        });
        this._statControls();
        this._drawStat();
    }
    // The view chosen in the header, which everything but the scene and the battery level follows: [range] and the window
    // [start, end) containing [date]; [current] when it holds now, [live] for today's Day, read from the sensors.
    _view() {
        const { range, date } = this._stat ?? { range: 'Day', date: new Date() }, [start, end] = statWindow(range, date, this._zone);
        const now = Date.now(), current = start.getTime() <= now && now < end.getTime();
        return { range, date, start, end, current, live: range === 'Day' && current, key: `${range} ${start.getTime()}` };
    }
    // Loads what the view shows; [refresh] is the periodic reload of a current view, which leaves live parts alone.
    _loadView(refresh = false) {
        const view = this._view();
        if (this._stat) this._stat.follow = view.current;
        const shown = part => this._shown.has(part);
        if (!refresh) this._blankCharts();
        this._statControls();
        if (shown('sankey')) this._loadStatistics();
        // Today's tiles read the sensors, so they have no gaps to mark.
        if (shown('metrics') || shown('sankey') || (shown('tiles') && !view.live)) this._loadGaps();
        if (refresh && view.live) return;
        if (shown('tiles')) this._loadTiles(refresh);
        if (!shown('metrics')) return;
        if (view.range === 'Day') { if (!refresh || !view.live) this._loadHistory(); }
        else this._loadBars();
        this._updateSunTimes();
    }
    // A new view blanks the charts, keeping their size, with a busy mark until its data arrives.
    _blankCharts() {
        const chart = this._id('chart'), stat = this._id('statChart');
        this._chartLive = null;
        if (this._stat) this._stat.flows = null;
        if (chart) {
            this._hideHover(chart, this._id('chartTip'));
            chart.replaceChildren();
            chart._redraw = chart._chart = null;
            this._text('chartStatus', 'Loading…');
            this._id('chartBusy').hidden = false;
        }
        if (stat) {
            stat.replaceChildren();
            this._id('statSummary').hidden = true;
            this._id('statCards').replaceChildren();
            this._id('statBusy').hidden = false;
        }
    }
    // Gaps in the recording: the hours (Day, Week, Month) or days (Year, Lifetime) of the view in which a counter the
    // card reads has no recorder statistics, up to the last complete one. The tiles' counters are checked from the day the
    // card's first statistics start, so a counter added later shows the time it missed; the others (chargers, EVDC,
    // third-party PV) from their own first day. [_gaps] holds the merged ranges, each with the ids it affects.
    async _loadGaps() {
        const view = this._view(), zone = this._zone;
        if (!this._hass || typeof this._hass.callWS !== 'function') return;
        const tiles = DAILY_TILES.map(([, key, , third, statKey, statThird]) => this._tileSources(key, third, statKey, statThird).ids);
        const core = new Set(tiles.map(ids => ids[0]).filter(Boolean)), daily = DAILY_TILES.map(([, key]) => this._ent(key)).filter(id => id && this._has(id));
        const checked = [...new Set([...tiles.flat(), ...this._statIds().ids])], all = [...new Set([...checked, ...daily])];
        if (!checked.length) return;
        try {
            // Each id's first day with statistics, kept for the card's life.
            const signature = all.join(',');
            if (this._firsts?.signature !== signature) {
                const months = await this._statistics(all, new Date(Date.UTC(2015, 0, 1)), new Date(), 'month', ['change']);
                const firstMonth = Object.values(months).map(rows => rows[0]?.start).filter(t => t !== undefined).map(t => typeof t === 'number' ? t : Date.parse(t));
                const firsts = new Map();
                if (firstMonth.length) {
                    const from = new Date(Math.min(...firstMonth)), last = zoneParts(Math.max(...firstMonth), zone);
                    const days = await this._statistics(all, from, zoneDate(zone, last.y, last.m + 1, 1), 'day', ['change']);
                    for (const id of all) { const t = days[id]?.[0]?.start; if (t !== undefined) firsts.set(id, typeof t === 'number' ? t : Date.parse(t)); }
                }
                this._firsts = { signature, firsts };
            }
            const { firsts } = this._firsts, origin = Math.min(...[...core, ...daily].map(id => firsts.get(id) ?? Infinity));
            const hourly = !['Year', 'Lifetime'].includes(view.range), now = Date.now();
            // An hour counts once Home Assistant has had time to compile it; a day once it is over.
            const end = Math.min(view.end.getTime(), hourly ? now - 5400e3 : zoneMidnight(now, zone).getTime());
            const ranges = [];
            if (end > view.start.getTime() && Number.isFinite(origin)) {
                const rows = await this._statistics(checked, view.start, new Date(end), hourly ? 'hour' : 'day', ['change']);
                const startOf = row => typeof row.start === 'number' ? row.start : Date.parse(row.start);
                for (const id of checked) {
                    const from = Math.max(view.start.getTime(), core.has(id) ? origin : firsts.get(id) ?? Infinity), have = new Set((rows[id] ?? []).map(startOf));
                    // Hours as Home Assistant aligns them, on the hour in UTC; days at midnight in its time zone.
                    const next = hourly ? t => t + 3600e3 : t => { const p = zoneParts(t, zone); return zoneDate(zone, p.y, p.m, p.d + 1).getTime(); };
                    let t = hourly ? Math.ceil(from / 3600e3) * 3600e3 : zoneMidnight(from, zone).getTime();
                    if (!hourly && t < from) t = next(t);
                    for (; t < end; t = next(t)) if (!have.has(t)) ranges.push({ start: t, end: next(t), ids: new Set([id]) });
                }
            }
            // Merged across ids: one range per stretch, with every id missing in it.
            ranges.sort((a, b) => a.start - b.start);
            const merged = [];
            for (const range of ranges) {
                const last = merged[merged.length - 1];
                if (last && range.start <= last.end) { last.end = Math.max(last.end, range.end); range.ids.forEach(id => last.ids.add(id)); }
                else merged.push({ ...range, ids: new Set(range.ids) });
            }
            if (view.key !== this._view().key) return;
            this._gaps = { key: view.key, ranges: merged, hourly };
        } catch (e) {
            if (view.key !== this._view().key) return;
            this._gaps = { key: view.key, ranges: [], hourly: true };
        }
        this._updateDaily();
        this._markStatGap();
        this._id('chart')?._redraw?.();
    }
    // The current view's gaps within [start, end), for [ids] when given.
    _gapsIn(start, end, ids) {
        const gaps = this._gaps?.key === this._view().key ? this._gaps : null;
        return (gaps?.ranges ?? []).filter(r => r.start < end && r.end > start && (!ids || ids.some(id => r.ids.has(id))));
    }
    // "1 Feb – 9 Feb 2026 (9 days)", "6 Nov 03:00 – 05:00 (2 h)".
    _gapText(ranges) {
        const zone = this._zone, hourly = this._gaps?.hourly;
        const day = t => new Date(t).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric', timeZone: zone });
        const time = t => zoneMidnight(t, zone).getTime() === t ? 'midnight' : new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: zone });
        const parts = ranges.slice(0, 4).map(r => {
            const hours = Math.round((r.end - r.start) / 3600e3), length = hours < 48 ? `${hours} h` : `${Math.round(hours / 24)} days`;
            if (!hourly) return `${day(r.start)}${hours > 24 ? ` – ${day(r.end - 1)}` : ''} (${length})`;
            return day(r.start) === day(r.end - 1) ? `${day(r.start)} ${time(r.start)} – ${time(r.end)} (${length})` : `${day(r.start)} ${time(r.start)} – ${day(r.end - 1)} ${time(r.end)} (${length})`;
        });
        return parts.join(', ') + (ranges.length > 4 ? ` and ${ranges.length - 4} more` : '');
    }
    _gapNote(what, ranges) {
        return `${what}: Home Assistant has no data recorded for ${this._gapText(ranges)}. Energy from that time is missing here, or, if the inverter kept counting, counted when recording resumed.`;
    }
    _markStatGap() {
        const view = this._view(), mark = this._id('statGap');
        if (!mark) return;
        const ranges = this._gapsIn(view.start.getTime(), view.end.getTime(), this._statIds().ids);
        mark.hidden = !ranges.length;
        mark.dataset.note = ranges.length ? this._gapNote('Energy statistics', ranges) : '';
    }
    _showNote(anchor) {
        const note = this._id('gapNote'), rect = anchor.getBoundingClientRect();
        note.textContent = anchor.dataset.note ?? '';
        note.hidden = !note.textContent;
        note.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - 280))}px`;
        note.style.top = `${rect.bottom + 6}px`;
    }
    // The ids a tile reads for a view other than today's Day: its lifetime counter, else its daily sensor.
    _tileSources(key, third, statKey, statThird) {
        const sources = (k, t) => {
            const own = this._ent(k);
            return own && this._has(own) ? (t ? this._pvSources(k, t, true) : [own]).filter(id => this._has(id)) : [];
        };
        const lifetime = sources(statKey, statThird);
        return lifetime.length ? { ids: lifetime } : { ids: sources(key, third), daily: true };
    }
    _updateDaily() {
        const view = this._view(), tiles = this._tiles?.key === view.key ? this._tiles : null;
        for (const [el, key, , third] of DAILY_TILES) {
            const id = this._ent(key), tile = this._id(el)?.closest('.stat');
            if (!this._id(`${el}Gap`)) continue;
            if (!tile) continue;
            tile.hidden = !id;
            if (!id) continue;
            this._text(el, this._energy(view.live ? this._tileLive(key, third) : tiles?.values?.get(el) ?? null));
            tile.dataset.entity = id;
            // Today's tiles read the sensors themselves, which a gap in the recording doesn't touch.
            const [, , label, , statKey, statThird] = DAILY_TILES.find(([found]) => found === el), mark = this._id(`${el}Gap`);
            const ranges = view.live ? [] : this._gapsIn(view.start.getTime(), view.end.getTime(), this._tileSources(key, third, statKey, statThird).ids);
            mark.hidden = !ranges.length;
            mark.dataset.note = ranges.length ? this._gapNote(label, ranges) : '';
        }
        this._updateForecastTile();
    }
    _tileLive(key, third) {
        return third ? this._pvTotal(key, third) : this._scaled(this._ent(key));
    }
    // A view other than today's Day: each tile's lifetime counter's recorder statistics over the view, as the energy
    // metrics and the energy statistics read them, so the three agree; a counter keeps counting through a gap in the
    // recording, which a daily sensor loses. Without the counter, the daily sensor's statistics up to today, plus its
    // reading when the view holds today. The solar total adds the third-party inverter's, as today's does. A past day
    // also has its solar forecast, the last state its entity recorded that day.
    async _loadTiles(refresh = false) {
        const view = this._view(), zone = this._zone;
        if (view.live || !this._hass) return this._updateDaily();
        const tiles = this._tiles = refresh && this._tiles?.key === view.key ? this._tiles : { key: view.key };
        this._updateDaily();
        const end = view.current ? new Date() : view.end, midnight = new Date(Math.min(view.end.getTime(), zoneMidnight(Date.now(), zone).getTime()));
        const period = view.range === 'Day' ? 'hour' : DAILY_BARS.has(view.range) ? 'day' : 'month', forecastId = this._ent('solar_forecast_today');
        const list = DAILY_TILES.map(([el, key, , third, statKey, statThird]) => ({ el, key, third, ...this._tileSources(key, third, statKey, statThird) }));
        const ids = daily => [...new Set(list.filter(tile => !!tile.daily === daily).flatMap(tile => tile.ids))];
        try {
            const [lifetime, daily, history] = await Promise.all([
                ids(false).length ? this._statistics(ids(false), view.start, end, period, ['change']) : {},
                ids(true).length && midnight > view.start ? this._statistics(ids(true), view.start, midnight, period, ['change']) : {},
                view.range === 'Day' && forecastId && this._has(forecastId) ? this._history([forecastId], view.start, view.end) : null,
            ]);
            if (tiles !== this._tiles) return;
            const change = (statistics, id) => statistics?.[id]?.length ? statistics[id].reduce((sum, row) => sum + Math.max(0, Number(row.change) || 0), 0) * this._factor(id) : null;
            tiles.values = new Map(list.map(tile => {
                const [own, ...rest] = tile.ids.map(id => change(tile.daily ? daily : lifetime, id));
                const recorded = own === null || own === undefined ? null : rest.reduce((sum, v) => sum + (v ?? 0), own);
                const today = tile.daily && view.current ? this._tileLive(tile.key, tile.third) : null;
                return [tile.el, recorded === null && today === null ? null : (recorded ?? 0) + (today ?? 0)];
            }));
            const points = history ? this._series(history.data, [forecastId])[0].filter(p => p.t < view.end.getTime()) : [];
            tiles.forecast = points.length ? points[points.length - 1].v * this._factor(forecastId) : null;
        } catch (e) {
            if (tiles !== this._tiles) return;
            Object.assign(tiles, { values: new Map(), forecast: null });
        }
        this._updateDaily();
    }
    _statControls() {
        if (!this._stat || !this._id('statDate')) return;
        const { range, date } = this._stat, lifetime = range === 'Lifetime';
        // Each date stays whole; a week's range wraps between its dates.
        const label = this._id('statDate'), text = statLabel(range, date, this._zone);
        if (label.textContent !== text) label.replaceChildren(...text.split(' – ').flatMap((part, i) => [...(i ? [' – '] : []), Object.assign(document.createElement('span'), { textContent: part })]));
        this._id('statPrev').disabled = lifetime;
        this._id('statNext').disabled = lifetime || statWindow(range, statStep(range, date, 1, this._zone), this._zone)[0] > new Date();
    }
    // Recorder statistics of [ids] by [period], keeping the rows that start in [start, end): Home Assistant also returns
    // the period that starts at [end] (a day's request ending at midnight gets today's row so far).
    async _statistics(ids, start, end, period, types) {
        const result = await this._hass.callWS({ type: 'recorder/statistics_during_period', start_time: start.toISOString(), end_time: end.toISOString(), statistic_ids: ids, period, types });
        const at = row => typeof row.start === 'number' ? row.start : Date.parse(row.start), from = start.getTime(), to = end.getTime();
        return Object.fromEntries(Object.entries(result ?? {}).map(([id, rows]) => [id, (rows ?? []).filter(row => at(row) >= from && at(row) < to)]));
    }
    // The lifetime counters of each source and consumer: a list of ids, null without a counter, or 'residual' for the
    // load, which has no sensor: it is what the sources supply beyond the other consumers.
    _statIds() {
        const pick = defs => defs.map(def => {
            if (!def.key) return 'residual';
            // Solar without its own counter would be the third-party inverter's alone, so it is left out instead.
            const ids = def.third ? this._pvSources(def.key, def.third, true) : [this._ent(def.key)];
            return this._has(ids[0]) ? [...new Set(ids.filter(id => this._has(id)))] : null;
        });
        const sourceIds = pick(STAT_SOURCES), sinkIds = pick(STAT_SINKS);
        return { sourceIds, sinkIds, ids: [...new Set([...sourceIds, ...sinkIds].filter(found => Array.isArray(found)).flat())] };
    }
    // Energy metrics for a range longer than a day: each day's (Week, Month), month's (Year) or year's (Lifetime) energy
    // from the lifetime counters' statistics, supplied stacked above 0 and consumed below, as in Sigenergy's app.
    async _loadBars() {
        if (!this._hass) return;
        const view = this._view(), zone = this._zone, request = this._barsRequest = (this._barsRequest ?? 0) + 1;
        this._historyRequest = (this._historyRequest ?? 0) + 1;
        this._chartLive = null;
        // A standalone card's picker, or its dates without one, sits under its title and already shows the range.
        this._text('chartTitle', this._solo ? 'Energy metrics' : `Energy metrics · ${statLabel(view.range, view.date, zone)}`);
        this._id('legendPower').hidden = true;
        const svg = this._id('chart'), legend = this._id('legendBars');
        legend.hidden = false;
        const { sourceIds, sinkIds, ids } = this._statIds();
        const show = (status, slots = [], series = []) => {
            this._text('chartStatus', status);
            const items = series.filter(s => slots.some(slot => slot.values[s.index] > .005 || slot.forecast?.[s.index] > .005)).map(s => {
                const item = document.createElement('span'), dot = Object.assign(document.createElement('i'), { className: 'dot' });
                dot.style.background = s.color;
                item.append(dot, s.name);
                return item;
            });
            if (slots.some(slot => slot.forecast)) {
                const item = document.createElement('span');
                item.append(Object.assign(document.createElement('i'), { className: 'dash' }), 'Forecast');
                items.push(item);
            }
            legend.replaceChildren(...items);
            this._hideHover(svg, this._id('chartTip'));
            this._id('chartBusy').hidden = true;
            svg._redraw = () => this._plotBars(svg, slots, series);
            svg._redraw();
        };
        if (!ids.length || typeof this._hass.callWS !== 'function') return show('No energy statistics sensors');
        this._text('chartStatus', 'Loading…');
        // Each slot's start, from its bucket's start: a day for Week, Last 7 days and Month, a month for Year, a year for Lifetime.
        const daily = DAILY_BARS.has(view.range), slotOf = daily ? t => zoneMidnight(t, zone) : {
            Year: t => { const p = zoneParts(t, zone); return zoneDate(zone, p.y, p.m, 1); }, Lifetime: t => zoneDate(zone, zoneParts(t, zone).y, 0, 1) }[view.range];
        try {
            const end = view.current ? new Date() : view.end;
            const result = await this._statistics(ids, view.start, end, daily ? 'day' : 'month', ['change']);
            if (request !== this._barsRequest) return;
            const buckets = new Map();
            for (const id of ids) {
                const factor = this._factor(id);
                for (const row of result[id] ?? []) {
                    const t = slotOf(typeof row.start === 'number' ? row.start : Date.parse(row.start)).getTime();
                    if (!buckets.has(t)) buckets.set(t, {});
                    const values = buckets.get(t);
                    values[id] = (values[id] ?? 0) + Math.max(0, Number(row.change) * factor || 0);
                }
            }
            // Every day, month or year of the range, empty or not; Lifetime starts at its first year with data.
            const starts = [], first = buckets.size ? Math.min(...buckets.keys()) : null, step = daily ? [0, 0, 1] : { Year: [0, 1, 0], Lifetime: [1, 0, 0] }[view.range];
            for (let t = view.range === 'Lifetime' ? first : view.start.getTime(); t !== null && t < view.end.getTime() && starts.length < 400;) {
                starts.push(t);
                const p = zoneParts(t, zone);
                t = zoneDate(zone, p.y + step[0], p.m + step[1], (daily ? p.d : 1) + step[2]).getTime();
            }
            const load = STAT_SINKS.findIndex(def => !def.key);
            const slots = starts.map(t => {
                const values = buckets.get(t) ?? {}, read = found => Array.isArray(found) ? found.reduce((sum, id) => sum + (values[id] ?? 0), 0) : 0;
                const sources = sourceIds.map(read), sinks = sinkIds.map(read);
                sinks[load] = buckets.has(t) ? Math.max(0, sources.reduce((a, b) => a + b, 0) - sinks.reduce((a, b, j) => a + (j === load ? 0 : b), 0)) : 0;
                const p = zoneParts(t, zone), day = new Date(t);
                return {
                    t, end: starts[starts.indexOf(t) + 1] ?? view.end.getTime(), values: BAR_SERIES.map(s => (s.source ? sources : sinks)[s.at]),
                    label: view.range === 'Lifetime' ? String(p.y) : view.range === 'Year' ? day.toLocaleDateString([], { month: 'short', timeZone: zone }) : String(p.d).padStart(2, '0'),
                    title: view.range === 'Lifetime' ? String(p.y) : view.range === 'Year' ? day.toLocaleDateString([], { month: 'long', year: 'numeric', timeZone: zone })
                        : day.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', timeZone: zone }),
                };
            });
            // Today's bar adds the forecast for the rest of the day, and the days the solar forecast covers have their own.
            const forecast = this._energyForecast, todayStart = zoneMidnight(Date.now(), zone).getTime(), solarAt = 0, loadAt = BAR_SERIES.findIndex(s => s.name === 'Load');
            if (forecast && view.current && daily)
                for (const slot of slots) {
                    const pair = slot.t === todayStart ? forecast.today : slot.t > todayStart && forecast.days.has(slot.t) ? [forecast.days.get(slot.t), forecast.load] : null;
                    if (pair) slot.forecast = { [solarAt]: pair[0] ?? 0, [loadAt]: pair[1] ?? 0 };
                }
            const series = BAR_SERIES.map((s, index) => ({ ...s, index })).filter(s => (s.source ? sourceIds : sinkIds)[s.at]);
            show(buckets.size ? `${daily ? 'Daily' : { Year: 'Monthly', Lifetime: 'Yearly' }[view.range]} energy (kWh)` : 'No recorded energy in this range', slots, series);
        } catch (error) {
            if (request !== this._barsRequest) return;
            show('Statistics unavailable');
        }
    }
    // The energy bars: one stack per slot, supplied above 0 and consumed below, on an axis rounded as the power chart's.
    _plotBars(svg, slots, series) {
        const width = Math.max(240, svg.clientWidth || 900), height = 170, ns = 'http://www.w3.org/2000/svg';
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.replaceChildren();
        const add = (tag, attrs, text, parent = svg) => {
            const el = document.createElementNS(ns, tag);
            for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
            if (text !== undefined) el.textContent = text;
            parent.append(el);
            return el;
        };
        const up = series.filter(s => s.source), down = series.filter(s => !s.source);
        const total = (slot, list) => list.reduce((sum, s) => sum + slot.values[s.index] + (slot.forecast?.[s.index] ?? 0), 0);
        const peak = Math.max(1, ...slots.flatMap(slot => [total(slot, up), total(slot, down)])), step = 10 ** Math.floor(Math.log10(peak)) / 2;
        const max = Math.ceil(peak / step - 1e-9) * step, left = 38, right = width - 12, y = v => 78 - 65 * v / max;
        const cursor = add('rect', { display: 'none', fill: 'var(--grid)', opacity: .35, rx: 3 });
        for (const v of [-max, 0, max]) {
            add('line', { x1: left, y1: y(v), x2: right, y2: y(v), stroke: 'var(--grid)', 'stroke-dasharray': '3 5' });
            add('text', { x: 2, y: y(v) + 4, fill: 'var(--axis)', 'font-size': 10 }, v.toFixed(max < 10 && v % 1 ? 1 : 0));
        }
        const slotWidth = (right - left) / Math.max(1, slots.length), barWidth = Math.min(28, slotWidth * .62);
        // Every slot is labelled while they fit, else every second, fifth… one.
        const every = [1, 2, 5, 10, 20, 50].find(n => slotWidth * n >= 26) ?? 100;
        slots.forEach((slot, i) => {
            const cx = left + slotWidth * (i + .5);
            // The recorded energy, then the forecast stacked beyond it, dashed.
            for (const [list, sign] of [[up, 1], [down, -1]]) {
                let base = 0;
                for (const forecast of [false, true])
                    for (const s of list) {
                        const v = forecast ? slot.forecast?.[s.index] : slot.values[s.index];
                        if (!(v > .005)) continue;
                        const a = y(sign * base), b = y(sign * (base + v));
                        add('rect', { x: (cx - barWidth / 2).toFixed(1), y: Math.min(a, b).toFixed(1), width: barWidth.toFixed(1), height: Math.max(.5, Math.abs(b - a)).toFixed(1), fill: s.color,
                            ...(forecast ? { 'fill-opacity': .18, stroke: s.color, 'stroke-width': 1.2, 'stroke-dasharray': '3 2' } : {}) });
                        base += v;
                    }
            }
            if (i % every === 0) add('text', { x: cx, y: 162, fill: 'var(--axis)', 'font-size': 10, 'text-anchor': 'middle' }, slot.label);
            // Missing data: a mark above the bar; its tip says what is missing.
            slot.gaps = this._gapsIn(slot.t, slot.end);
            if (slot.gaps.length) add('text', { x: cx, y: Math.max(10, y(total(slot, up)) - 4), fill: '#e0a030', 'font-size': 11, 'text-anchor': 'middle' }, '⚠');
        });
        svg._chart = { bars: true, slots, series, width, left, right, slotWidth, cursor, top: y(max), bottom: y(-max) };
        if (svg._lastHover !== undefined) this._hoverBar(svg, svg._tip, svg._lastHover);
    }
    _hoverBar(svg, tip, i) {
        const chart = svg._chart, slot = chart.slots[i];
        if (!slot) return this._hideHover(svg, tip);
        const x = chart.left + chart.slotWidth * i;
        for (const [k, v] of Object.entries({ x, width: chart.slotWidth, y: chart.top, height: chart.bottom - chart.top, display: 'inline' })) chart.cursor.setAttribute(k, v);
        const row = (s, v, forecast) => {
            const line = document.createElement('div'), dot = Object.assign(document.createElement('i'), { className: 'dot' });
            dot.style.background = s.color;
            line.append(dot, s.name, ...(forecast ? [' ', Object.assign(document.createElement('em'), { textContent: 'forecast' })] : []), Object.assign(document.createElement('span'), { textContent: `${v.toFixed(2)} kWh` }));
            return line;
        };
        const lines = [...chart.series.filter(s => slot.values[s.index] > .005).map(s => row(s, slot.values[s.index], false)),
            ...chart.series.filter(s => slot.forecast?.[s.index] > .005).map(s => row(s, slot.forecast[s.index], true))];
        if (slot.gaps?.length) {
            const line = Object.assign(document.createElement('div'), { className: 'gaptip', textContent: `⚠ No data recorded: ${this._gapText(slot.gaps)}` });
            lines.push(line);
        }
        tip.replaceChildren(Object.assign(document.createElement('b'), { textContent: slot.title }), ...(lines.length ? lines : [Object.assign(document.createElement('em'), { textContent: 'No data' })]));
        tip.hidden = false;
        const scale = svg.getBoundingClientRect().width / chart.width, cssX = (x + chart.slotWidth) * scale;
        const fitsRight = cssX + 8 + tip.offsetWidth <= svg.clientWidth;
        tip.style.left = `${fitsRight ? cssX + 8 : Math.max(0, x * scale - 8 - tip.offsetWidth)}px`;
        this._placeTip(tip);
    }
    // Energy per interval comes from the lifetime counters' recorder statistics; each interval is split into
    // flows between sources and consumers and the splits are added up.
    async _loadStatistics() {
        const stat = this._stat;
        if (!this._hass || !stat || !this.config.show_energy_statistics) return;
        this._statControls();
        if (typeof this._hass.callWS !== 'function') {
            this._text('statStatus', 'Statistics unavailable');
            return;
        }
        const { sourceIds, sinkIds, ids } = this._statIds();
        if (!ids.length) {
            stat.flows = null;
            this._drawStat();
            this._text('statStatus', 'No energy statistics sensors');
            return;
        }
        const request = this._statRequest = (this._statRequest ?? 0) + 1;
        this._text('statStatus', 'Loading…');
        const [start, end] = statWindow(stat.range, stat.date, this._zone);
        const fetchStatistics = period => this._statistics(ids, start, end, period, ['change']);
        try {
            let period = STAT_PERIODS[stat.range], result = await fetchStatistics(period);
            if (period === '5minute' && !ids.some(id => result[id]?.length)) result = await fetchStatistics(period = 'hour');
            if (request !== this._statRequest) return;
            const buckets = new Map();
            for (const id of ids) {
                const factor = this._factor(id);
                for (const row of result[id] ?? []) {
                    const time = typeof row.start === 'number' ? row.start : Date.parse(row.start);
                    if (!buckets.has(time)) buckets.set(time, {});
                    buckets.get(time)[id] = Math.max(0, Number(row.change) * factor || 0);
                }
            }
            const flows = STAT_SOURCES.map(() => STAT_SINKS.map(() => 0)), raw = {};
            for (const values of buckets.values()) {
                const read = found => Array.isArray(found) ? found.reduce((sum, id) => sum + (values[id] ?? 0), 0) : 0;
                for (const [id, value] of Object.entries(values)) raw[id] = (raw[id] ?? 0) + value;
                const sources = sourceIds.map(read), sinks = sinkIds.map(read), load = STAT_SINKS.findIndex(def => !def.key);
                sinks[load] = Math.max(0, sources.reduce((a, b) => a + b, 0) - sinks.reduce((a, b, j) => a + (j === load ? 0 : b), 0));
                allocateFlows(sources, sinks).forEach((row, i) => row.forEach((v, j) => { flows[i][j] += v; }));
            }
            Object.assign(stat, { flows, sourceIds, sinkIds });
            const debug = this._id('statDebug');
            debug.hidden = !this.config.debug_energy_statistics;
            debug.textContent = Object.entries(raw).map(([id, value]) => `${id}: ${value.toFixed(2)} kWh`).join('\n');
            const download = this._id('statDownload');
            this._id('statData').hidden = debug.hidden;
            if (!debug.hidden) {
                URL.revokeObjectURL(download.href);
                const data = { range: stat.range, period, start: start.toISOString(), end: end.toISOString(), ids, sourceIds, sinkIds, flows, buckets: [...buckets].sort((a, b) => a[0] - b[0]).map(([time, values]) => ({ time, ...values })) };
                this._statJson = JSON.stringify(data);
                download.href = URL.createObjectURL(new Blob([this._statJson], { type: 'application/json' }));
            }
            this._text('statStatus', buckets.size ? `Estimated split · ${{ '5minute': '5-minute', hour: 'hourly', day: 'daily' }[period]} data` : 'No recorded energy in this range');
            this._drawStat();
        } catch (error) {
            if (request !== this._statRequest) return;
            stat.flows = null;
            this._drawStat();
            this._text('statStatus', 'Statistics unavailable');
        }
    }
    _drawStat() {
        const stat = this._stat, svg = this._id('statChart');
        if (!svg || !stat) return;
        this._id('statBusy').hidden = true;
        const summary = this._id('statSummary'), cards = this._id('statCards');
        const clear = () => {
            svg.replaceChildren();
            svg.removeAttribute('viewBox');
            svg.style.height = '';
            summary.hidden = true;
            cards.replaceChildren();
        };
        const { flows } = stat;
        if (!flows) return clear();
        const total = (list, i) => list === STAT_SOURCES ? flows[i].reduce((a, b) => a + b, 0) : flows.reduce((a, row) => a + row[i], 0);
        const nodes = (list, ids) => list.map((def, i) => ({ ...def, i, total: total(list, i), shown: !!ids[i] })).filter(node => node.shown);
        const left = nodes(STAT_SOURCES, stat.sourceIds), right = nodes(STAT_SINKS, stat.sinkIds);
        const sum = list => list.reduce((a, node) => a + node.total, 0);
        const most = Math.max(sum(left), sum(right));
        if (!(most > 0)) return clear();
        const kWh = v => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const width = Math.max(280, svg.clientWidth || 600), compact = width < 520;
        const nodeWidth = compact ? 78 : 124, gap = 8, scale = ((compact ? 300 : 330) - gap * (Math.max(left.length, right.length) - 1)) / most;
        const place = list => {
            let y = 0;
            for (const node of list) {
                node.h = node.total > 0 ? Math.max(52, node.total * scale) : 22;
                node.y = y;
                y += node.h + gap;
            }
            return y - gap;
        };
        const height = Math.max(place(left), place(right)) + 4;
        const xLeft = nodeWidth, xRight = width - nodeWidth, middle = (xLeft + xRight) / 2;
        const selection = stat.selection && (stat.selection.side === 'src' ? left : right).find(node => node.i === stat.selection.index) ? stat.selection : null;
        const used = new Map(), ribbons = [];
        for (const a of left) for (const b of right) {
            const value = flows[a.i][b.i];
            if (!(value > 0)) continue;
            // Each end covers its node in proportion, so a node taller than its energy (minimum height) is still filled.
            const heightA = value / a.total * a.h, heightB = value / b.total * b.h, y0 = a.y + (used.get(a) ?? 0), y1 = b.y + (used.get(b) ?? 0);
            used.set(a, (used.get(a) ?? 0) + heightA);
            used.set(b, (used.get(b) ?? 0) + heightB);
            const related = selection && (selection.side === 'src' ? a.i === selection.index : b.i === selection.index);
            ribbons.push({ a, b, value, heightA, heightB, y0, y1, related });
        }
        const labels = ribbons.filter(r => r.related).map(r => ({ r, y: selection.side === 'src' ? r.y0 + r.heightA / 2 : r.y1 + r.heightB / 2 })).sort((p, q) => p.y - q.y);
        labels.forEach((label, i) => { if (i) label.y = Math.max(label.y, labels[i - 1].y + 13); });
        const touched = new Set(ribbons.filter(r => r.related).flatMap(r => [r.a, r.b]));
        const column = (list, side, x) => list.map(node => {
            const chosen = selection?.side === side && selection.index === node.i;
            const dim = selection && !chosen && !touched.has(node) ? ' dim' : '';
            // Opposite the selected node, a connected node shows just what it exchanged with the selection.
            const exchanged = selection && selection.side !== side && touched.has(node) ? (side === 'snk' ? flows[selection.index][node.i] : flows[node.i][selection.index]) : null;
            const value = kWh(exchanged ?? node.total), size = Math.min(15, (nodeWidth - 14) / (value.length * .6));
            const text = (exchanged ?? node.total) > 0
                ? `<text class="sktext" x="${x + 8}" y="${node.y + 15}" font-size="11" font-weight="700">${node.name}</text><text class="sktext" x="${x + 8}" y="${node.y + 32}" font-size="${size.toFixed(1)}" font-weight="700">${value}</text><text class="sktext" x="${x + 8}" y="${node.y + 45}" font-size="11">kWh</text>${selection || node.h < 76 ? '' : `<text class="sktext" x="${x + 8}" y="${node.y + node.h - 8}" font-size="11">${(node.total / sum(list) * 100).toFixed(2)}%</text>`}`
                : `<text class="sktext" x="${x + 8}" y="${node.y + 15}" font-size="${compact ? 10 : 11}" font-weight="700">${node.name} 0 kWh</text>`;
            return `<g class="skn${dim}" data-side="${side}" data-index="${node.i}" tabindex="0" role="button" aria-pressed="${chosen}" aria-label="${node.name} ${value} kWh"><rect class="skbox" x="${x}" y="${node.y}" width="${nodeWidth}" height="${node.h}" rx="6" fill="${node.color}"${chosen ? ' stroke="var(--fg)" stroke-width="2"' : ''}/>${text}</g>`;
        }).join('');
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.style.height = `${height}px`;
        svg.innerHTML = `<defs>${ribbons.map(r => `<linearGradient id="skg${r.a.i}-${r.b.i}"><stop offset="0" style="stop-color:${r.a.color}"/><stop offset="1" style="stop-color:${r.b.color}"/></linearGradient>`).join('')}</defs>`
            + ribbons.map(r => `<path class="skr${selection ? (r.related ? ' on' : ' dim') : ''}" fill="url(#skg${r.a.i}-${r.b.i})" d="M${xLeft} ${r.y0} C${middle} ${r.y0} ${middle} ${r.y1} ${xRight} ${r.y1} L${xRight} ${r.y1 + r.heightB} C${middle} ${r.y1 + r.heightB} ${middle} ${r.y0 + r.heightA} ${xLeft} ${r.y0 + r.heightA} Z"/>`).join('')
            + labels.map(({ r, y }) => selection.side === 'src'
                ? `<text class="skpct" x="${xLeft + 6}" y="${y + 4}">${(r.value / r.a.total * 100).toFixed(2)}%</text>`
                : `<text class="skpct" text-anchor="end" x="${xRight - 6}" y="${y + 4}">${(r.value / r.b.total * 100).toFixed(2)}%</text>`).join('')
            + column(left, 'src', 0) + column(right, 'snk', width - nodeWidth);
        if (!selection) {
            summary.hidden = true;
            cards.replaceChildren();
            return;
        }
        const chosen = (selection.side === 'src' ? left : right).find(node => node.i === selection.index);
        const others = selection.side === 'src' ? right : left;
        summary.hidden = false;
        summary.innerHTML = `<b>${kWh(chosen.total)}</b><small>kWh</small><div>${chosen.caption}</div>`;
        cards.innerHTML = others.map(other => {
            const value = selection.side === 'src' ? flows[chosen.i][other.i] : flows[other.i][chosen.i];
            return value > 0 ? `<div class="statcard"><b>${(value / chosen.total * 100).toFixed(2)}%</b><span>${other.caption}</span><span>${kWh(value)} kWh</span></div>` : '';
        }).join('');
    }
    // Power metrics show the day Energy shows: today live, or a past day from the recorder's history, else, beyond it,
    // from the hourly means of the long-term statistics, each placed at the middle of its hour.
    async _loadHistory() {
        if (!this._hass)
            return;
        const request = this._historyRequest = (this._historyRequest ?? 0) + 1, view = this._view(), past = view.live ? null : view;
        this._barsRequest = (this._barsRequest ?? 0) + 1;
        if (this._id('chart')._chart?.bars) this._hideHover(this._id('chart'), this._id('chartTip'));
        this._id('legendPower').hidden = false;
        this._id('legendBars').hidden = true;
        const balance = this._homeFromBalance();
        const specs = CHART_SERIES.map(s => ({ ...s, id: this._ent(s.key) }))
            .filter(s => s.id && (!s.optional || this._has(s.id)) && !(balance && s.key === 'home_power'));
        const ids = specs.map(s => s.id);
        this._text('chartTitle', past ? 'Power metrics' : 'Power metrics · Today');
        try {
            const [from, to] = past ? [past.start, past.end] : [];
            let { start, data } = await this._history(ids, from, to);
            let hourly = false;
            if (past && !this._series(data, ids).some(points => points.length > 1)) {
                const statistics = await this._statistics(ids, from, to, 'hour', ['mean']);
                data = ids.map(id => (statistics?.[id] ?? []).map(row => ({ entity_id: id, state: String(row.mean),
                    last_changed: new Date((typeof row.start === 'number' ? row.start : Date.parse(row.start)) + 1800e3).toISOString() })));
                hourly = true;
            }
            if (request !== this._historyRequest) return;
            this._renderChart(data, specs, start, past ? { hourly } : null);
        } catch (e) {
            if (request !== this._historyRequest) return;
            this._chartLive = null;
            this._text('chartStatus', 'Recorder history unavailable');
            this._id('chart').replaceChildren();
        }
        this._id('chartBusy').hidden = true;
        this._updateSunTimes();
    }
    _series(data, ids) {
        const rows = new Map((data || []).filter(a => a?.length).map(a => [a[0].entity_id, a]));
        return ids.map(id => (rows.get(id) || []).map(s => ({
            t: Date.parse(s.last_changed || s.last_updated),
            v: Number(s.state)
        })).filter(p => Number.isFinite(p.t) && Number.isFinite(p.v)));
    }
    _renderChart(data, specs, start, past = null) {
        const notes = {
            Battery: v => v > .005 ? 'discharging' : v < -.005 ? 'charging' : '',
            Grid: v => v > .005 ? 'import' : v < -.005 ? 'export' : '',
            EVDC: v => v > .005 ? 'discharging' : v < -.005 ? 'charging' : '',
        };
        const series = this._series(data, specs.map(s => s.id)).map((points, i) => {
            // Scale W/MW to kW, flip the consumers' sign, and apply battery_power_invert to the battery series.
            const k = this._chartFactor(specs[i]);
            return {
            points: k === 1 ? points : points.map(p => ({ t: p.t, v: p.v * k })),
            color: specs[i].color,
            name: specs[i].name,
            note: notes[specs[i].name]
        };
        });
        // Without a home entity, Home is the balance of the other series at each of their times.
        let home = null;
        if (this._homeFromBalance()) {
            const times = [...new Set(series.flatMap(s => s.points.map(p => p.t)))].sort((a, b) => a - b);
            const spec = CHART_SERIES.find(s => s.key === 'home_power');
            home = { points: times.map(t => ({ t, v: Math.min(0, -series.reduce((sum, s) => sum + (this._valueAt(s.points, t) ?? 0), 0)) })), color: spec.color, name: spec.name };
            series.push(home);
        }
        this._chartLive = { specs, series, start, home, past };
        if (this._showPowerChart()) this._chartStatus();
        else this._text('chartStatus', `No recorded power history ${past ? 'that day' : 'today'}`);
    }
    // The power metrics chart: the day's recorded series, then, today, the forecast for the rest of the day.
    _showPowerChart() {
        const live = this._chartLive;
        if (!live) return false;
        const forecast = live.past ? null : this._chartForecast;
        this._showChart(this._id('chart'), [...live.series, ...(forecast?.series ?? [])], live.start, true);
        this._id('legendForecast').hidden = !forecast;
        return live.series.some(s => s.points.length > 1);
    }
    _chartStatus() {
        const past = this._chartLive?.past;
        if (past) return this._text('chartStatus', past.hourly ? 'Hourly averages' : 'Midnight → midnight');
        const source = this._chartForecast?.source;
        this._text('chartStatus', `Midnight → now${source ? ` · forecast from ${source}` : ''}`);
    }
    // Forecast for the rest of today, drawn dashed as in Sigenergy's app. Solar comes from Home Assistant's solar forecast
    // (Forecast.Solar, Open-Meteo, Solcast… as set up in the Energy dashboard) when there is one; otherwise, like the
    // home's load, from its average at each time of day over the last 7 days of recorder statistics.
    async _loadForecast() {
        this._forecastAt = Date.now();
        const request = this._forecastRequest = (this._forecastRequest ?? 0) + 1;
        if (typeof this._hass?.callWS !== 'function') {
            this._chartForecast = this._solarHours = this._solarSlots = null;
            return;
        }
        const zone = this._zone, now = Date.now(), today = zoneMidnight(now, zone), day = zoneParts(today, zone);
        const end = zoneDate(zone, day.y, day.m, day.d + 1).getTime();
        // Today's solar forecast, in kWh for each hour from its start, which the Solar forecast tile also reads.
        // The days after it, in kWh for each day, for the energy metrics' forecast. Each entry of the forecast is
        // counted in the hour it starts in: Solcast gives half hours, Forecast.Solar hours plus the part from sunrise.
        const hours = new Map(), days = new Map(), slots = new Map();
        try {
            const forecasts = await this._hass.callWS({ type: 'energy/solar_forecast' });
            for (const forecast of Object.values(forecasts ?? {}))
                for (const [key, wh] of Object.entries(forecast?.wh_hours ?? {})) {
                    const t = Date.parse(key);
                    if (!Number.isFinite(Number(wh)) || t < today.getTime()) continue;
                    if (t >= end) { const d = zoneMidnight(t, zone).getTime(); days.set(d, (days.get(d) ?? 0) + Number(wh) / 1000); continue; }
                    const p = zoneParts(t, zone), hour = zoneDate(zone, p.y, p.m, p.d, p.h).getTime();
                    hours.set(hour, (hours.get(hour) ?? 0) + Number(wh) / 1000);
                    slots.set(t, (slots.get(t) ?? 0) + Number(wh) / 1000);
                }
        } catch (e) {
            // No solar forecast in Home Assistant: the history average stands in.
        }
        // Today's history of the forecast for the current hour, for the Solar forecast tile's forecast up to now.
        let recorded = null;
        const hourId = this._forecastEntity('energy_current_hour');
        if (hourId && typeof this._hass.callApi === 'function') {
            try {
                const [points] = this._series((await this._history([hourId], today)).data, [hourId]);
                if (points.length) recorded = { id: hourId, points, factor: this._factor(hourId) };
            } catch (e) {
                // No recorder history: Home Assistant's solar forecast stands in.
            }
        }
        if (request !== this._forecastRequest) return;
        this._solarHours = hours.size ? hours : null;
        this._solarSlots = slots.size ? [...slots].sort((a, b) => a[0] - b[0]) : null;
        this._forecastRecorded = recorded;
        this._updateForecastTile();
        if (!this.config.show_forecast || !this._shown.has('metrics')) {
            this._chartForecast = this._energyForecast = null;
            return;
        }
        const spec = key => ({ ...CHART_SERIES.find(s => s.key === key), id: this._ent(key) });
        const specs = ['pv_power', 'home_power'].map(spec).filter(spec => this._has(spec.id));
        // Without a home entity, the home's forecast is the balance of the other flows' averages.
        const parts = this._homeFromBalance() ? ['pv_power', 'grid_import_power', 'grid_export_power', 'battery_power', 'ac_charger_power', 'dc_charger_power'].map(spec).filter(spec => this._has(spec.id)) : [];
        // Today's points from now on, starting with the value at now so the line joins the recorded one.
        const ahead = points => {
            const at = this._valueAt(points, now), rest = points.filter(p => p.t > now && p.t <= end);
            return at === null ? rest : [{ t: now, v: at }, ...rest];
        };
        // Each hour's energy (Wh) is its average power, placed at the middle of the hour. Before the forecast's first
        // hour and after its last it is night: nothing. An hour missing between them is missing from the forecast: the
        // line breaks across it.
        let solar = null;
        const breaks = [];
        if (hours.size) {
            solar = [];
            const known = [...hours.keys()].filter(t => t >= today.getTime() && t < end), first = Math.min(...known), last = Math.max(...known);
            let missing = false;
            for (let h = 0, t = today.getTime(); t < end; t = zoneDate(zone, day.y, day.m, day.d, ++h).getTime()) {
                if (!hours.has(t) && t > first && t < last) { missing = true; continue; }
                if (missing) breaks.push({ start: solar[solar.length - 1].t, end: t + 1800e3 });
                missing = false;
                solar.push({ t: t + 1800e3, v: hours.get(t) ?? 0 });
            }
        }
        let history = {}, slot = 300e3;
        const ids = [...new Set([...specs.map(spec => spec.id).filter((id, i) => !(solar && specs[i].key === 'pv_power')), ...parts.map(spec => spec.id)])];
        if (ids.length) {
            const from = zoneDate(zone, day.y, day.m, day.d - 7);
            const fetch = period => this._statistics(ids, from, today, period, ['mean']).catch(() => ({}));
            history = await fetch('5minute');
            // Five-minute statistics are kept 10 days by default; hourly ones are kept for good.
            if (!ids.some(id => history[id]?.length)) { history = await fetch('hour'); slot = 3600e3; }
        }
        if (request !== this._forecastRequest) return;
        // The average at each time of day, over the days that have data, placed at the middle of each slot.
        const profile = spec => {
            const slots = new Map(), k = this._chartFactor(spec);
            for (const row of history[spec.id] ?? []) {
                const v = Number(row.mean);
                if (!Number.isFinite(v)) continue;
                const p = zoneParts(typeof row.start === 'number' ? row.start : Date.parse(row.start), zone), minute = p.h * 60 + p.min;
                const sum = slots.get(minute) ?? [0, 0];
                sum[0] += v * k;
                sum[1]++;
                slots.set(minute, sum);
            }
            return [...slots].sort((a, b) => a[0] - b[0])
                .map(([minute, [total, count]]) => ({ t: zoneDate(zone, day.y, day.m, day.d, Math.floor(minute / 60)).getTime() + (minute % 60) * 60e3 + slot / 2, v: total / count }));
        };
        let series = specs.map(spec => {
            const forecast = spec.key === 'pv_power' && solar;
            const points = ahead(forecast ? solar.map(p => ({ t: p.t, v: p.v * (spec.negate ? -1 : 1) })) : profile(spec));
            return { points, color: spec.color, name: spec.name, forecast: true, ...(forecast && breaks.length ? { breaks } : {}) };
        });
        let homeDay = specs.some(spec => spec.key === 'home_power') ? profile(spec('home_power')) : [];
        if (parts.length) {
            const slots = new Map();
            for (const part of parts) for (const p of profile(part)) slots.set(p.t, (slots.get(p.t) ?? 0) + p.v);
            const home = CHART_SERIES.find(s => s.key === 'home_power');
            homeDay = [...slots].sort((a, b) => a[0] - b[0]).map(([t, v]) => ({ t, v: Math.min(0, -v) }));
            series.push({ points: ahead(homeDay), color: home.color, name: home.name, forecast: true });
        }
        series = series.filter(s => s.points.length > 1);
        this._chartForecast = series.length ? { series, source: solar ? 'the solar forecast and the last 7 days' : 'the last 7 days' } : null;
        // The energy metrics' forecast, in kWh: the solar and home's for the rest of today, from the lines above, then
        // the solar forecast's later days, each with the home's average day.
        const energy = ({ points, breaks }) => points.reduce((sum, p, i) => !i || breaks?.some(b => points[i - 1].t < b.end && p.t > b.start) ? sum
            : sum + Math.abs(p.v + points[i - 1].v) / 2 * (p.t - points[i - 1].t) / 3600e3, 0);
        const rest = name => { const found = series.find(s => s.name === name); return found ? energy(found) : null; };
        this._energyForecast = { today: [rest('Solar'), rest('Home')], days, load: homeDay.length ? homeDay.reduce((sum, p) => sum + Math.abs(p.v), 0) * slot / 3600e3 : null };
        if (this._showPowerChart()) this._chartStatus();
        const view = this._view();
        if (view.range !== 'Day' && view.current && this._shown.has('metrics')) this._loadBars();
    }
    _chartFactor(spec) {
        return this._factor(spec.id) * (spec.negate ? -1 : 1) * (spec.key === 'battery_power' ? this._batterySign() : 1);
    }
    // Extends the drawn series with the current sensor values and redraws just the chart.
    _advanceChart() {
        const live = this._chartLive;
        if (!live || live.past || !this._hass) return;
        const t = Date.now();
        live.specs.forEach((spec, i) => {
            const v = this._num(spec.id);
            if (v !== null) live.series[i].points.push({ t, v: v * this._chartFactor(spec) });
        });
        const home = live.home && this._homePower();
        if (home !== null && home !== undefined && live.home) live.home.points.push({ t, v: -home });
        this._id('chart')._redraw?.();
    }
    // Draws now and again whenever the chart is resized; returns whether any series has data.
    _showChart(svg, series, start, signed, top, window) {
        svg._redraw = () => this._plot(svg, series, start, signed, top, window);
        svg._redraw();
        return series.some(s => s.points.length > 1);
    }
    // As in Sigenergy's app, the time axis spans the whole day, midnight to midnight in Home Assistant's time zone (23 or
    // 25 hours when the clocks change), and the lines run from midnight to now. A [window] ends at [window.end] instead,
    // with [window.fit] fitting the value axis to the data rather than starting it at 0.
    _plot(svg, series, start, signed, top, window) {
        const now = Date.now(), day = zoneParts(start, this._zone), hour = h => zoneDate(this._zone, day.y, day.m, day.d, h).getTime();
        const end = window?.end ?? hour(24);
        const width = Math.max(240, svg.clientWidth || 900), height = 170;
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.replaceChildren();
        const ns = 'http://www.w3.org/2000/svg';
        const add = (tag, attrs, text) => {
            const el = document.createElementNS(ns, tag);
            for (const [k, v] of Object.entries(attrs))
                el.setAttribute(k, v);
            if (text !== undefined)
                el.textContent = text;
            svg.append(el);
            return el;
        };
        const values = series.filter(s => !s.tipOnly).flatMap(s => s.points.map(p => Math.abs(p.v)));
        // A signed chart's limit is rounded up to a half, whole, 5, 10, 50… kW, as in Sigenergy's app, so the labels are exact.
        const peak = Math.max(1, ...values), step = 10 ** Math.floor(Math.log10(peak)) / 2;
        let max = top ?? (signed ? Math.ceil(peak / step - 1e-9) * step : Math.max(1, Math.ceil(Math.max(0, ...values))));
        let low = 0, places = null;
        if (window?.fit && values.length) {
            // Three labels a 1, 2, 2.5 or 5 × 10ⁿ step apart, spanning the data.
            const all = series.filter(s => !s.tipOnly).flatMap(s => s.points.map(p => p.v)), least = Math.min(...all), most = Math.max(...all);
            const nice = v => { const e = 10 ** Math.floor(Math.log10(v)); return [1, 2, 2.5, 5, 10].map(m => m * e).find(m => m >= v * (1 - 1e-9)); };
            let gap = nice(Math.max(most - least, Math.abs(most) * .02, 1e-3) * .6);
            while (Math.floor(least / gap) * gap + 2 * gap < most) gap = nice(gap * 1.01);
            low = Math.floor(least / gap) * gap;
            max = low + 2 * gap;
            places = [gap, low].reduce((d, v) => { while (d < 4 && Math.abs(Math.round(v * 10 ** d) - v * 10 ** d) > 1e-6) d++; return d; }, 0);
        }
        const left = 38, right = width - 12;
        const x = t => left + (right - left) * (t - start) / Math.max(1, end - start);
        const y = signed ? v => 78 - 65 * v / max : v => 143 - 130 * (v - low) / (max - low);
        for (const v of signed ? [-max, 0, max] : [low, (low + max) / 2, max]) {
            add('line', { x1: left, y1: y(v), x2: right, y2: y(v), stroke: 'var(--grid)', 'stroke-dasharray': '3 5' });
            add('text', { x: 2, y: y(v) + 4, fill: 'var(--axis)', 'font-size': 10 }, v.toFixed(places ?? (max < 10 && v % 1 ? 1 : 0)));
        }
        const time = h => add('text', { x: x(hour(h)), y: 162, fill: 'var(--axis)', 'font-size': 10, 'text-anchor': 'middle' }, `${String(zoneParts(hour(h), this._zone).h).padStart(2, '0')}:00`);
        // A window is labelled at every fourth hour of the clock within it.
        if (window) for (let h = 0; h < 72 && hour(h) <= end; h++) { if (hour(h) >= start && zoneParts(hour(h), this._zone).h % 4 === 0) time(h); }
        else for (let h = 0; h < 24; h += 4) time(h);
        // The power metrics' gaps in the recording: a shaded band with a mark, the lines broken across it.
        const gaps = svg === this._id('chart') && this._chartLive ? this._gapsIn(start, end) : [];
        for (const g of gaps) {
            const a = x(Math.max(start, g.start)), b = x(Math.min(end, g.end));
            add('rect', { x: a, y: y(max), width: Math.max(1, b - a), height: (signed ? y(-max) : y(low)) - y(max), fill: 'var(--grid)', opacity: .35 });
            add('text', { x: (a + b) / 2, y: y(max) + 12, fill: '#e0a030', 'font-size': 11, 'text-anchor': 'middle' }, '⚠');
        }
        // A series' own breaks (hours its data leaves out) break its line too.
        for (const { points, color, forecast, tipOnly, breaks = [] } of series) {
            if (points.length < 2 || tipOnly)
                continue;
            const d = points.map((p, j) => `${j && ![...gaps, ...breaks].some(g => points[j - 1].t < g.end && p.t > g.start) ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
            add('path', { d, fill: 'none', stroke: color, 'stroke-width': forecast ? 1.4 : 1.7, 'stroke-linejoin': 'round', ...(forecast ? { 'stroke-dasharray': '5 4' } : {}) });
        }
        const cursor = add('g', { display: 'none' });
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('stroke', 'var(--cursor)');
        line.setAttribute('stroke-dasharray', '2 3');
        cursor.append(line);
        const dots = series.map(({ color }) => {
            const dot = document.createElementNS(ns, 'circle');
            dot.setAttribute('r', 3.5);
            dot.setAttribute('fill', color);
            dot.setAttribute('stroke', 'var(--dot-edge)');
            dot.setAttribute('stroke-width', 1.5);
            cursor.append(dot);
            return dot;
        });
        svg._chart = { series, start, end, now, width, left, right, x, y, top: y(max), bottom: y(signed ? -max : low), cursor, line, dots, gaps };
        if (svg._lastHover !== undefined) this._hoverAt(svg, svg._tip, svg._lastHover);
    }
    // Linear interpolation between recorded states, matching the drawn line.
    _valueAt(points, t) {
        if (!points.length || t < points[0].t) return null;
        let lo = 0, hi = points.length - 1;
        if (t >= points[hi].t) return points[hi].v;
        while (hi - lo > 1) {
            const mid = (lo + hi) >> 1;
            if (points[mid].t <= t) lo = mid; else hi = mid;
        }
        const a = points[lo], b = points[hi];
        return a.v + (b.v - a.v) * (t - a.t) / Math.max(1, b.t - a.t);
    }
    _hoverChart(svg, tip, e) {
        const chart = svg._chart;
        if (!chart) return;
        const rect = svg.getBoundingClientRect();
        const ux = (e.clientX - rect.left) * chart.width / rect.width;
        if (ux < chart.left || ux > chart.right) return this._hideHover(svg, tip);
        svg._tip = tip;
        if (chart.bars) {
            svg._lastHover = Math.min(chart.slots.length - 1, Math.floor((ux - chart.left) / chart.slotWidth));
            return this._hoverBar(svg, tip, svg._lastHover);
        }
        // Past now the forecast is read; without one the readings stay at now.
        const t = chart.start + (ux - chart.left) / (chart.right - chart.left) * (chart.end - chart.start);
        svg._lastHover = chart.series.some(s => s.forecast) ? t : Math.min(chart.now, t);
        this._hoverAt(svg, tip, svg._lastHover);
    }
    _hoverAt(svg, tip, t) {
        const chart = svg._chart;
        const px = chart.x(t);
        chart.line.setAttribute('x1', px);
        chart.line.setAttribute('x2', px);
        chart.line.setAttribute('y1', chart.top);
        chart.line.setAttribute('y2', chart.bottom);
        // Up to now the recorded series are read, after it the forecast ones.
        const rows = new Map(), ahead = t > chart.now;
        chart.series.forEach((s, i) => {
            const v = !!s.forecast === ahead && !s.breaks?.some(b => b.start < t && t < b.end) ? this._valueAt(s.points, t) : null;
            chart.dots[i].setAttribute('display', v === null || s.tipOnly ? 'none' : 'inline');
            if (v === null) return;
            chart.dots[i].setAttribute('cx', px);
            chart.dots[i].setAttribute('cy', chart.y(v));
            const row = rows.get(s.name) ?? { ...s, v: 0 };
            row.v += v;
            rows.set(s.name, row);
        });
        chart.cursor.setAttribute('display', 'inline');
        const time = new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: this._zone });
        // Series names can be PV string names from the card config, so the rows are built as text, not HTML.
        const lines = [...rows.values()].map(r => {
            const note = r.note?.(r.v);
            const line = document.createElement('div');
            const dot = Object.assign(document.createElement('i'), { className: 'dot' });
            dot.style.background = r.color;
            line.append(dot, String(r.name));
            if (note) line.append(' ', Object.assign(document.createElement('em'), { textContent: note }));
            const value = r.digits !== undefined ? `${r.v.toFixed(r.digits)}${r.unit ? `${r.unit === '%' ? '' : ' '}${r.unit}` : ''}` : r.unit ? `${Math.abs(r.v).toFixed(2)} ${r.unit}` : formatPower(r.v);
            line.append(Object.assign(document.createElement('span'), { textContent: value }));
            return line;
        });
        // In a gap in the recording there are no readings to show.
        const gap = chart.gaps?.filter(g => g.start <= t && t < g.end) ?? [];
        if (gap.length) {
            lines.splice(0, lines.length, Object.assign(document.createElement('div'), { className: 'gaptip', textContent: `⚠ No data recorded: ${this._gapText(gap)}` }));
            chart.dots.forEach(dot => dot.setAttribute('display', 'none'));
        }
        tip.replaceChildren(Object.assign(document.createElement('b'), { textContent: ahead ? `${time} · forecast` : time }), ...(lines.length ? lines : [Object.assign(document.createElement('em'), { textContent: 'No data' })]));
        tip.hidden = false;
        const scale = svg.getBoundingClientRect().width / chart.width;
        const cssX = px * scale;
        const fitsRight = cssX + 14 + tip.offsetWidth <= svg.clientWidth;
        tip.style.left = `${fitsRight ? cssX + 14 : Math.max(0, cssX - 14 - tip.offsetWidth)}px`;
        this._placeTip(tip);
    }
    // A tip taller than the room left below the chart moves up, so the card's edge doesn't cut it.
    _placeTip(tip) {
        tip.style.top = '';
        const card = tip.closest('ha-card, .dlg')?.getBoundingClientRect(), box = tip.getBoundingClientRect();
        if (!card) return;
        const over = box.bottom - (card.bottom - 8);
        if (over > 0) tip.style.top = `${box.top - tip.offsetParent.getBoundingClientRect().top - Math.min(over, box.top - card.top - 8)}px`;
    }
    _hideHover(svg, tip) {
        svg._lastHover = undefined;
        tip.hidden = true;
        if (svg._chart) svg._chart.cursor.setAttribute('display', 'none');
    }
}
// BEGIN ARTWORK (generated by tools/embed-artwork.py)
const ARTWORK = {
    'house_day.png': { size: [1676, 873], href: 'data:image/avif;base64,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' },
    'house_night.png': { size: [1676, 873], href: 'data:image/avif;base64,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' },
    'charger_day.png': { size: [22.41, 77.35], at: [446.88, 288.33], href: 'data:image/avif;base64,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' },
    'charger_night.png': { size: [22.30, 78.75], at: [445.77, 287.84], href: 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAAGGbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAOcGl0bQAAAAAAAQAAACxpbG9jAAAAAEQAAAIAAQAAAAEAAATcAAAH1gACAAAAAQAAAa4AAAMuAAAAQmlpbmYAAAAAAAIAAAAaaW5mZQIAAAAAAQAAYXYwMUNvbG9yAAAAABppbmZlAgAAAAACAABhdjAxQWxwaGEAAAAAGmlyZWYAAAAAAAAADmF1eGwAAgABAAEAAADDaXBycAAAAJ1pcGNvAAAAFGlzcGUAAAAAAAAALQAAAJ0AAAAQcGl4aQAAAAADCAgIAAAADGF2MUOBAAwAAAAAE2NvbHJuY2x4AAEADQAGgAAAAA5waXhpAAAAAAEIAAAADGF2MUOBABwAAAAAOGF1eEMAAAAAdXJuOm1wZWc6bXBlZ0I6Y2ljcDpzeXN0ZW1zOmF1eGlsaWFyeTphbHBoYQAAAAAeaXBtYQAAAAAAAAACAAEEAQKDBAACBAEFhgcAAAsMbWRhdBIACgYYFeycZVAyoQYRoAJYiN1T5umpBJ3wR2DLJBEziy4iVHnUsSGWyVSTmWIBpdD/Av1+6EBsQxsUdZWBK0P/C1uZuQDvlSYa6EY5I/xmTgHIh/WBQR5W6l9QbdcN+GNt1Sm0lVk7dPIcME78DfVho0F8wny+iamrHJCmpPp/umAByy4spxBuecxr1pPNiLMkmxE/KpTUC52Y4vSxOifc3xbwy/kHEH5aE+mia4X13YER6l669rCpFBc4te66VuvuilHR7RaUttjuaka3yfHa65K5YaOSwzw0HPW49Me2l+WmKFO5FL4vA4dQWLOyHDFh5WvfF0so2YNzBSoQudIRl6gmbfOZ2NbXg4BBwhjnym9HLuiuzgvXfa7ZcpzfwO4fSIFI6AaphUwWDuds/qRRs28J9jCXGh+CVLG4R29CFAMNAA2R9IzaA1hp62jonb0a7ZgjhmfHXDdyQYILdAQjcO9wkvoJnZEOkoZDvY9NT+iHr9rVmZoLr38wNcJZvr/5Tt5H/R6BKy/SSAloeE7IksmNRyTmZuijfHdnMYIbDFdoWs+y4OrZWkmzlK/7He+X6iziiJVvzmKyGi4B5w1x7gdlL6C+HRt41SQreEyXAn+Uz8iRWFWZ3+7lEVWPpgUfu0m84SgBy9+FRHgkKDblgVHHGmaZPpqw0cyP/tbRGSEX1hw5zCc+f9bX5QhZcB2Gk6+YE63NZ9PT5qGMYoiU1II7hwCrKnDUFRGl8qJ4laTZ77vLdNsDmZNPewlaLhN3E9hJJmxSl3VYpUe1MjPCy1tClzXe1H9zbjkCxbBO+fCnWy1bPEaQa+RwD+W0Id4lUyC0B54adPGc575Mm8HdCTJpNDavTf35SRhdzleuNEhhzy86r5/A6FLOycDF8uls+KrbUIHb/ofe96NCv1dphLXZw/tICRH4mjF9LhSmsI3xe+RGSr2x7ZyYc4+xcVU4gvFYxFMogo1d7vX5JWeZOZXkafoxK0YzGgo2hf6OY962jf6gMaZlnQydnUDdt5Bu7nKiyOrNuzAbFXX3rGsOqSWLFhl3kKFgmP6vsXCoJZVv0tZ5qmob6zncBIASAAoGGBXsnGRCMskPEaABihBCAt1JSe3iwqB1bFN8qSPoj7OE/l/NvYiqzvpIP+rQTB+8H4M5zdsUGnNoZUiPyNR3rk+TdrOyu3gHrrW87igbuxt+ZxfJ1tJGKYVwUlHMbuZPNIAAXr1wVWX1FREJGFM+oDXmaDcEkJujKcOcPdLQA138uIwStuDvJLF6UDRr/bG+yaB4ILtK5RybCOPyt7C6ZrzhFgRMT0eAU73VliGD+1CobFHtbwX+w23kPHcZQABQ6cBZOe5lykhX4rBLqUVvXkBkFNGdyBuBYxxHF+Iwp9S+p0CnvAOmCvD6AO36NmNTtIvN0Cn+BVa3kywIZ7VSIHVljnVWej6VHcXXy1DqMvXKJU1BIrMmULr8QCPowZqtHfGtDhO5rSGKvh4vf6ffH0Bu/zkC90Lhbt9++p1Vo0X9wPevgNkMaOv9itJrF29ofgvwLNCQugQQ0FGa9NjrBD9uhNVNKtfZQklwIDvFEQRKFcJRX8xv5l3czKx1ruOBDJvJDzy8Q6CuEqZYRQ+1/1FG2sJrvGZoAMKKWqybiueB4uSCMZVLa/5QFQ5bUFLIVHjB6lR1IuwPS8dju9mNON9QsfsqvKHSqRy2S5BAlYPYbdhZ+mZR3IEwQk8x73lXGnmk7D1fLat3uCfNmNW2uVP4QMsy39GUqVomzJabaVFVx5oWioU6rgG1tUJYwKJ0xbVPEPspXtSqR6qHdY1ucRnw8q5Y16I8cJBtoCF5pVYmYmqn3RGd8Vmpl0dE4rESmXMfft1G0WPx5DZ2Avh6OHZPhD/PMtNcNRtUIkMWcEFmdd/iG/XmxeSjEkcH2z00D888tZrAl4CdeyvlA8x28isaOEpvG9lylmOssMjBYUfDyWLlkblzeJ7hxgvWOeDs6dCc3bPwHC7zEGDz0Bw1IiJBDA/dQRu1ABzoPrVjFY77l8AsKYfS6qYLErBLKToxY7qeNDSFVvyrJrBig3e+6VLG3JJVPamoC/DbIHWChGAm+Qixj1Z4dCSW/m7DAO9cQPvAu0ljZbdpTDw2p5To/VlhckfU4GGRfz1+IX9ttt13H7J+UUK2S1N4p+n6sp5ET+BMD64Jr3j8Rd0+z0VoM3XPj8eDRWFOGy7Cve435xJR+cIil234tZ3Y/jMX3XEMd63rDgKPNzv7zqexal8RSZ7VofzzTs9P3uJIvpX86EHhx91Hr25q6Xb3FXyzvzFfqmwHB7+QvBBKRtfJlLbws4zo+OViZdwSSLLlu9GFlPE1M5w/+trW5dRqgaKID7vwuqzkAWtS9LN0mhI9qcJHkeRtQhC4j1pshiaAlWriatGqRNXU98ZTzkPPRtuVo2B3cUBB/NsyphuNKuiGokxqdipb6Z6PwCf/XpdK+6IHWyWidrtwC5euJrS6O1A0dQxQmZHWqKcHUeE5g2NWZcaUYiaGHmy+8YEbtr2VCCczIRLNWZ5/3KCspqvRAhXxrFe4hs50U5gstSZZ2ovpz7VaY70RjZndF+Udkax8R3rPPQJUgLT+qUbA7kPn41KH2AJ/RgHfxLeUhgYBtspwCYnKD5EiFJhp3EMpSO9G9USTTVNO2TAIBG4MRwBjNRNgiYqUXPrVLdrf5TRNqRMN8jQxgccZYrcAvNo16IZi3VMtdL1RPwbZ6/5XlJ9blT5UHUBP4NiLy4ZMAZyx5w0nt7YXAyxrCozrNBW1y3C12sIge5gWYf+gfxXj+efn4DYRGAi+hFZF6GyUjgAKoh6aveIfRWJiq7pIGd/iY9e4ofLpl9HyXKtv9lugqEp5r4lEnboss9xNdY4WhksAdQHhxj7Lf0Z5BtRotfnYLeQLP/ZmHpO90Aht19oZmimLVowtWuYh89rur5cnLWNgc/bYtPnMM9BMxC6BFD4dLQAYEbclEvdrG+2knKpJcbhICc8kQl3FKWFZEHcFlXOodmVXrOrYrCdmpDB5vqHVBlvPBac7NqWdyEUDjz8x/ZggVQFOF5N03wGxsv16pep76vuSJ8Jb6rz9pLODTQ5JdhHWix+e5NSn1wJWSVOZDs5vGV/W4sf8KypWYoIzVHcbXeY4ZGdBA2wHjontEOYuAsul1Y7LUoZTQB5ZcGkduJc/sdM/NA8ZeuAy4h6mqIJlfdW9XU78N3T35RWuPFFIZ2iPa17U5MiOPJciRERoNAY5CsB6pQkRiDoI7Pq9MGGoAFtdSuostVz69ig3Mu7LFFixqcu3yYn7omuNR7xideFRqBvg1AfTJyw4inLxoKv6r3EZMiNbvywMRTY6Tw4Rfw/upE1ioYEvex3wQlNlA4dGuDqAjXSHZ4IKVXtiXo4JkgUpM+SZgOnPsfTmYn9M48VeyZhCIAVsfzpJ8SYNlAFZIGaytLbxJPKzFIG0jEPKKhZ5hVy9SU3V5b7CojC3r1Aj3ApKubRXGAbXvGyBBiGu8pIIDl4C8PTzS+RCt9Ior/ZDtlgeBpoMlETW3tQQy6ug6j95BvXTKMIpYehYScB7BE4GmN8+UnbDvSnh2pSPmtcerNA0rYcREc5xsAZuqZhIcUG0KvRCw5l8e0TZgAFE4Es73Zw6BPdCrYlNg6xCM2SPUar/zDOlUCcQVrrvbOyOrQHtx7bYgE8NL6J+vN45HaReAyPPkrlvxq4L6j/mdmoL15dBh1yjloMmI6lmqAP0g+QSHIL52A==' },
    'garage_day.png': { size: [189, 182], at: [437, 246], href: 'data:image/avif;base64,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' },
    'garage_night.png': { size: [182, 168], at: [433, 245], href: 'data:image/avif;base64,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' },
};
// END ARTWORK
if (!customElements.get('sigenergy-flow-card'))
    customElements.define('sigenergy-flow-card', SigenergyFlowCard);
window.customCards = window.customCards || [];
window.customCards.push({
    type: 'sigenergy-flow-card',
    name: 'Sigenergy Flow Card',
    description: 'Animated Sigenergy power-flow dashboard'
});
// Each part of the card as a card of its own: [tag, part, name, description, size, defaults].
const SOLO_CARDS = [
    ['sigenergy-flow-scene', 'scene', 'Sigenergy Flow: House', 'The house with its live power flows', 7, {}],
    ['sigenergy-flow-battery', 'battery', 'Sigenergy Flow: Battery level', 'The battery level and stored energy', 2, { title: 'Battery level', name: '' }],
    ['sigenergy-flow-statistics', 'tiles', 'Sigenergy Flow: Energy statistics', 'Energy totals for a day, the last 7 days, a week, month, year or lifetime', 4, { title: 'Energy statistics', name: '' }],
    ['sigenergy-flow-metrics', 'metrics', 'Sigenergy Flow: Power metrics', 'Power over a day, or energy bars over a longer period', 5, { title: '', name: '' }],
    ['sigenergy-flow-sankey', 'sankey', 'Sigenergy Flow: Energy flows', 'Where the energy came from and went over a period', 7, { title: 'Energy statistics', name: '' }],
];
for (const [tag, part, name, description, size, defaults] of SOLO_CARDS) {
    if (!customElements.get(tag))
        customElements.define(tag, class extends SigenergyFlowCard {
            static tag = tag;
            static parts = [part];
            static defaults = defaults;
            static size = size;
        });
    window.customCards.push({ type: tag, name, description });
}
