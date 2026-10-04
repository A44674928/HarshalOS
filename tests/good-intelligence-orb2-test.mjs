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

test("Orb 2 renders reviewed ticker labels as distinct hourly and daily orb models", () => {
  const { orb } = harness();
  const tickers = [{ symbol: "AAPL", name: "Apple", sector: "Technology" }, { symbol: "MSFT", name: "Microsoft", sector: "Technology" }];
  const hourly = orb.buildNodes(tickers, "1h");
  const daily = orb.buildNodes(tickers, "1d");
  assert.equal(hourly.length, tickers.length);
  assert.deepEqual(hourly.map(node => node.symbol), ["AAPL", "MSFT"]);
  assert.ok(hourly.every(node => node.visualId === node.symbol && node.id.endsWith("-1h")));
  assert.ok(daily.every(node => node.id.endsWith("-1d")));
  assert.notDeepEqual(hourly.map(node => [node.longitude, node.latitude, node.color]), daily.map(node => [node.longitude, node.latitude, node.color]));
  assert.equal(new Set(hourly.map(node => node.id)).size, hourly.length);
});

test("Orb 2 rejects missing and malformed ticker rows instead of inventing symbols", () => {
  const { orb } = harness();
  const nodes = orb.buildNodes([{ symbol: "AAPL", name: "Apple", sector: "Technology" }, { symbol: "bad ticker" }, null]);
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].symbol, "AAPL");
});

test("Orb 2 mounts interactive local controls and defaults motion off for reduced-motion visitors", t => {
  const { window, calls, frames } = interactiveHarness();
  t.after(() => window.happyDOM.abort());
  const host = window.document.createElement("div");
  window.document.body.appendChild(host);
  const orb = window.GoodIntelligenceOrb2;
  let clearBeats = 0, restoreBeats = 0;
  const engine = orb.mount(host, {
    tickers: [{ symbol: "AAPL", name: "Apple", sector: "Technology" }],
    onClearBeats() { clearBeats++; }, onRestoreBeats() { restoreBeats++; }
  });
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
  assert.equal(engine.nodes.length, 1);
  assert.equal(engine.state.autoRotate, false, "prefers-reduced-motion starts with rotation disabled");
  const formation = host.querySelector("[data-gi-orb2-formation]");
  formation.value = "0";
  formation.dispatchEvent(new window.Event("input", { bubbles: true }));
  assert.equal(engine.state.formation, 0, "the Disc ↔ Sphere range control updates the local model");
  const select = host.querySelector("[data-gi-orb2-select]");
  select.value = engine.nodes[0].id;
  select.dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.equal(engine.state.selected, 0, "the accessible selector changes the inspected node");
  host.querySelector("[data-gi-orb2-route]").click();
  assert.equal(engine.state.route.type, "resolution", "the trace button creates only a local visual route");
  host.querySelector("[data-gi-orb2-lateral]").click();
  assert.equal(engine.state.route.type, "lateral", "the lateral control remains a distinct display trace");
  host.querySelector("[data-gi-orb2-clear-beats]").click();
  assert.equal(clearBeats, 1, "Clear beats asks Characters to archive and hide the session beat log");
  window.document.dispatchEvent(new window.CustomEvent("harshalos:characters-beats:status", { detail: { hasStored: true } }));
  const restore = host.querySelector("[data-gi-orb2-restore-beats]");
  assert.equal(restore.hidden, false, "stored beats can be restored after clearing");
  restore.click();
  assert.equal(restoreBeats, 1, "Restore stored beats reintroduces the archived session history");
  engine.state.yaw = 1;
  host.querySelector("[data-gi-orb2-reset]").click();
  assert.equal(engine.state.yaw, -0.68, "Reset view restores the camera");
  assert.equal(clearBeats, 2, "Reset view also clears beat context");
  engine.setVisible(false);
  assert.equal(engine.state.visible, false, "hiding the Good Intelligence tab pauses the renderer");
  engine.setVisible(true);
  assert.equal(engine.state.visible, true, "returning to the tab resumes the renderer");
  engine.destroy();
});

test("the Orb 2 module is browser-local and makes no provider or authority call", () => {
  assert.doesNotMatch(orbSource, /\bfetch\s*\(/, "the renderer does not fetch market or network data");
  assert.doesNotMatch(orbSource, /sessionStorage|XMLHttpRequest|WebSocket/, "the renderer does not open a separate storage or network channel");
  assert.match(orbSource, /SAVED_BEAT_SESSION_KEY/, "only an opaque random browser key is retained locally for the D1 archive");
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
  assert.match(appSource, /\["news", "markets", "tradingview", "orb2"\]\.includes/, "the view switcher accepts Orb 2");
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
