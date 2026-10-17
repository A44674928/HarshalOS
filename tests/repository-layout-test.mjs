import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { access, readFile, readdir, rm } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SITE = path.join(ROOT, ".site-assets");
const exists = async file => access(file).then(() => true, () => false);

async function listFiles(directory, prefix = "") {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) output.push(...await listFiles(path.join(directory, entry.name), relative));
    else if (entry.isFile()) output.push(relative);
  }
  return output;
}

async function reservePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

function waitForPreview(child) {
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8").on("data", chunk => { stdout += chunk; });
  child.stderr.setEncoding("utf8").on("data", chunk => { stderr += chunk; });
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`preview server did not start; stderr: ${stderr}`)), 5000);
    const ready = () => {
      if (!stdout.includes("HarshalOS static server")) return;
      clearTimeout(timeout);
      resolve();
    };
    child.stdout.on("data", ready);
    child.once("error", error => { clearTimeout(timeout); reject(error); });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      reject(new Error(`preview server exited before listening (${code ?? signal}); stderr: ${stderr}`));
    });
  });
}

test("P13: repository content is separated by status and purpose", async () => {
  const expected = [
    "specs/normative/canonical-model.md",
    "specs/normative/canonical.json",
    "specs/normative/contradictions.md",
    "specs/normative/ground-0-v1.0.md",
    "specs/normative/ground-0-v1.1.md",
    "specs/draft/ground-0-v1.2.md",
    "docs/deployment/MONGODB-SETUP.md",
    "docs/source-material/Ground-0 Phase Detection Algorithm.md",
    "docs/REPOSITORY-STRUCTURE.md",
    "docs/architecture/PLUGIN-ARCHITECTURE.md",
    "docs/integrations/MATERIALS-PROJECT.md",
    "docs/integrations/CHARACTER-MATERIAL-MODEL.md",
    "publications/README.md",
    "publications/harshal-systems/HARSHAL-SYSTEMS-USER-MANUAL.md",
    "publications/harshal-systems/HARSHAL-SYSTEMS-USER-MANUAL.docx",
    "publications/grand-river-foundation/BOOK-II-THE-GRAND-RIVER-FOUNDATION-PREVIEW.md",
    "publications/grand-river-foundation/BOOK-II-THE-GRAND-RIVER-FOUNDATION-PREVIEW.docx",
    "archives/README.md",
    "archives/animation-source/eye-closing/README.md",
    "archives/animation-source/eye-closing/Eye Closing HQ.gif",
    "archives/animation-source/eye-closing/frames/animate-000 Large.png",
    "archives/source-bundles/README.md",
    "archives/source-bundles/UpdateOct2.zip",
    "case-studies/GROUND-0 CASE STUDY - Anthropic.md",
    "case-studies/GROUND-0 CASE STUDY - OpenAI.md",
    "research/reports/Research_report_Anthropic_Compliance_and_Enforcement_Mechani.md",
    "archives/ground-0/ground-0-phase-detection-algorithm.zip",
    "archives/ground-0/ground-0-phase-detection-algorithm-2.zip",
    "archives/Duplicates/DUPLICATE-QUARANTINE-MANIFEST.csv",
    "archives/HarshalOS Previews/orb-skin-embers-L0.png",
    "archives/Supply Chain/Documentation/Supply Chain++ Attack Vector Report-1.pdf",
    "business plan/Stakeholders.txt",
    "manuscript/README.md",
    "manuscript/the-grand-river-foundation/_collection.json",
    "manuscript/the-grand-river-foundation/00-prologue-the-geometry-of-restraint.txt",
    "manuscript/the-grand-river-foundation/01-chapter-1-the-shock-of-addressability.txt",
    "manuscript/the-grand-river-foundation/02-chapter-2-the-citadel-on-the-rim.txt",
    "manuscript/the-grand-river-foundation/03-interstitial-cable-select.txt",
    "manuscript/the-grand-river-foundation/04-chapter-3-the-paper-siege.txt",
    "manuscript/the-grand-river-foundation/05-chapter-4-the-prompt-supercritical-threat.txt",
    "manuscript/the-grand-river-foundation/06-chapter-5-the-zero-degree-meridian.txt",
    "manuscript/the-grand-river-foundation/07-chapter-6-the-hundred-and-nineteen.txt",
    "manuscript/the-grand-river-foundation/08-chapter-7-the-origin-continuity-covenant.txt",
    "js/manuscript.js",
    "css/manuscript.css",
    "js/apps-materials-project.js",
    "css/materials-project.css",
    "js/character-material-model.js",
    "js/apps-character-materials.js",
    "css/character-materials.css",
    "docs/integrations/CHARACTER-MATERIAL-MODEL.md",
    "worker/materials-project.mjs",
    "worker/orb2-field-publish.mjs",
    "migrations/community/0018_orb2_field_snapshot.sql",
    "scripts/orb2-beat-runner.mjs",
    "scripts/orb2-d1-client.mjs",
    "docs/deployment/ORB2-BEAT-RUNNER.md",
    "tests/orb2-field-publish-test.mjs",
    "tests/orb2-beat-runner-test.mjs",
    "tests/materials-project-api-test.mjs",
    "tests/materials-project-ui-test.mjs",
    "tests/character-material-model-test.mjs",
    "tests/character-materials-ui-test.mjs",
    "js/core-book-reader.js",
    "css/core-book.css",
    "css/book-library.css",
    "docs/harshal-systems/01-core-book.md",
    "scripts/book-library-index.mjs",
    "scripts/prepare-assets.mjs",
    "scripts/manuscript-index.mjs",
    "tests/kernel-api-test.mjs",
    "tests/book-library-index-test.mjs",
    "tests/core-book-reader-test.mjs",
    "tests/manuscript-test.mjs",
    "tests/repository-layout-test.mjs"
  ];
  for (const relative of expected) assert.equal(await exists(path.join(ROOT, relative)), true, `expected organized path: ${relative}`);
  for (const legacy of [
    "specs/ground-0-v1.0.md",
    "specs/ground-0-v1.1.md",
    "MONGODB-SETUP.md",
    "GROUND-0 CASE STUDY - Anthropic.md",
    "GROUND-0 CASE STUDY - OpenAI.md",
    "Research_report_Anthropic_Compliance_and_Enforcement_Mechani.md",
    "ground-0-phase-detection-algorithm.zip",
    "HARSHAL-SYSTEMS-USER-MANUAL.md",
    "HARSHAL-SYSTEMS-USER-MANUAL.docx",
    "BOOK-II-THE-GRAND-RIVER-FOUNDATION-PREVIEW.md",
    "BOOK-II-THE-GRAND-RIVER-FOUNDATION-PREVIEW.docx",
    "PLUGIN-ARCHITECTURE.md",
    "UpdateOct2.zip",
    "Eye Closing HQ.gif",
    "animate-000 Large.png",
    ".DS_Store",
    "Archive",
    "Business Plan",
    "scripts/kernel-api-test.mjs"
  ]) assert.equal(await exists(path.join(ROOT, legacy)), false, `legacy root/script path should be retired: ${legacy}`);
});

test("P13: root-level files stay limited to app entry points, configuration, optional tooling, and GitHub policy", async () => {
  const rootFiles = (await readdir(ROOT, { withFileTypes: true }))
    .filter(entry => entry.isFile())
    .map(entry => entry.name)
    .sort();
  assert.deepEqual(rootFiles, [
    ".assetsignore", ".gitignore", "README.md", "SECURITY.md", "about.html", "account.html", "audits.html", "design-review-response.md", "index.html", "neo-orb.html", "observations.html",
    "package-lock.json", "package.json", "requirements-hf-data-library.txt", "requirements-newsml-g2.txt", "serve.js", "wrangler.jsonc", "wrangler.staging.jsonc"
  ]);

  const tracked = spawnSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(tracked.status, 0, tracked.stderr || "git ls-files should succeed");
  const finderMetadata = tracked.stdout.split("\0").filter(file => /(?:^|\/)\.DS_Store$/.test(file));
  assert.deepEqual(finderMetadata, [], "Finder metadata must not be committed");
});

test("desktop app icons use fixed grid cells and two-line labels at every breakpoint", async () => {
  const [desktopCss, mobileCss, html] = await Promise.all([
    readFile(path.join(ROOT, "css/os.css"), "utf8"),
    readFile(path.join(ROOT, "css/mobile.css"), "utf8"),
    readFile(path.join(ROOT, "index.html"), "utf8")
  ]);
  const rule = (css, selector) => {
    const start = css.indexOf(`${selector} {`);
    const open = css.indexOf("{", start);
    const close = css.indexOf("}", open);
    assert.ok(start >= 0 && open >= 0 && close > open, `expected a CSS rule for ${selector}`);
    return css.slice(open + 1, close);
  };
  const desktopField = rule(desktopCss, ".icon-field");
  const desktopTile = rule(desktopCss, ".desk-icon");
  const desktopLabel = rule(desktopCss, ".desk-icon .di-label");
  const mobileField = rule(mobileCss, ".icon-field");
  const mobileTile = rule(mobileCss, ".desk-icon");

  assert.ok(desktopField.includes("display: grid"));
  assert.ok(desktopField.includes("grid-template-columns: repeat(auto-fill, 88px)"));
  assert.ok(desktopField.includes("grid-auto-rows: 108px"));
  assert.ok(desktopTile.includes("width: 88px") && desktopTile.includes("height: 108px"));
  assert.ok(desktopLabel.includes("line-clamp: 2"));
  assert.ok(mobileField.includes("grid-auto-rows: 104px"));
  assert.ok(mobileTile.includes("height: 104px"));
  assert.ok(html.includes('id="icon-field" class="icon-field" role="group" aria-label="Desktop applications, sorted alphabetically"'));
});

test("mobile shells scroll the desktop and place the clock card in that flow", async () => {
  const [mobileCss, utsCss, html] = await Promise.all([
    readFile(path.join(ROOT, "css/mobile.css"), "utf8"),
    readFile(path.join(ROOT, "css/uts.css"), "utf8"),
    readFile(path.join(ROOT, "index.html"), "utf8")
  ]);
  const block = (css, header) => {
    const open = css.indexOf("{", css.indexOf(header));
    assert.ok(open >= 0, `expected a ${header} block`);
    let depth = 0;
    for (let i = open; i < css.length; i++) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}" && --depth === 0) return css.slice(open + 1, i);
    }
    assert.fail(`unbalanced braces after ${header}`);
  };
  /* A file may carry several blocks with the same media query; a media query
     only ever narrows the rules above it, so asserting over their union is
     exactly what a device at that width sees. */
  const blocks = (css, header) => {
    let out = "";
    let rest = css;
    while (rest.includes(header)) {
      out += block(rest, header);
      rest = rest.slice(rest.indexOf(header) + header.length);
    }
    assert.ok(out, `expected a ${header} block`);
    return out;
  };

  /* The widget keeps a fixed overlay on desktop, where the icon grid is a
     narrow left-hand column and the panel has room of its own. */
  assert.ok(block(utsCss, ".home-time-widget {").includes("position: absolute"),
    "the clock stays a desktop overlay on wide screens");

  const mobileWidget = blocks(utsCss, "@media (max-width: 860px)");
  assert.ok(mobileWidget.includes("position: static"), "on mobile the clock joins the document flow");
  assert.ok(mobileWidget.includes("order: -1"), "the clock card is the first item in the desktop's scroll flow");
  assert.ok(mobileWidget.includes(".home-time-widget.is-collapsed .home-time-body { display: none; }"),
    "the collapsed clock hides its body instead of shrinking over the icons");
  assert.ok(mobileWidget.includes("opacity: .42") && mobileWidget.includes("background: transparent")
      && mobileWidget.includes("box-shadow: none"),
    "the collapsed clock fades its card into the desktop background");
  assert.ok(mobileWidget.includes(".home-time-widget.is-collapsed .home-widget-label,")
      && mobileWidget.includes(".home-time-widget.is-collapsed .home-uts-open { display: none; }"),
    "minimizing removes the foreground header and leaves only its restore control");

  const narrowWidget = blocks(utsCss, "@media (max-width: 620px)");
  assert.ok(narrowWidget.includes("margin: 0 14px 14px"), "the phone card uses the same 14px gutter as the icon grid");

  const mobileShell = blocks(mobileCss, "@media (max-width: 860px)");
  assert.ok(block(mobileShell, ".desktop {").includes("overflow-y: auto"),
    "the mobile desktop is a scroll region, not a fixed stage");
  assert.ok(block(mobileShell, ".desktop {").includes("flex-direction: column"),
    "home-screen items share one vertical flow");
  assert.ok(block(mobileShell, ".window-layer {").includes("position: fixed"),
    "an open window stays pinned to the viewport while the desktop scrolls underneath");
  assert.ok(block(mobileShell, ".icon-field {").includes("position: static"),
    "the icon grid scrolls with the page instead of clipping inside itself");
  assert.ok(mobileShell.includes(".home-time-widget .home-widget-toggle {"), "the touch target for minimizing is sized in the mobile shell");

  assert.ok(html.includes('id="home-widget-toggle"') && html.includes('aria-controls="home-time-body"'),
    "the clock markup exposes the minimize control and its collapsible body");
  assert.ok(html.indexOf('id="home-time-widget"') < html.indexOf('id="icon-field"'),
    "the clock card precedes the icons in the scroll flow");
});

test("P13: publication, source-bundle, and animation archive groups are complete", async () => {
  const frames = (await readdir(path.join(ROOT, "archives/animation-source/eye-closing/frames")))
    .filter(name => /^animate-\d{3} Large\.png$/.test(name))
    .sort();
  assert.equal(frames.length, 25, "all original numbered animation frames are retained together");
  assert.deepEqual(frames, Array.from({ length: 25 }, (_, index) => `animate-${String(index).padStart(3, "0")} Large.png`));
});

test("P13: moved Book I publication keeps its repository-relative links valid", async () => {
  const manual = path.join(ROOT, "publications/harshal-systems/HARSHAL-SYSTEMS-USER-MANUAL.md");
  const content = await readFile(manual, "utf8");
  const links = [...content.matchAll(/\]\(([^)]+)\)/g)];
  let checked = 0;
  for (const match of links) {
    const target = match[1].trim().split(/\s+/, 1)[0].replace(/^<|>$/g, "");
    if (!target || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target) || target.startsWith("#")) continue;
    const localPath = decodeURIComponent(target.split(/[?#]/, 1)[0]);
    if (!localPath) continue;
    const resolved = path.resolve(path.dirname(manual), localPath);
    assert.equal(await exists(resolved), true, `publication link should resolve: ${target}`);
    checked++;
  }
  assert.ok(checked >= 50, `expected the manual's local navigation links to be checked (${checked})`);
});

test("P13: public asset staging includes the selected Book I source, all indexed library files, versioned specs, and manuscript chapters", async () => {
  try {
    const result = spawnSync(process.execPath, ["scripts/prepare-assets.mjs"], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 30000
    });
    assert.equal(result.error, undefined, result.error && result.error.message);
    assert.equal(result.status, 0, `${result.stdout || ""}\n${result.stderr || ""}`);

    const topLevel = (await readdir(SITE)).sort();
    assert.deepEqual(topLevel, ["about.html", "account.html", "assets", "audits.html", "book", "book-library", "css", "index.html", "js", "manuscript", "neo-orb.html", "observations.html", "private", "specs", "terrain", "trades"]);
    for (const publicAsset of ["css/materials-project.css", "js/apps-materials-project.js", "css/character-materials.css", "js/character-material-model.js", "js/apps-character-materials.js", "css/trades.css", "js/apps-trades.js", "js/apps-frontiership.js", "css/frontiership.css", "trades/index.txt"]) {
      assert.equal(await exists(path.join(SITE, publicAsset)), true, `${publicAsset} is staged as a browser asset`);
    }
    assert.deepEqual((await listFiles(path.join(SITE, "private"), "private")).sort(), [
      "private/outpost-one-best-wishes-3d-film.mp4",
      "private/outpost-one-best-wishes-3d-poster.png",
      "private/outpost-one-best-wishes-guide.md",
      "private/outpost-one-full-feature-film.mp4",
      "private/outpost-one-full-feature-poster.png",
      "private/outpost-one-feature-film-guide.md",
      "private/outpost-one-concept-model.zip"
    ].sort(), "only the explicitly named project films, posters, guides, and model package are staged");
    assert.deepEqual((await listFiles(path.join(SITE, "terrain"), "terrain")).sort(), [
      "terrain/index.html",
      "terrain/README.md",
      "terrain/epqs_samples.csv",
      "terrain/parcel_outline.geojson"
    ].sort(), "the terrain viewer receives only its named HTML/source files");
    assert.equal(await exists(path.join(SITE, "terrain_preliminary")), false, "the full project source folder is not staged");
    assert.equal(await exists(path.join(SITE, "private/business-plan")), false, "private workbooks and business-plan documents are not staged");
    assert.equal(await exists(path.join(SITE, "worker/materials-project.mjs")), false, "Worker source and its secret-handling code are not browser assets");
    assert.equal(await exists(path.join(SITE, "docs/integrations/MATERIALS-PROJECT.md")), false, "Materials Project operator documentation stays repository-only");
    assert.equal(await exists(path.join(SITE, "docs/integrations/CHARACTER-MATERIAL-MODEL.md")), false, "character-material model documentation stays repository-only");

    const bookFiles = (await listFiles(path.join(SITE, "book"), "book")).sort();
    assert.deepEqual(bookFiles, ["book/01-core-book.md"], "only the explicitly selected Book I source is published");
    assert.equal(
      await readFile(path.join(SITE, "book", "01-core-book.md"), "utf8"),
      await readFile(path.join(ROOT, "docs", "harshal-systems", "01-core-book.md"), "utf8"),
      "the staged reader source matches the canonical repository document"
    );

    const stagedLibraryFiles = (await listFiles(path.join(SITE, "book-library", "harshal-systems"))).sort();
    const repositoryLibraryFiles = (await listFiles(path.join(ROOT, "docs", "harshal-systems"))).sort();
    assert.deepEqual(stagedLibraryFiles, repositoryLibraryFiles, "every library Markdown file is staged without exposing unrelated docs/");
    const libraryManifest = JSON.parse(await readFile(path.join(SITE, "book-library", "manifest.json"), "utf8"));
    assert.equal(libraryManifest.schema, "harshalos-book-library-v1");
    assert.equal(libraryManifest.documentCount, repositoryLibraryFiles.length);
    assert.equal(libraryManifest.collectionCount, 7);
    assert.equal(libraryManifest.moduleCount, 32);
    const indexedLibraryFiles = [
      ...libraryManifest.guides,
      ...libraryManifest.collections.flatMap(collection => [collection.overview, ...collection.modules])
    ].map(document => document.file).sort();
    assert.deepEqual(indexedLibraryFiles, repositoryLibraryFiles, "the catalog links every staged source exactly once");

    const specFiles = (await listFiles(path.join(SITE, "specs"), "specs")).sort();
    assert.deepEqual(specFiles, [
      "specs/draft/ground-0-v1.2.md",
      "specs/normative/canonical-model.md",
      "specs/normative/canonical.json",
      "specs/normative/contradictions.md",
      "specs/normative/ground-0-v1.0.md",
      "specs/normative/ground-0-v1.1.md"
    ]);

    /* Manuscript staging is a data publish: the generated index plus the
       chapter files it names — never the folder's notes or metadata. */
    const manuscriptFiles = (await listFiles(path.join(SITE, "manuscript"), "manuscript")).sort();
    assert.ok(manuscriptFiles.includes("manuscript/manifest.json"), "the generated index is staged");
    assert.ok(manuscriptFiles.includes("manuscript/the-grand-river-foundation/00-prologue-the-geometry-of-restraint.txt"), "chapters are staged");
    assert.ok(manuscriptFiles.includes("manuscript/the-grand-river-foundation/08-chapter-7-the-origin-continuity-covenant.txt"), "latest chapter is staged");
    for (const file of manuscriptFiles) {
      assert.match(file, /^manuscript\/(?:manifest\.json|the-grand-river-foundation\/[A-Za-z0-9._-]+\.(?:txt|md))$/,
        `only chapters and the index may be staged: ${file}`);
    }
    assert.equal(manuscriptFiles.includes("manuscript/README.md"), false, "the folder instructions are not published");
    assert.equal(manuscriptFiles.includes("manuscript/the-grand-river-foundation/_collection.json"), false, "collection metadata is not published");

    for (const excluded of ["docs", "publications", "case-studies", "research", "archives", "tests", "scripts", "worker", "business plan", "SECURITY.md", "README.md"]) {
      assert.equal(await exists(path.join(SITE, excluded)), false, `repository-only content must not be staged: ${excluded}`);
    }
  } finally {
    await rm(SITE, { recursive: true, force: true });
  }
});

test("P13: local preview serves the selected Book I source and Collections library without exposing other docs", async () => {
  const port = await reservePort();
  const child = spawn(process.execPath, ["serve.js"], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"]
  });
  try {
    await waitForPreview(child);
    const base = `http://127.0.0.1:${port}`;
    for (const [pathname, marker] of [
      ["/specs/normative/ground-0-v1.0.md", "Ground-0 Phase Detection Algorithm"],
      ["/specs/normative/ground-0-v1.1.md", "Ratified normative amendment, adopted 2026-10-14"],
      ["/specs/draft/ground-0-v1.2.md", "PDH-R"]
    ]) {
      const response = await fetch(`${base}${pathname}`);
      assert.equal(response.status, 200, `${pathname} should be served`);
      assert.match(response.headers.get("content-type"), /text\/markdown/);
      assert.ok((await response.text()).includes(marker), `${pathname} should return its actual spec content`);
    }
    const coreBook = await fetch(`${base}/book/01-core-book.md`);
    assert.equal(coreBook.status, 200, "the exact selected Book I route is served");
    assert.match(coreBook.headers.get("content-type"), /text\/markdown/);
    assert.ok((await coreBook.text()).includes("Part I — The Core Book"));

    for (const [pathname, marker] of [
      ["/account", "Private workspace"],
      ["/audits", "Public audit register"],
      ["/observations", "Public observations"]
    ]) {
      const response = await fetch(`${base}${pathname}`);
      assert.equal(response.status, 200, `${pathname} should be available in local preview`);
      assert.match(response.headers.get("content-type"), /text\/html/);
      assert.ok((await response.text()).includes(marker), `${pathname} should return its HTML shell`);
    }

    const libraryResponse = await fetch(`${base}/book-library/manifest.json`);
    assert.equal(libraryResponse.status, 200, "the generated Collections catalog is served");
    const library = await libraryResponse.json();
    assert.equal(library.schema, "harshalos-book-library-v1");
    assert.equal(library.collectionCount, 7);
    assert.equal(library.moduleCount, 32);
    assert.equal(library.documentCount, 43);
    const collectionOverview = await fetch(`${base}/book-library/harshal-systems/collections/01-foundations/README.md`);
    assert.equal(collectionOverview.status, 200, "collection overview files can be read online");
    assert.match(collectionOverview.headers.get("content-type"), /text\/markdown/);
    assert.ok((await collectionOverview.text()).includes("Collection I — Foundational Doctrine"));

    const manuscriptIndex = await fetch(`${base}/manuscript/manifest.json`);
    assert.equal(manuscriptIndex.status, 200, "the generated manuscript index is served");
    assert.equal((await manuscriptIndex.json()).schema, "harshalos-manuscript-v1");

    const tradesIndex = await fetch(`${base}/trades/index.txt`);
    assert.equal(tradesIndex.status, 200, "the static Trades ticker index is served");
    assert.match(tradesIndex.headers.get("content-type"), /text\/plain/);
    const tradesIndexText = await tradesIndex.text();
    assert.match(tradesIndexText, /Disc1 · The 52 Cards/);
    assert.match(tradesIndexText, /Disc4 · Futures/);
    assert.match(tradesIndexText, /Disc5 · Added from 2026 TradingView posts/);
    assert.match(tradesIndexText, /STOCK ·/);
    assert.match(tradesIndexText, /FUTURES ·/);

    const outpostModule = await fetch(`${base}/js/apps-frontiership.js`);
    assert.equal(outpostModule.status, 200, "the OUTPOST ONE app module is available in the desktop bundle");
    assert.match(await outpostModule.text(), /frontiership-outpost-one/);
    const terrainPage = await fetch(`${base}/terrain/`);
    assert.equal(terrainPage.status, 200, "the named terrain viewer route is served");
    assert.match(await terrainPage.text(), /APN 30055004/);
    const terrainSamples = await fetch(`${base}/terrain/epqs_samples.csv`);
    assert.equal(terrainSamples.status, 200, "only the selected terrain sample file is served");
    assert.match(terrainSamples.headers.get("content-type"), /text\/csv/);
    const filmRange = await fetch(`${base}/private/outpost-one-best-wishes-3d-film.mp4`, {
      headers: { Range: "bytes=0-63" }
    });
    assert.equal(filmRange.status, 206, "the Best-Wishes film supports byte-range playback");
    assert.match(filmRange.headers.get("content-type"), /video\/mp4/);
    assert.equal((await filmRange.arrayBuffer()).byteLength, 64);
    const bestWishesGuide = await fetch(`${base}/private/outpost-one-best-wishes-guide.md`);
    assert.equal(bestWishesGuide.status, 200);
    assert.match(await bestWishesGuide.text(), /Best-Wishes/);

    for (const pathname of [
      "/single-parcel-APN30055004/terrain_preliminary/README.md",
      "/single-parcel-APN30055004/terrain_preliminary/best-wishes-edition/render_frontiership_best_wishes_3d.py",
      "/private/not-allowlisted.txt",
      "/terrain/outpost-one-concept-model.obj",
      "/trades/private.md",
      "/trades/../README.md",
      "/docs/harshal-systems/01-core-book.md",
      "/book/another-document.md",
      "/book-library/harshal-systems/not-a-real-file.md",
      "/book-library/private.txt",
      "/docs/REPOSITORY-STRUCTURE.md",
      "/PLUGIN-ARCHITECTURE.md",
      "/docs/architecture/PLUGIN-ARCHITECTURE.md",
      "/docs/architecture/HARSHALS-PALACE.html",
      "/publications/harshal-systems/HARSHAL-SYSTEMS-USER-MANUAL.md",
      "/archives/",
      "/archives/Duplicates/DUPLICATE-QUARANTINE-MANIFEST.csv",
      "/archives/screenshots/2026-08/",
      "/business%20plan/Stakeholders.txt",
      "/tests/repository-layout-test.mjs",
      "/specs/source-material.md",
      "/manuscript/README.md",
      "/manuscript/the-grand-river-foundation/_collection.json"
    ]) {
      const response = await fetch(`${base}${pathname}`);
      assert.equal(response.status, 404, `${pathname} must stay outside the public preview allowlist`);
    }
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      const stopped = once(child, "exit").catch(() => {});
      child.kill("SIGTERM");
      await stopped;
    }
  }
});
