/* Orb 2 is a local Good Intelligence rendering: the actual Characters cast is
   its only roster source, and it cannot become a market-data or authority path. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
import { Window } from "happy-dom";

const ROOT = new URL("../", import.meta.url);
const readText = path => readFile(new URL(path, ROOT), "utf8");
const castSource = await readText("js/characters-cast.js");
const orbSource = await readText("js/good-intelligence-orb2.js");
const appSource = await readText("js/apps-good-intelligence.js");
const indexHtml = await readText("index.html");

function harness() {
  const window = {};
  const context = vm.createContext({ window, globalThis: window, Object, Array, String, Number, Math, Set, Map });
  vm.runInContext(castSource, context, { filename: "js/characters-cast.js" });
  vm.runInContext(orbSource, context, { filename: "js/good-intelligence-orb2.js" });
  return { cast: window.CharactersCast, orb: window.GoodIntelligenceOrb2 };
}

function interactiveHarness() {
  const window = new Window({ url: "https://os.example/", settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  let frameId = 0;
  const frames = [];
  window.requestAnimationFrame = callback => { frames.push(callback); return ++frameId; };
  window.cancelAnimationFrame = () => {};
  const calls = [];
  const gradient = { addColorStop() {} };
  const canvasContext = new Proxy({}, {
    get(target, key) {
      if (key === "createRadialGradient") return () => gradient;
      if (key === "measureText") return () => ({ width: 0 });
      if (key in target) return target[key];
      return () => { calls.push(key); };
    },
    set(target, key, value) { target[key] = value; return true; }
  });
  Object.defineProperty(window.HTMLCanvasElement.prototype, "getContext", { configurable: true, value: () => canvasContext });
  window.eval(castSource);
  window.eval(orbSource);
  return { window, calls, frames };
}

test("Orb 2 derives every visual node from the reviewed Characters runtime roster", () => {
  const { cast, orb } = harness();
  assert.equal(orb.SCHEMA, "gi-orb2-v1");
  assert.equal(orb.CENTER_ADDRESS, "0•000•000•0000");
  const nodes = orb.buildNodes(cast.NPC_ROSTER);
  assert.equal(nodes.length, cast.NPC_ROSTER.length, "the full runtime roster becomes the render roster");
  assert.deepEqual(nodes.map(node => node.name), cast.NPC_ROSTER.map(node => node.name));
  assert.ok(nodes.every(node => /^NPC-\d{2}$/.test(node.visualId)), "peripheral labels are explicitly local visual IDs");
  assert.ok(nodes.every(node => !Object.hasOwn(node, "address")), "the canvas does not fabricate OCM-directory registrations");
  assert.ok(nodes.every(node => node.affinity.length && node.color && Number.isFinite(node.longitude) && Number.isFinite(node.latitude)));
  assert.equal(new Set(nodes.map(node => node.id)).size, nodes.length, "node identifiers are stable and unique");
});

test("Orb 2 rejects empty and duplicate roster entries instead of inventing members", () => {
  const { orb } = harness();
  const nodes = orb.buildNodes([
    { name: "The Example", role: "A safe fixture", glyph: "◇", affinity: ["Example"] },
    { name: "The Example", role: "Duplicate", glyph: "!", affinity: ["Example"] },
    { name: "", role: "Missing", glyph: "?", affinity: [] },
    null
  ]);
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].name, "The Example");
  assert.deepEqual([...nodes[0].affinity], ["Example"]);
});

test("Orb 2 mounts interactive local controls and defaults motion off for reduced-motion visitors", t => {
  const { window, calls, frames } = interactiveHarness();
  t.after(() => window.happyDOM.abort());
  const host = window.document.createElement("div");
  window.document.body.appendChild(host);
  const orb = window.GoodIntelligenceOrb2;
  const engine = orb.mount(host, { roster: window.CharactersCast.NPC_ROSTER });
  const canvas = host.querySelector("[data-gi-orb2-canvas]");
  Object.defineProperties(canvas, {
    offsetParent: { configurable: true, value: host },
    clientWidth: { configurable: true, value: 720 },
    clientHeight: { configurable: true, value: 440 }
  });
  const firstFrame = frames.shift();
  assert.equal(typeof firstFrame, "function", "mount schedules a render frame when canvas is available");
  firstFrame(100);
  assert.ok(calls.includes("fillRect") && calls.includes("arc"), "the scheduled frame paints the projected sphere and nodes");
  assert.equal(engine.nodes.length, window.CharactersCast.NPC_ROSTER.length);
  assert.equal(engine.state.autoRotate, false, "prefers-reduced-motion starts with rotation disabled");
  const formation = host.querySelector("[data-gi-orb2-formation]");
  formation.value = "0";
  formation.dispatchEvent(new window.Event("input", { bubbles: true }));
  assert.equal(engine.state.formation, 0, "the Disc ↔ Sphere range control updates the local model");
  const select = host.querySelector("[data-gi-orb2-select]");
  select.value = engine.nodes[2].id;
  select.dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.equal(engine.state.selected, 2, "the accessible selector changes the inspected node");
  host.querySelector("[data-gi-orb2-route]").click();
  assert.equal(engine.state.route.type, "resolution", "the trace button creates only a local visual route");
  host.querySelector("[data-gi-orb2-lateral]").click();
  assert.equal(engine.state.route.type, "lateral", "the lateral control remains a distinct display trace");
  engine.setVisible(false);
  assert.equal(engine.state.visible, false, "hiding the Good Intelligence tab pauses the renderer");
  engine.setVisible(true);
  assert.equal(engine.state.visible, true, "returning to the tab resumes the renderer");
  engine.destroy();
});

test("the Orb 2 module is browser-local and makes no provider or authority call", () => {
  assert.doesNotMatch(orbSource, /\bfetch\s*\(/, "the renderer does not fetch market or network data");
  assert.doesNotMatch(orbSource, /localStorage|sessionStorage|XMLHttpRequest|WebSocket/, "the renderer does not persist or transmit state");
  assert.match(orbSource, /No message is sent/, "the default route copy states its no-transmission boundary");
  assert.match(orbSource, /cannot authorize, resolve, commit, or transact/, "the visual model states its authority boundary");
  assert.match(orbSource, /Resolution is not an authority source/, "the Resolution Axis invariant is retained in the displayed model");
  assert.match(orbSource, /REVIEWED BEAT CONTEXT/, "the model labels the reviewed Characters beat context instead of fabricating a live quote");
  assert.match(orbSource, /Orb 2 receives none of those packets/, "the context explicitly excludes prices, ranks, and signals from this canvas");
});

test("Good Intelligence exposes Orb 2 as a lazy fifth tab and preserves the local boundary", () => {
  const tvTab = appSource.indexOf('data-gi-view="tradingview"');
  const orbTab = appSource.indexOf('data-gi-view="orb2"');
  assert.ok(tvTab !== -1 && orbTab > tvTab, "Orb 2 follows the chart tabs");
  assert.match(appSource, /data-gi-orb2-panel[^>]*hidden/, "the heavy canvas panel is hidden until selected");
  assert.match(appSource, /\["feed", "rankings", "markets", "tradingview", "orb2"\]\.includes/, "the view switcher accepts Orb 2");
  assert.match(appSource, /state\.orb2Engine = Orb2\.mount/, "the renderer mounts only through the Orb 2 module");
  assert.match(appSource, /sends no messages, fetches no market data, and confers no authority/i);
});

test("the standalone Massive Markets desktop window is retired while its Worker boundary remains available to Characters", () => {
  assert.doesNotMatch(indexHtml, /css\/massive\.css/, "the retired app stylesheet is no longer delivered");
  assert.doesNotMatch(indexHtml, /js\/apps-massive\.js/, "the retired app no longer registers a desktop window");
  const orbAt = indexHtml.indexOf("js/good-intelligence-orb2.js");
  const appAt = indexHtml.indexOf("js/apps-good-intelligence.js");
  assert.ok(orbAt !== -1 && appAt !== -1 && orbAt < appAt, "the Orb 2 module loads before its Good Intelligence tab");
});
