import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import '../js/nab-sectors.js';
import '../js/characters-disc-catalog.js';
import '../js/nab-composites.js';
import '../js/nab-orb-renderer.js';
const Renderer = globalThis.NabOrbRenderer;
const Model = globalThis.NabComposites;
const NAB = globalThis.NabSectors;
const NOW = Date.parse('2026-10-04T12:00:00Z');
const registry = Model.catalog({ watchlist: NAB.sectors.map(row => ({ symbol: row.ticker, name: row.company })) });
const observation = (symbol, close, extras = {}) => ({ channel: 'stocks', symbol, provider: 'massive', interval: '1d', at: NOW, status: 'bars',
  market: { latestBar: { close }, basis: 100, bands: { lower1000: 80, upper1000: 140 } }, ...extras });
const fixture = (observations = [], physical = {}) => NAB.sectors.map(row => Model.compose(row.id, { registry, observations, now: NOW, ...physical }));

test('119 complete composites become distinct stable 3D cores; bank and physical records survive', () => {
  const values = fixture([observation('V', 120), observation('MA', 90)], {
    spheroids: [{ id: 'material-design', nabId: 12, name: 'Two records', components: [{ materialId: 'mp-1', sharePercent: 60 }, { materialId: 'mp-2', sharePercent: 40 }] }],
    materials: [{ materialId: 'mp-1', formula: 'Si', density: 2.3 }]
  });
  const scene = Renderer.buildScene(values);
  assert.equal(scene.length, 119);
  assert.equal(new Set(scene.map(node => node.id)).size, 119);
  const node = scene.find(node => node.nabId === 12);
  assert.equal(node.composite, values[11], 'the renderer receives the complete model, not a rebuilt stock-only roster');
  assert.equal(node.members.length, values[11].members.length);
  assert.ok(node.members.find(member => member.id === 'central-bank:fed'));
  assert.ok(node.members.find(member => member.id === 'fx:EURUSD'));
  assert.equal(node.physical.length, 2);
  assert.equal(node.physical[0].component.material.density, 2.3);
  assert.equal(node.physical[1].component.material, null);
  assert.ok(node.physical.every(facet => facet.marketY === null));
});

test('designated stock alone sets core height; supporting markets keep independent absolute FBB positions', () => {
  const scene = Renderer.buildScene(fixture([
    observation('V', 120), observation('MA', 90),
    observation('EURUSD', 80, { channel: 'fx' })
  ]));
  const visa = scene.find(node => node.nabId === 12), mastercard = scene.find(node => node.nabId === 20);
  assert.equal(visa.displacement, .5);
  assert.equal(visa.position.y, .5 * Renderer.HEIGHT);
  assert.equal(mastercard.position.y, -.5 * Renderer.HEIGHT);
  const fx = visa.members.find(member => member.id === 'fx:EURUSD');
  assert.equal(fx.position.y, -Renderer.HEIGHT, 'not parent height plus offset and not a blended price');
  assert.equal(visa.members.find(member => member.channel === 'central-bank').marketY, null);
  const baseline = Renderer.buildScene(fixture([observation('V', 100)])).find(node => node.nabId === 12);
  assert.equal(baseline.position.y, 0);
});

test('no clipping, risk-based elevation, provider fallback or manufactured neutral position', () => {
  const scene = Renderer.buildScene(fixture([
    observation('V', 260), observation('MA', 120, { provider: 'tickerbot', interval: '1h' }),
    observation('CCJ', 80), observation('AXON', 80)
  ]));
  assert.equal(scene.find(node => node.nabId === 12).position.y, 4 * Renderer.HEIGHT);
  assert.equal(scene.find(node => node.nabId === 20).marketY, null);
  assert.equal(scene.find(node => node.nabId === 20).known, false);
  assert.ok(scene.find(node => node.nabId === 20).position.x > 13, 'unknown staging is detached from the market plane');
  assert.equal(scene.find(node => node.ticker === 'CCJ').position.y, scene.find(node => node.ticker === 'AXON').position.y,
    'extreme and safe NAB risk categories cannot alter identical price displacement');
  const next = Renderer.buildScene(fixture([observation('V', 140)]));
  const old = scene.find(node => node.nabId === 12), current = next.find(node => node.nabId === 12);
  assert.equal(old.position.x, current.position.x);
  assert.equal(old.position.z, current.position.z, 'market changes do not reorder a core by rank');
});

test('failed attempts remain unknown, stale packets stay marked, and missing primary does not borrow a constituent', () => {
  const scene = Renderer.buildScene(fixture([
    observation('V', 120), observation('V', 120, { at: NOW + 1, status: 'unavailable', market: null }),
    observation('MA', 90, { at: NOW - 2 * 86400000 }),
    observation('EURUSD', 120, { channel: 'fx' })
  ]));
  assert.equal(scene.find(node => node.nabId === 12).known, false);
  assert.equal(scene.find(node => node.nabId === 20).stale, true);
});

function harness(t, { reduced = false, noCanvas = false } = {}) {
  const window = new Window({ url: 'https://os.test' });
  const calls = [], frames = new Map(); let frameId = 0;
  const gradient = { addColorStop: (...args) => calls.push(['colorStop', ...args]) };
  const context = new Proxy({}, { get(target, name) {
    if (name === 'createRadialGradient') return () => gradient;
    if (name in target) return target[name];
    return (...args) => calls.push([name, ...args]);
  } });
  window.HTMLCanvasElement.prototype.getContext = () => noCanvas ? null : context;
  window.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({ left: 15, top: 20, width: 960, height: 560 });
  window.requestAnimationFrame = fn => { const id = ++frameId; frames.set(id, fn); return id; };
  window.cancelAnimationFrame = id => frames.delete(id);
  window.matchMedia = () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} });
  window.eval(readFileSync(new URL('../js/nab-orb-renderer.js', import.meta.url), 'utf8'));
  const host = window.document.createElement('div'); window.document.body.append(host);
  const selected = [], details = [];
  const renderer = window.NabOrbRenderer.mount(host, { onSelect: id => selected.push(id), onInspect: detail => details.push(detail) });
  const flush = (time = 100) => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(time)); };
  const pointer = (type, x, y, id = 1) => host.querySelector('canvas').dispatchEvent(new window.PointerEvent(type, { clientX: x + 15, clientY: y + 20, pointerId: id, button: 0, bubbles: true }));
  t.after(() => { renderer.destroy(); window.happyDOM.abort(); });
  return { window, host, renderer, calls, frames, selected, details, flush, pointer };
}

test('primary canvas renders every core, picks the projected NAB, and keeps drag distinct from click', t => {
  const { renderer, calls, flush, pointer, selected, host, window } = harness(t);
  renderer.update(fixture([observation('V', 120)]), { selectedId: 12, provider: 'massive', interval: '1d' }); flush();
  assert.equal(renderer.projected.filter(point => point.kind === 'nab').length, 119);
  assert.ok(calls.some(call => call[0] === 'ellipse'));
  assert.ok(calls.some(call => call[0] === 'fillText' && call[1] === 'FBB BASELINE · 0'));
  const visa = renderer.projected.find(point => point.kind === 'nab' && point.nabId === 12);
  pointer('pointerdown', visa.x, visa.y); pointer('pointerup', visa.x, visa.y);
  assert.equal(selected.at(-1), 12);
  const before = renderer.camera;
  pointer('pointerdown', 100, 100); pointer('pointermove', 190, 135); pointer('pointerup', 190, 135);
  assert.notEqual(renderer.camera.yaw, before.yaw);
  assert.equal(selected.length, 1, 'drag never selects an accidental core');
  host.querySelector('canvas').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal(selected.at(-1), 13);
});

test('constituent and material markers are rendered and individually inspectable', t => {
  const { renderer, flush, pointer, details, host } = harness(t);
  renderer.update(fixture([observation('V', 120)], {
    spheroids: [{ id: 'p', nabId: 12, name: 'Physical test', components: [{ materialId: 'mp-1', sharePercent: 100 }] }], materials: []
  }), { selectedId: 12 });
  host.querySelector('[data-orb-focus]').click(); flush();
  const physical = renderer.projected.find(point => point.kind === 'physical');
  assert.ok(physical);
  assert.ok(renderer.projected.some(point => point.detail?.channel === 'central-bank'));
  pointer('pointerdown', physical.x, physical.y); pointer('pointerup', physical.x, physical.y);
  assert.equal(details.at(-1)?.id, 'physical:p:0');
  assert.equal(details.at(-1)?.component.material, null);
});

test('updates keep canvas and camera, visibility pauses frames, and destruction releases listeners', t => {
  const { renderer, window, host, flush, frames, selected } = harness(t);
  renderer.update(fixture([observation('V', 120)]), { selectedId: 12 }); flush();
  host.querySelector('[data-orb-focus]').click(); flush();
  const camera = JSON.stringify(renderer.camera), canvas = host.querySelector('canvas');
  renderer.update(fixture([observation('V', 140)]), { selectedId: 12 }); flush();
  assert.equal(JSON.stringify(renderer.camera), camera);
  assert.equal(host.querySelector('canvas'), canvas);
  const rotate = host.querySelector('[data-orb-rotate]'); rotate.checked = true; rotate.dispatchEvent(new window.Event('change')); flush();
  assert.ok(frames.size > 0);
  renderer.setVisible(false); assert.equal(frames.size, 0);
  renderer.setVisible(true); assert.ok(frames.size > 0);
  renderer.destroy(); assert.equal(frames.size, 0);
  canvas.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight' }));
  assert.equal(selected.length, 0);
});

test('reduced motion has no idle animation and unavailable canvas has an honest accessible fallback', t => {
  const a = harness(t, { reduced: true });
  a.renderer.update(fixture()); a.flush();
  const rotate = a.host.querySelector('[data-orb-rotate]'); rotate.checked = true; rotate.dispatchEvent(new a.window.Event('change')); a.flush();
  assert.equal(a.frames.size, 0);
  const b = harness(t, { noCanvas: true }); b.renderer.update(fixture());
  assert.equal(b.host.querySelector('[data-orb-fallback]').hidden, false);
  assert.equal(b.renderer.scene.length, 119);
});

test('hit testing is depth-correct when core projections overlap', () => {
  const near = { x: 10, y: 20, radius: 9, depth: -2, nabId: 12 };
  const far = { ...near, depth: 4, nabId: 20 };
  assert.equal(Renderer.hitTest([far, near], 10, 20).nabId, 12);
  assert.equal(Renderer.hitTest([near], 100, 100), null);
});
