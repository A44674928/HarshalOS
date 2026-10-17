import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const [appSource, indexHtml, wmSource, previewHtml] = await Promise.all([
  readFile(path.join(ROOT, "js/apps-frontiership.js"), "utf8"),
  readFile(path.join(ROOT, "index.html"), "utf8"),
  readFile(path.join(ROOT, "js/wm.js"), "utf8"),
  readFile(path.join(ROOT, "single-parcel-APN30055004/terrain_preliminary/harshalos-private-preview.html"), "utf8")
]);

test("OUTPOST ONE is registered before HarshalOS builds the desktop launcher grid", () => {
  const window = { APPS: [] };
  vm.runInNewContext(appSource, { window, Array, Object, String }, { filename: "js/apps-frontiership.js" });
  const app = window.APPS.find(candidate => candidate.id === "frontiership-outpost-one");

  assert.ok(app, "the app module adds an APPS registry entry");
  assert.equal(window.FRONTIERSHIP_OUTPOST_ONE_APP, app);
  assert.equal(app.title, "FRONTIERSHIP · OUTPOST ONE");
  assert.equal(app.short, "OUTPOST ONE");
  assert.equal(app.glyph, "⌂");
  assert.equal(typeof app.render, "function");

  const appScript = indexHtml.indexOf('src="js/apps-frontiership.js');
  const bootScript = indexHtml.indexOf('src="js/boot.js');
  assert.ok(appScript >= 0 && bootScript > appScript, "the app module executes before boot initializes the shell");
  assert.match(indexHtml, /href="css\/frontiership\.css/);
  assert.match(wmSource, /b\.className = "desk-icon"/);
  assert.match(wmSource, /app\.glyph/);
  assert.match(wmSource, /app\.short \|\| app\.title/);
  assert.match(wmSource, /field\.appendChild\(b\)/);
});

test("the deployed app explains that access control belongs to the hosting edge", () => {
  assert.match(appSource, /Access must gate the site and every static\/media route/);
  assert.match(appSource, /not authentication or an access-control boundary/);
  assert.doesNotMatch(appSource, /not registered in the public HarshalOS app list/);
  assert.doesNotMatch(previewHtml, /frontiership-outpost-app\.(?:js|css)/,
    "the local wrapper must use the shell-registered app instead of injecting a duplicate");
});
