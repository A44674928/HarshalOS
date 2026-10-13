/* The standalone NEO ORB page (/neo-orb, neo-orb.html). It is its own document, so the
   browser enforces the boundary: connect-src 'self' and no inline script. These tests check
   the document, its policy, the staging and routing that serve it, and that it boots from
   its own scripts with no outside request. Display-only, synthetic-or-labelled data only. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
import { Window } from "happy-dom";
import worker from "../worker/index.mjs";
import { NEO_ORB_PAGE_PATHS, NEO_ORB_PAGE_POLICY, NEO_ORB_PAGE_META_CSP, NEO_ORB_PAGE_HEADER_CSP } from "../worker/neo-orb-page.mjs";

const ROOT = new URL("../", import.meta.url);
const readText = path => readFile(new URL(path, ROOT), "utf8");
const pageHtml = await readText("neo-orb.html");
const pageScript = await readText("js/neo-orb-page.js");
const pageCss = await readText("css/neo-orb-page.css");
const prepareSource = await readText("scripts/prepare-assets.mjs");
const assetsIgnore = await readText(".assetsignore");
const wranglerText = await readText("wrangler.jsonc");
const stagingText = await readText("wrangler.staging.jsonc");

const metaCsp = (pageHtml.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/) || [])[1] || "";
const scriptSrcs = [...pageHtml.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(m => m[1]);
const linkHrefs = [...pageHtml.matchAll(/<link\b[^>]*\bhref="([^"]+)"/g)].map(m => m[1]);
const stripQuery = s => s.split("?")[0];

/* The same JSONC reader the config tests use: drop whole-line comments only. */
const parseJsonc = text => JSON.parse(text.split("\n").filter(line => !/^\s*\/\//.test(line)).join("\n").replace(/,(\s*[}\]])/g, "$1"));

test("the page's meta policy is the single policy constant, minus frame-ancestors", () => {
  assert.equal(metaCsp, NEO_ORB_PAGE_META_CSP);
  assert.ok(!/frame-ancestors/.test(metaCsp), "frame-ancestors is ignored in a meta tag, so it lives in the header only");
});

test("the policy lets the page reach only its own origin and runs no inline script", () => {
  const directives = Object.fromEntries(NEO_ORB_PAGE_POLICY.map(d => [d.split(" ")[0], d.split(" ").slice(1)]));
  assert.deepEqual(directives["connect-src"], ["'self'"], "the only connection the page can open is to its own origin");
  assert.deepEqual(directives["script-src"], ["'self'"], "no inline or third-party script");
  assert.equal(directives["default-src"][0], "'none'", "anything not named is denied");
  assert.ok(!/https?:|\*|\/\//.test(NEO_ORB_PAGE_META_CSP), "no host, wildcard, or scheme appears in the policy");
  assert.ok(!/script-src[^;]*unsafe-inline/.test(NEO_ORB_PAGE_META_CSP), "inline script is never allowed");
  assert.equal(NEO_ORB_PAGE_HEADER_CSP, `${NEO_ORB_PAGE_META_CSP}; frame-ancestors 'none'`, "the header adds only frame-ancestors");
});

test("the page has no inline script, no inline event handler, and no script or link to another origin", () => {
  assert.equal([...pageHtml.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>/g)].length, 0, "every script is a file");
  assert.equal(/\son[a-z]+\s*=/i.test(pageHtml), false, "no on* handler attributes");
  assert.equal(/javascript:/i.test(pageHtml), false);
  for (const url of [...scriptSrcs, ...linkHrefs]) {
    if (url.startsWith("data:")) continue; /* the favicon is inline data, not a request */
    assert.ok(!/^[a-z]+:/i.test(url) && !url.startsWith("//"), `${url} must be a same-origin relative path`);
  }
});

test("every local file the page names exists in the checkout", async () => {
  for (const url of [...scriptSrcs, ...linkHrefs]) {
    if (url.startsWith("data:")) continue;
    await readText(stripQuery(url));
  }
  assert.ok(scriptSrcs.length >= 9, "the NEO ORB scripts are all present");
});

test("the scripts load in dependency order, and the page boot script runs last", () => {
  assert.deepEqual(scriptSrcs.map(stripQuery), [
    "js/good-intelligence-market-roster.js",
    "js/flame.js",
    "js/market-extension.js",
    "js/neo-orb-signals.js",
    "js/neo-orb-black-hole.js",
    "js/neo-orb-quasar.js",
    "js/neo-orb-reinsurance.js",
    "js/neo-orb-model.js",
    "js/neo-orb-placement.js",
    "js/neo-orb-market.js",
    "js/neo-orb-field.js",
    "js/apps-neo-orb.js",
    "js/neo-orb-page.js"
  ]);
  assert.ok(pageHtml.includes('<main id="neo-root"'), "the app mounts into #neo-root");
});

test("the page boot script and stylesheet make no request of their own and contain no outside reference", () => {
  for (const [name, source] of [["neo-orb-page.js", pageScript], ["neo-orb-page.css", pageCss]]) {
    assert.ok(!/https?:\/\/|\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(source), `${name} names no outside host`);
    assert.ok(!/\bfetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts|@import/.test(source), `${name} makes no request`);
  }
});

test("the build stages the page, and the asset ignore file allows it", () => {
  assert.ok(/'index\.html', 'neo-orb\.html'/.test(prepareSource), "prepare-assets copies neo-orb.html into the deploy");
  assert.ok(/^!neo-orb\.html$/m.test(assetsIgnore), ".assetsignore allows neo-orb.html");
});

test("both Worker configs send the page through the Worker, so its header applies", () => {
  for (const text of [wranglerText, stagingText]) {
    const runFirst = parseJsonc(text).assets.run_worker_first;
    assert.ok(runFirst.includes("/neo-orb") && runFirst.includes("/neo-orb.html"), "both paths run the Worker first");
  }
});

test("the Worker serves the page with the locked-down header and refuses writes", async () => {
  const fetched = [];
  const env = { ASSETS: { fetch: async request => { fetched.push(new URL(request.url).pathname); return new Response("<!doctype html>", { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }); } } };
  for (const path of ["/neo-orb", "/neo-orb.html"]) {
    const response = await worker.fetch(new Request(`https://os.example${path}`), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Security-Policy"), NEO_ORB_PAGE_HEADER_CSP);
    assert.equal(response.headers.get("Referrer-Policy"), "no-referrer");
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  }
  assert.deepEqual(fetched, ["/neo-orb", "/neo-orb"], "the .html alias is served from the canonical asset");
  const write = await worker.fetch(new Request("https://os.example/neo-orb", { method: "POST" }), env);
  assert.equal(write.status, 405);
  assert.equal(fetched.length, 2, "a refused write never reaches the assets");
  assert.deepEqual(Object.keys(NEO_ORB_PAGE_PATHS).sort(), ["/neo-orb", "/neo-orb.html"]);
});

test("the page boots from its own scripts and mounts NEO ORB into #neo-root", async () => {
  const win = new Window({ url: "https://os.example/neo-orb", settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
  const doc = win.document;
  const bodyMatch = pageHtml.match(/<body[^>]*>([\s\S]*?)<script/);
  doc.body.innerHTML = bodyMatch[1];
  const players = {};
  const fakePlayer = name => ({ name, ready: false, baking: false, frames: [], current: 0, onerror: null, onprogress: null, start() { return this; } });
  const context = vm.createContext({
    window: win, globalThis: win, document: doc, performance, console,
    Math, Number, String, Object, Array, Set, Map, JSON, BigInt, Error, RangeError, TypeError, Promise,
    requestAnimationFrame: () => 0,
    FractalFlame: { shared(url) { return url.includes("OuterOrb") ? (players.outer ||= fakePlayer("outer")) : (players.inner ||= fakePlayer("inner")); } }
  });
  for (const src of scriptSrcs) {
    const file = stripQuery(src);
    if (file === "js/flame.js") continue; /* the real engine is replaced by the stub above; this test checks boot wiring */
    vm.runInContext(await readText(file), context, { filename: file });
  }
  assert.ok(win.NeoOrbApp, "the app registered its mount");
  assert.ok(win.NEO_ORB_ENGINE, "the page booted an engine");
  const root = doc.getElementById("neo-root");
  assert.ok(root.querySelector(".neo-root"), "NEO ORB rendered inside the page root");
  assert.equal(/could not start/.test(root.textContent), false);
});
