// Run with: node --test tools/chart-history.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

class Element {
    constructor(tag) {
        this.tag = tag;
        this.attributes = {};
        this.children = [];
        this.clientWidth = 900;
    }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    append(child) { this.children.push(child); }
    replaceChildren() { this.children = []; }
}

const elements = new Map();
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'sigenergy-flow-card.js'), 'utf8'), {
    HTMLElement: class {},
    customElements: {
        get: name => elements.get(name),
        define: (name, value) => elements.set(name, value),
    },
    window: {},
    document: { createElementNS: (_, tag) => new Element(tag) },
});
const card = Object.create(elements.get('sigenergy-flow-card').prototype);
card._zone = 'Pacific/Auckland';
card._id = () => null;
const start = Date.parse('2026-11-12T00:00:00+13:00');
const end = start + 12 * 3600e3;

function plot(values, signed = false, top, window) {
    const svg = new Element('svg');
    const points = values.map((v, i) => ({ t: start + (end - start) * i / Math.max(1, values.length - 1), v }));
    card._plot(svg, [
        { name: 'Power', color: 'red', points },
        { name: 'Tooltip only', color: 'blue', tipOnly: true, points: [{ t: start, v: 1e9 }] },
    ], start, signed, top, window);
    return {
        svg,
        labels: svg.children.filter(el => el.tag === 'text').slice(0, 3).map(el => el.textContent),
        paths: svg.children.filter(el => el.tag === 'path'),
    };
}

for (const [name, signed, top, window] of [
    ['signed power', true],
    ['unsigned power', false],
    ['fixed upper limit', false, 100],
    ['fitted range', false, undefined, { end, fit: true }],
]) {
    test(`${name}: oversized history renders every point with unchanged axis limits`, () => {
        const values = Array.from({ length: 300000 }, (_, i) => i % 2 ? 12.25 : -7.5);
        const result = plot(values, signed, top, window);
        assert.deepEqual(result.labels, plot([-7.5, 12.25], signed, top, window).labels);
        assert.equal(result.paths.length, 1);
        assert.equal((result.paths[0].attributes.d.match(/[ML]/g) || []).length, values.length);
        assert.doesNotMatch(result.paths[0].attributes.d, /NaN|Infinity/);
        assert.equal(result.svg._chart.series[0].points.length, values.length);
    });
}

test('axis rounding, explicit limits, empty and zero histories stay unchanged', () => {
    assert.deepEqual(plot([-7.5, 12.25], true).labels, ['-15', '0', '15']);
    assert.deepEqual(plot([-7.5, 12.25]).labels, ['0', '7', '13']);
    assert.deepEqual(plot([2, 4], false, 100).labels, ['0', '50', '100']);
    assert.deepEqual(plot([]).labels, ['0', '0.5', '1']);
    assert.deepEqual(plot([0, 0], true).labels, ['-1', '0', '1']);
    assert.deepEqual(plot([10, 10], false, undefined, { end, fit: true }).labels, ['10.0', '10.2', '10.4']);
});
