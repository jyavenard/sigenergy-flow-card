#!/usr/bin/env node
// Regenerates the README screenshots (docs/screenshots/) from one simulated day, 19 October 2026 at 2:30 pm in
// Sydney, so the tiles, charts, PV strings and Energy statistics agree with one another.
//
//     node tools/screenshots.js [card.js] [output directory]
//
// It renders with WebKit, Safari's engine, through Playwright: playwright-core is found through $PLAYWRIGHT_CORE (the
// package's directory) or the usual module search, and the browser through $WEBKIT or Playwright's own install, e.g.:
//
//     npm install --prefix /tmp/sigpw playwright-core && npx --prefix /tmp/sigpw playwright-core install webkit
//     PLAYWRIGHT_CORE=/tmp/sigpw/node_modules/playwright-core node tools/screenshots.js
const path = require('path');
const { webkit } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const ROOT = path.resolve(__dirname, '..');
const card = path.resolve(process.argv[2] || path.join(ROOT, 'sigenergy-flow-card.js'));
const out = path.resolve(process.argv[3] || path.join(ROOT, 'docs', 'screenshots'));
const NOW = Date.parse('2026-10-19T14:30:00+11:00'), MIDNIGHT = Date.parse('2026-10-19T00:00:00+11:00');

// ---- One day of power, in kW, every 5 minutes from midnight to now ----
const bell = h => Math.max(0, Math.sin(Math.PI * (h - 6.9) / 12)) ** 1.2;
const STRINGS = [ // name, live kW, offset (h), voltage, current, lifetime kWh
    ['NE', 3.12, -.6, 338.4, 9.23, 4021.5], ['NW', 4.12, .4, 361.2, 11.40, 4630.2],
    ['S', 3.44, 0, 349.7, 9.83, 3988.9], ['W', 2.88, 1.2, 302.6, 9.51, 3067.2]];
const amp = STRINGS.map(([, kw, off]) => kw / bell(14.5 - off));
const stringKw = (i, h) => amp[i] * bell(h - STRINGS[i][2]);
const LOADS = [ // entity, name, kW, on from and until (h)
    ['sensor.pool_heat_pump_power', 'Pool Heat Pump', 1.83, 11, 17], ['sensor.pool_pump_power', 'Pool Pump', .75, 10, 16],
    ['sensor.air_conditioning_power', 'Air Conditioning', .344, 12, 22], ['sensor.data_centre_power', 'Data Centre', .259, 0, 24],
    ['sensor.kitchen_fridge_power', 'Kitchen Fridge', .12, 0, 24]];
const OTHER = .42;
// The loads above, plus breakfast and dinner cooking.
const homeKw = h => OTHER + LOADS.reduce((a, [, , kw, from, to]) => a + (h >= from && h < to ? kw : 0), 0) + (h >= 6.2 && h < 7.6 ? 1.4 : 0) + (h >= 18 && h < 20 ? 1.6 : 0);
const acKw = h => h >= 12.8 ? 7.2 : 0;
const at = h => {
    const pv = STRINGS.reduce((a, _, i) => a + stringKw(i, h), 0), home = homeKw(h), ac = acKw(h);
    const surplus = pv - home - ac;
    let charge = 0, discharge = 0, imp = 0, exp = 0;
    if (surplus >= 0) { charge = Math.min(surplus, 2.5); exp = surplus - charge; }
    else if (h < 5.5) discharge = -surplus;
    else imp = -surplus;
    return { pv, home, ac, charge, discharge, imp, exp, bat: charge - discharge };
};
const STEP = 5 / 60, hours = [];
for (let h = 0; h <= 14.5 + 1e-9; h += STEP) hours.push(+h.toFixed(4));
const samples = hours.map(h => ({ h, t: MIDNIGHT + h * 3600e3, ...at(h) }));
const live = at(14.5);
// Energy per 5-minute interval, from the power at its middle.
const intervals = hours.slice(0, -1).map(h => ({ t: MIDNIGHT + h * 3600e3, ...at(h + STEP / 2) }));
const sum = key => intervals.reduce((a, r) => a + +(r[key] * STEP).toFixed(4), 0);
const stringDaily = STRINGS.map((_, i) => hours.slice(0, -1).reduce((a, h) => a + stringKw(i, h + STEP / 2) * STEP, 0));
const CAP = 40.3, SOC = 64;
const stored = [];
{ let e = CAP * SOC / 100; for (let i = samples.length - 1; i >= 0; i--) { stored[i] = e; if (i) e -= (intervals[i - 1].charge - intervals[i - 1].discharge) * STEP; } }

const kw = v => ({ state: v.toFixed(3), attributes: { unit_of_measurement: 'kW' } });
const kwh = v => ({ state: v.toFixed(2), attributes: { unit_of_measurement: 'kWh', state_class: 'total_increasing' } });
const states = {
    'sensor.sigen_plant_pv_power': kw(live.pv), 'sensor.sigen_plant_sigen_pv_power': kw(live.pv),
    'sensor.sigen_plant_consumed_power': kw(live.home), 'sensor.sigen_plant_battery_power': kw(live.bat),
    'sensor.sigen_plant_battery_state_of_charge': { state: String(SOC), attributes: { unit_of_measurement: '%' } },
    'sensor.sigen_plant_rated_energy_capacity': { state: String(CAP), attributes: { unit_of_measurement: 'kWh' } },
    'sensor.sigen_plant_grid_import_power': kw(live.imp), 'sensor.sigen_plant_grid_export_power': kw(live.exp),
    'sensor.sigen_ac_charger_charging_power': kw(live.ac), 'sensor.sigen_ac_charger_system_state': { state: 'Charging', attributes: {} },
    'sensor.car_soc': { state: '64', attributes: { unit_of_measurement: '%' } }, 'sensor.car_range': { state: '301', attributes: { unit_of_measurement: 'km' } },
    'sensor.sigen_inverter_dc_charger_output_power': kw(0),
    'sensor.sigen_plant_daily_pv_energy': kwh(sum('pv')), 'sensor.sigen_plant_daily_grid_import_energy': kwh(sum('imp')),
    'sensor.sigen_plant_daily_grid_export_energy': kwh(sum('exp')), 'sensor.sigen_plant_daily_battery_charge_energy': kwh(sum('charge')),
    'sensor.sigen_plant_daily_battery_discharge_energy': kwh(sum('discharge')),
    'sensor.sigen_plant_total_pv_generation': kwh(STRINGS.reduce((a, s) => a + s[5], 0)),
    'sensor.sigen_plant_total_charged_energy_of_the_ess': kwh(5120.4), 'sensor.sigen_plant_total_discharged_energy_of_the_ess': kwh(4630.9),
    'sensor.sigen_plant_total_imported_energy': kwh(2210.7), 'sensor.sigen_plant_total_exported_energy': kwh(6930.2),
    'sensor.sigen_plant_total_charged_energy_of_the_evac': kwh(3911.0),
    'weather.forecast_home': { state: 'partlycloudy', attributes: { temperature: 24.3, temperature_unit: '°C', friendly_name: 'Forecast Home' } },
};
STRINGS.forEach(([, kwNow, , v, a, life], i) => Object.assign(states, {
    [`sensor.sigen_inverter_pv${i + 1}_power`]: kw(kwNow), [`sensor.sigen_inverter_pv${i + 1}_voltage`]: { state: String(v), attributes: { unit_of_measurement: 'V' } },
    [`sensor.sigen_inverter_pv${i + 1}_current`]: { state: a.toFixed(2), attributes: { unit_of_measurement: 'A' } },
    [`sensor.sigen_inverter_pv${i + 1}_daily_energy`]: kwh(stringDaily[i]), [`sensor.sigen_inverter_pv${i + 1}_accumulated_energy`]: kwh(life),
}));
LOADS.forEach(([id, name, kwNow]) => { states[id] = { state: String(Math.round(kwNow * 1000)), attributes: { unit_of_measurement: 'W', friendly_name: name } }; });

const history = {
    'sensor.sigen_plant_pv_power': samples.map(s => s.pv), 'sensor.sigen_plant_consumed_power': samples.map(s => s.home),
    'sensor.sigen_plant_battery_power': samples.map(s => s.bat), 'sensor.sigen_plant_grid_import_power': samples.map(s => s.imp),
    'sensor.sigen_plant_grid_export_power': samples.map(s => s.exp), 'sensor.sigen_ac_charger_charging_power': samples.map(s => s.ac),
    'sensor.sigen_inverter_dc_charger_output_power': samples.map(() => 0),
    'sensor.sigen_plant_battery_state_of_charge': stored.map(e => e / CAP * 100),
};
STRINGS.forEach((_, i) => { history[`sensor.sigen_inverter_pv${i + 1}_power`] = hours.map(h => stringKw(i, h)); });
const statistics = {
    'sensor.sigen_plant_total_pv_generation': 'pv', 'sensor.sigen_plant_total_discharged_energy_of_the_ess': 'discharge',
    'sensor.sigen_plant_total_imported_energy': 'imp', 'sensor.sigen_plant_total_charged_energy_of_the_ess': 'charge',
    'sensor.sigen_plant_total_exported_energy': 'exp', 'sensor.sigen_plant_total_charged_energy_of_the_evac': 'ac',
};
// The 7 days before, for the forecast's averages: 5-minute means of the PV and home power, the solar varying with
// each day's weather.
const means = { 'sensor.sigen_plant_pv_power': [], 'sensor.sigen_plant_consumed_power': [] };
[0.92, 1.04, 0.78, 1.08, 0.97, 0.88, 1.02].forEach((sun, i) => {
    const dayStart = MIDNIGHT - (7 - i) * 86400e3;
    for (let h = 0; h < 24; h += STEP) {
        const p = at(h + STEP / 2), start = dayStart + h * 3600e3;
        means['sensor.sigen_plant_pv_power'].push({ start, end: start + 300e3, mean: +(p.pv * sun).toFixed(3) });
        means['sensor.sigen_plant_consumed_power'].push({ start, end: start + 300e3, mean: +(p.home * (0.95 + 0.1 * ((i * 7) % 5) / 4)).toFixed(3) });
    }
});
const data = {
    states, times: samples.map(s => s.t), means,
    history: Object.fromEntries(Object.entries(history).map(([id, v]) => [id, v.map(x => +x.toFixed(3))])),
    statistics: Object.fromEntries(Object.entries(statistics).map(([id, key]) => [id, intervals.map(r => ({ start: r.t, end: r.t + 300e3, change: +(r[key] * STEP).toFixed(4) }))])),
};
const config = {
    home_entities: LOADS.map(([id]) => id), pv_strings: STRINGS.map(s => s[0]),
    ac_charger_soc: 'sensor.car_soc', ac_charger_range: 'sensor.car_range',
};

async function mount(page, style) {
    await page.setContent('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:var(--pad);background:#0b0f14"></body></html>');
    await page.addScriptTag({ path: card, type: 'module' });
    await page.evaluate(({ data, config, style }) => {
        const hass = {
            states: data.states, language: 'en', locale: { language: 'en', time_zone: 'server' }, themes: {},
            config: { latitude: -33.87, longitude: 151.21, time_zone: 'Australia/Sydney', unit_system: { temperature: '°C' } },
            callApi: async (method, query) => {
                const ids = decodeURIComponent(query.split('filter_entity_id=')[1].split('&')[0]).split(',');
                return ids.filter(id => data.history[id]).map(id => data.history[id].map((v, i) => ({ ...(i ? {} : { entity_id: id }), state: String(v), last_changed: new Date(data.times[i]).toISOString() })));
            },
            // No solar forecast integration: the forecast uses the 7-day averages.
            callWS: async msg => {
                if (msg.type === 'energy/solar_forecast') return {};
                const rows = msg.types.includes('mean') ? data.means : data.statistics;
                return Object.fromEntries(msg.statistic_ids.filter(id => rows[id]).map(id => [id, rows[id].filter(r => r.start >= Date.parse(msg.start_time) && r.start < Date.parse(msg.end_time))]));
            },
        };
        const el = document.createElement('sigenergy-flow-card');
        el.setConfig({ ...config, ...(style ? { style } : {}) });
        el.hass = hass;
        document.body.append(el);
    }, { data, config, style });
    await page.waitForTimeout(1500);
}
async function hoverChart(page, time) {
    const p = await page.evaluate(({ time }) => {
        const svg = document.querySelector('sigenergy-flow-card').shadowRoot.getElementById('chart'), r = svg.getBoundingClientRect(), c = svg._chart;
        return { x: r.left + c.x(time) * r.width / c.width, y: r.top + r.height / 2 };
    }, { time });
    await page.mouse.move(p.x, p.y);
    await page.waitForTimeout(200);
}
async function openDialog(page, button) {
    // showModal() focuses the close button; the focus ring is left out of the screenshot.
    await page.evaluate(id => { const root = document.querySelector('sigenergy-flow-card').shadowRoot; root.getElementById(id).click(); root.activeElement?.blur(); }, button);
    await page.waitForTimeout(900);
}
async function selectStat(page, side, index) {
    await page.evaluate(({ side, index }) => document.querySelector('sigenergy-flow-card').shadowRoot.querySelector(`#statChart [data-side="${side}"][data-index="${index}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true })), { side, index });
    await page.waitForTimeout(300);
}
async function statClip(page, pad) {
    const r = await page.evaluate(() => { const b = document.querySelector('sigenergy-flow-card').shadowRoot.getElementById('statPanel').getBoundingClientRect(); return { top: b.top + scrollY, height: b.height }; });
    const width = page.viewportSize().width;
    return { x: 0, y: r.top - pad, width, height: r.height + 2 * pad };
}

(async () => {
    const browser = await webkit.launch(process.env.WEBKIT ? { executablePath: process.env.WEBKIT } : {});
    const device = (width, height, pad, scale) => ({ viewport: { width, height }, deviceScaleFactor: scale, locale: 'en-AU', timezoneId: 'Australia/Sydney', pad });
    const shots = [
        { name: 'desktop', ...device(1000, 625, 11, 1.6) },
        { name: 'iphone', ...device(390, 844, 12, 2), mobile: true },
    ];
    for (const shot of shots) {
        for (const night of [false, true]) {
            const context = await browser.newContext({ viewport: shot.viewport, deviceScaleFactor: shot.deviceScaleFactor, locale: shot.locale, timezoneId: shot.timezoneId, isMobile: !!shot.mobile, hasTouch: !!shot.mobile });
            await context.clock.setFixedTime(NOW);
            const page = await context.newPage();
            page.on('pageerror', e => console.log('PAGEERROR', e.message));
            page.on('console', m => m.type() === 'error' && console.log('CONSOLE', m.text()));
            await mount(page, night ? 'night' : null);
            await page.evaluate(pad => document.body.style.setProperty('--pad', `${pad}px`), shot.pad);
            await page.waitForTimeout(500);
            const suffix = night ? '-night' : '';
            // The whole page fits in the viewport, so the pointer can reach the chart.
            const fullHeight = await page.evaluate(() => document.documentElement.scrollHeight);
            await page.setViewportSize({ width: shot.viewport.width, height: fullHeight });
            await page.waitForTimeout(400);
            if (shot.name === 'desktop') await hoverChart(page, Date.parse(process.env.HOVER || '2026-10-19T18:00:00+11:00'));
            await page.screenshot({ path: `${out}/${shot.name}-main${suffix}.png`, fullPage: true });
            await page.mouse.move(0, 0);
            await page.setViewportSize(shot.viewport);
            await page.waitForTimeout(400);
            // Energy statistics: desktop day SOLAR, desktop night LOAD, phone day GRID (export), phone night none.
            const pick = { 'desktop': night ? ['snk', 2] : ['src', 0], 'iphone': night ? null : ['snk', 4] }[shot.name];
            if (pick) await selectStat(page, ...pick);
            const statName = `stat-${shot.name === 'desktop' ? 'desk' : 'phone'}-${night ? 'night' : 'day'}`;
            await page.screenshot({ path: `${out}/${statName}.png`, clip: await statClip(page, shot.pad), fullPage: true });
            if (!night) {
                for (const [file, button] of [['solar', 'pvButton'], ['home', 'homeButton'], ['energy', 'capacity']]) {
                    await page.evaluate(() => scrollTo(0, 0));
                    await openDialog(page, button);
                    await page.screenshot({ path: `${out}/${shot.name}-${file}.png` });
                    await page.evaluate(() => document.querySelector('sigenergy-flow-card').shadowRoot.querySelectorAll('dialog[open]').forEach(d => d.close()));
                }
            }
            await context.close();
        }
    }
    await browser.close();
    console.log(`${out}: today's totals (kWh)`, JSON.stringify({ pv: sum('pv').toFixed(2), imp: sum('imp').toFixed(2), exp: sum('exp').toFixed(2), charge: sum('charge').toFixed(2), discharge: sum('discharge').toFixed(2), ac: sum('ac').toFixed(2) }));
})().catch(error => { console.error(error.message); process.exit(1); });
