/* The Massive provider remains a shared Worker/Characters facility, but its
   former desktop window is intentionally retired. Guard that split so a future
   UI change cannot silently re-register an authority-looking market window. */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { MASSIVE_API_ROUTES, MASSIVE_ASSETS, MASSIVE_TIMESPANS } from "../worker/massive.mjs";

const root = new URL("../", import.meta.url);
const file = path => new URL(path, root);
const indexHtml = readFileSync(file("index.html"), "utf8");
const charactersSource = readFileSync(file("js/apps-characters.js"), "utf8");
const charactersWorkerSource = readFileSync(file("worker/characters-massive.mjs"), "utf8");

test("the retired Massive Markets desktop assets are absent from the active page", () => {
  assert.equal(existsSync(file("js/apps-massive.js")), false, "the former desktop app module is deleted");
  assert.equal(existsSync(file("css/massive.css")), false, "the former desktop app stylesheet is deleted");
  assert.doesNotMatch(indexHtml, /js\/apps-massive\.js/, "index.html does not register the retired app");
  assert.doesNotMatch(indexHtml, /css\/massive\.css/, "index.html does not deliver the retired app stylesheet");
  assert.doesNotMatch(indexHtml, /Massive Markets/, "the desktop shell has no active Massive Markets label");
});

test("the shared Massive Worker validation surface remains intact for Characters", () => {
  assert.deepEqual(MASSIVE_TIMESPANS, ["minute", "hour", "day", "week", "month", "quarter", "year"]);
  assert.ok(Object.values(MASSIVE_API_ROUTES).every(route => route.startsWith("/api/massive/v1/")), "the private-key Worker routes remain same-origin");
  assert.ok(Object.keys(MASSIVE_ASSETS).includes("stocks") && Object.keys(MASSIVE_ASSETS).includes("crypto"), "the reviewed legacy Worker asset classes remain explicit");
  assert.match(charactersSource, /MASSIVE/, "Characters retains its provider-qualified market boundary");
  assert.match(charactersWorkerSource, /\/futures\/v1\/aggs\//, "the Characters Worker retains its reviewed Massive futures endpoint");
  assert.match(charactersWorkerSource, /MASSIVE_API_KEY/, "the upstream key remains confined to the Worker path");
});

test("no browser-side source reintroduces a standalone Massive app registration", () => {
  const browserSources = ["index.html", "js/apps-good-intelligence.js", "js/apps-characters.js", "js/apps-core.js"]
    .map(path => readFileSync(file(path), "utf8"));
  for (const source of browserSources) {
    assert.doesNotMatch(source, /id:\s*["']massive["']/i, "no active browser app registers the retired window");
    assert.doesNotMatch(source, /apps-massive\.js/i, "no active browser source loads the retired module");
  }
});
