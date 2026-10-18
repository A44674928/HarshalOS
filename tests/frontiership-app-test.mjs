import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const [appSource, indexHtml, wmSource, previewHtml, previewServer, assetStager] = await Promise.all([
  readFile(path.join(ROOT, "js/apps-frontiership.js"), "utf8"),
  readFile(path.join(ROOT, "index.html"), "utf8"),
  readFile(path.join(ROOT, "js/wm.js"), "utf8"),
  readFile(path.join(ROOT, "single-parcel-APN30055004/terrain_preliminary/harshalos-private-preview.html"), "utf8"),
  readFile(path.join(ROOT, "single-parcel-APN30055004/terrain_preliminary/private-preview-server.mjs"), "utf8"),
  readFile(path.join(ROOT, "scripts/prepare-assets.mjs"), "utf8")
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

test("all concepts enter the engineered-connections phase without implying design approval", () => {
  const window = { APPS: [] };
  vm.runInNewContext(appSource, { window, Array, Object, String }, { filename: "js/apps-frontiership.js" });
  const app = window.APPS.find(candidate => candidate.id === "frontiership-outpost-one");
  const body = { innerHTML: "", querySelectorAll: () => [], querySelector: () => null };

  assert.ok(app);
  app.render(body);
  assert.match(body.innerHTML, /ENGINEERED CONNECTIONS/);
  assert.match(body.innerHTML, /All current program concepts assigned/);
  assert.match(body.innerHTML, /no system is engineered, approved, or sealed/);
  assert.match(body.innerHTML, /Unincorporated Coconino County/);
  assert.match(body.innerHTML, /AR-5 · AREA SCREEN PASS/);
  assert.match(body.innerHTML, /Area-only AR-5 screen: PASS/);
  assert.match(body.innerHTML, /5\.59 ac against a 5\.00 ac minimum: \+0\.59 ac/);
  assert.match(body.innerHTML, /No permits found/);
  assert.match(body.innerHTML, /not overall zoning\/code compliance/i);
  assert.match(body.innerHTML, /no local professional or agency was contacted/i);
  assert.match(body.innerHTML, /Pre-design evidence we can assemble now/);
  assert.match(body.innerHTML, /Walkways/);
  assert.match(body.innerHTML, /Well \/ water \/ wastewater/);
  assert.match(body.innerHTML, /ATBI solutions \+ frontier nanotechnology/);
  assert.match(body.innerHTML, /macrotechnology demonstrator/);
  assert.match(body.innerHTML, /unique CPU pin matched to each socket/);
  assert.match(body.innerHTML, /functional weights/);
  assert.match(body.innerHTML, /Focus Modes/);
  assert.match(body.innerHTML, /Human capable of fitting into a role/);
  assert.match(body.innerHTML, /everything is collected/);
  assert.match(body.innerHTML, /central processing unit team participates/);
  assert.match(body.innerHTML, /everyone else is intended to be opt-in/);
  assert.match(body.innerHTML, /ATBI \/ human-data governance/);
  assert.match(body.innerHTML, /attestations over continuous monitoring/);
  assert.match(body.innerHTML, /62 bedrooms/);
  assert.match(body.innerHTML, /57 intended rentals/);
  assert.match(body.innerHTML, /Two owner bedrooms plus three extras/);
  assert.match(body.innerHTML, /Bunk layouts and fewer rooms are design options/);
  assert.match(body.innerHTML, /\$4,800 per rentable room-month/);
  assert.match(body.innerHTML, /Shared occupancy does not multiply the room price/);
  assert.match(body.innerHTML, /The old \$3,600 whole-furnished-2BR-ADU case/);
  assert.match(body.innerHTML, /\$1,100–\$1,900 bed-month study rates are historical only/);
  assert.match(body.innerHTML, /\$3\.2832M\/year before vacancy and all costs—not a forecast/);
  assert.match(body.innerHTML, /Legacy ≈1\/12 and “2\/5 of The Owner’s Area” premises remain unreconciled/);
  assert.doesNotMatch(body.innerHTML, /No rate is adopted|pricing basis remain unresolved/);
  assert.match(body.innerHTML, /External, in-kind, or earned funding/);
  assert.match(body.innerHTML, /Job income is also acceptable, with an acknowledged project delay/);
  assert.equal((body.innerHTML.match(/<details class="fo-disclosure">/g) || []).length, 4,
    "dense review, pre-design, and evidence sections stay collapsed until requested");
  assert.equal((body.innerHTML.match(/<th scope="row">EC-\d{2}<\/th>/g) || []).length, 12,
    "all twelve concept/data/safety interface groups are present in the connections register");
  assert.doesNotMatch(body.innerHTML, /PARTNER GATE PENDING|Awaiting partner meeting/);
  assert.match(assetStager, /const outpostDeployAssets = \[/);
  assert.doesNotMatch(assetStager, /(?:DIGITAL_CODE_ZONING_REVIEW|ENGINEERING_FRONTLOAD_PLAN|OUTPOST_ONE_PARTNER_BRIEF|OUTPOST_ONE_UNIFIED_PLAN|OUTPOST_ONE_INVESTOR_CUT_GUIDE)\.md|OUTPOST_ONE_PARTNER_CONCEPT\.svg|OUTPOST_ONE_INVESTOR_CUT\.mp4|render_outpost_one_investor_cut|investor-cut-assets/,
    "the full pre-design documents and new investor film stay outside the named runtime/deployment asset list");
  assert.doesNotMatch(previewServer, /(?:DIGITAL_CODE_ZONING_REVIEW|ENGINEERING_FRONTLOAD_PLAN|OUTPOST_ONE_PARTNER_BRIEF|OUTPOST_ONE_UNIFIED_PLAN|OUTPOST_ONE_INVESTOR_CUT_GUIDE)\.md|OUTPOST_ONE_PARTNER_CONCEPT\.svg|OUTPOST_ONE_INVESTOR_CUT\.mp4|render_outpost_one_investor_cut|investor-cut-assets/,
    "the local preview server does not expose the full pre-design documents or the new investor film");
});

test("Best-Wishes narrated media is a separate route from the preserved silent edition", () => {
  assert.match(appSource, /outpost-one-best-wishes-3d-narrated-film\.mp4/);
  assert.match(appSource, /outpost-one-best-wishes-narration\.mp3/);
  assert.match(appSource, /outpost-one-best-wishes-3d-film\.mp4/);
  assert.match(appSource, /Best-Wishes silent 3D edition/);
  assert.match(previewServer, /outpost-one-best-wishes-3d-narrated-film\.mp4/);
  assert.match(previewServer, /outpost-one-best-wishes-narration\.mp3/);
  assert.match(previewServer, /\['\.mp3', 'audio\/mpeg'\]/);
});

test("the deployed app explains that access control belongs to the hosting edge", () => {
  assert.match(appSource, /Access must gate the site and every static\/media route/);
  assert.match(appSource, /not authentication or an access-control boundary/);
  assert.doesNotMatch(appSource, /not registered in the public HarshalOS app list/);
  assert.doesNotMatch(previewHtml, /frontiership-outpost-app\.(?:js|css)/,
    "the local wrapper must use the shell-registered app instead of injecting a duplicate");
});
