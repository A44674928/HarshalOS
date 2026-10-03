import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildData, moonAtPalace } from "../scripts/palace-day.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const PAGE = path.join(ROOT, "docs", "architecture", "HARSHALS-PALACE.html");
const DAY_MINUTES = 1440;
const SEVEN_SLOTS = ["|Name|", "|Role|", "|Faction|", "|Dialogue|", "|Inventory|", "|Quest|", "|Stats|"];
const STATE_CODES = new Set(["sl", "qt", "po", "ro", "lg", "wa", "kb", "ti", "un", "se"]);
const STAGED_PREFIXES = ["js/", "css/", "assets/", "specs/", "manuscript/", "docs/harshal-systems/"];

/* Staging allowlist directories are copied verbatim into the browser bundle
   (see tests/repository-layout-test.mjs), so NPC nameplates must never be
   placed in them — staff bedrooms are rostered in docs/architecture/npcs/. */

async function collectNameplates(dir, out) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".site-assets" || entry.name === ".wrangler") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await collectNameplates(full, out);
    else if (entry.isFile() && entry.name === "|Name|.txt") out.push(path.relative(ROOT, full));
  }
  return out;
}

test("palace: the committed page is a deterministic render of the live roster", async () => {
  const result = spawnSync(process.execPath, ["scripts/palace-day.mjs", "--check"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 60000
  });
  assert.equal(result.error, undefined, result.error && result.error.message);
  assert.equal(result.status, 0, `${result.stdout || ""}\n${result.stderr || ""}`);
  assert.match(result.stdout, /matches the roster \(183 residents\)/);
});

test("palace: every bedroom nameplate on disk is a resident on the map", async () => {
  const [data, nameplates] = await Promise.all([buildData(), collectNameplates(ROOT, [])]);

  assert.equal(nameplates.length, 183, "the roster is 183 bedrooms");
  assert.equal(data.counts.total, 183, "the palace renders 183 residents");

  const onDisk = new Set(nameplates.map(file => {
    const folder = path.basename(path.dirname(file));
    return folder.startsWith("|") && folder.endsWith("|") ? folder.slice(1, -1) : folder;
  }));
  const onMap = new Set(data.npcs.map(npc => npc.name));
  assert.deepEqual([...onMap].sort(), [...onDisk].sort(), "map residents and disk nameplates must be the same set");

  for (const npc of data.npcs) {
    assert.equal(npc.nb > 0, npc.name === "CREATOR", `only CREATOR's nameplate may be authored: ${npc.name}`);
    assert.ok(npc.bedroom.endsWith("/|" + npc.name + "|") || npc.bedroom.endsWith("/" + npc.name),
      `bedroom folder must be named after the resident: ${npc.bedroom}`);
    for (const prefix of STAGED_PREFIXES) {
      assert.equal(npc.bedroom.startsWith(prefix), false,
        `NPC bedroom must not sit in a staged asset directory (${prefix}): ${npc.bedroom}`);
    }
  }
  assert.equal(data.counts.authored, 1);
  assert.ok(data.litany.includes("Harshal Patel"), "CREATOR's alias litany is embedded in the page data");
});

test("palace: every bedroom holds exactly the seven profile slot files", async () => {
  const data = await buildData();
  for (const npc of data.npcs) {
    const bedroomDir = path.join(ROOT, npc.bedroom);
    const files = (await readdir(bedroomDir)).filter(name => name.endsWith(".txt")).sort();
    assert.deepEqual(files, SEVEN_SLOTS.map(slot => slot + ".txt").sort(),
      `bedroom must hold exactly the seven slot tokens: ${npc.bedroom}`);
  }
});

test("palace: every bedroom's |Dialogue|.txt is authored and well-formed", async () => {
  const data = await buildData();
  const tags = new Set(["morning", "noon", "evening", "night"]);
  assert.equal(data.counts.dialogued, 183, "all 183 residents have authored dialogue");
  for (const npc of data.npcs) {
    const raw = await readFile(path.join(ROOT, npc.bedroom, "|Dialogue|.txt"), "utf8");
    const lines = raw.split(/\r?\n/).filter(line => line.trim());
    assert.ok(lines.length >= 2 && lines.length <= 12, `2–12 utterances: ${npc.name} (${lines.length})`);
    for (const line of lines) {
      assert.ok(line.length >= 2 && line.length <= 200, `utterance length 2–200 chars: ${npc.name}`);
      const tag = line.match(/^\((\w+)\)\s+/);
      if (tag) assert.ok(tags.has(tag[1]), `known time tag (${tag[1]}): ${npc.name}`);
    }
    assert.equal(npc.dialogue.length, lines.length, `page dialogue count matches disk: ${npc.name}`);
    for (let i = 0; i < lines.length; i++) {
      const parsed = lines[i].match(/^\((morning|noon|evening|night)\)\s+(.*)$/);
      assert.equal(npc.dialogue[i].x, parsed ? parsed[2] : lines[i], `page dialogue text matches disk: ${npc.name} #${i}`);
      assert.equal(npc.dialogue[i].g, parsed ? parsed[1] : null, `page dialogue tag matches disk: ${npc.name} #${i}`);
    }
    assert.ok(npc.db > 0, `dialogue byte count embedded: ${npc.name}`);
  }
  const kernel = data.npcs.find(npc => npc.name === "The Kernel");
  assert.ok(kernel.dialogue.some(d => d.x === "Permit."), "the Kernel still says Permit.");
});

test("palace: the palace moon agrees with the UTS watch's own model", async () => {
  /* js/celestial-context.js is a browser IIFE; give it a window and compare. */
  const source = await readFile(path.join(ROOT, "js", "celestial-context.js"), "utf8");
  const sandbox = {};
  new Function("window", source)(sandbox);
  const appMoon = sandbox.HOSCelestialContext.moonAt;
  assert.equal(typeof appMoon, "function", "celestial-context exposes moonAt");
  const dates = [
    "2026-10-03T21:00:00Z",
    "2026-01-01T00:00:00Z",
    "2026-06-15T12:00:00Z",
    "2025-12-25T00:00:00Z",
    "2026-03-10T06:30:00Z",
    "2026-11-20T18:00:00Z",
    "2027-07-07T07:07:00Z"
  ];
  for (const date of dates) {
    const app = appMoon(date);
    const palace = moonAtPalace(date);
    assert.equal(palace.key, app.key, `phase key agrees at ${date}`);
    assert.equal(palace.trend, app.trend, `waxing/waning agrees at ${date}`);
    assert.ok(Math.abs(palace.illuminationFraction - app.illuminationFraction) < 0.005,
      `illumination agrees at ${date}`);
    assert.ok(palace.illuminationFraction >= 0 && palace.illuminationFraction <= 1);
  }
  assert.throws(() => moonAtPalace("1800-01-01T00:00:00Z"), RangeError, "out-of-range dates refuse to compute");
});

test("palace: every resident's average day is a contiguous 24-hour schedule", async () => {
  const data = await buildData();
  assert.ok(data.npcs.length >= 183);
  for (const npc of data.npcs) {
    assert.ok(Array.isArray(npc.sched) && npc.sched.length >= 1, `schedule exists: ${npc.name}`);
    assert.equal(npc.sched[0][0], 0, `schedule starts at midnight: ${npc.name}`);
    assert.equal(npc.sched[npc.sched.length - 1][1], DAY_MINUTES, `schedule ends at 24:00: ${npc.name}`);
    for (let i = 0; i < npc.sched.length; i++) {
      const [t0, t1, state] = npc.sched[i];
      assert.ok(t1 > t0, `segment must be non-empty: ${npc.name} #${i}`);
      assert.ok(STATE_CODES.has(state), `known state code: ${npc.name} #${i} (${state})`);
      if (i > 0) assert.equal(t0, npc.sched[i - 1][1], `no gap or overlap: ${npc.name} #${i}`);
    }
    assert.ok(npc.home && Number.isFinite(npc.home[0]) && Number.isFinite(npc.home[1]), `home position: ${npc.name}`);
    assert.ok(npc.lounge, `lounge meal spot: ${npc.name}`);
  }
});

test("palace: the Day Book references real residents and the page markup is intact", async () => {
  const [data, html] = await Promise.all([buildData(), readFile(PAGE, "utf8")]);

  const names = new Set(data.npcs.map(npc => npc.name));
  assert.ok(data.events.length >= 50, "the Day Book covers the day");
  for (let i = 0; i < data.events.length; i++) {
    const ev = data.events[i];
    assert.ok(ev.t >= 0 && ev.t <= DAY_MINUTES, `event inside the day: ${ev.id}`);
    if (i > 0) assert.ok(ev.t >= data.events[i - 1].t, "events are sorted by time");
    if (ev.npc) assert.ok(names.has(ev.npc), `Day Book event references a real resident: ${ev.npc}`);
  }
  for (const marker of ["User", "TOTOPOTUS", "CREATOR", "The Kernel", "Meowie Wowie"]) {
    assert.ok(names.has(marker), `landmark resident present: ${marker}`);
  }

  assert.match(html, /<title>Harshal's Palace — An Average Day<\/title>/);
  for (const id of ["palace-map", "g-npcs", "g-eye", "clock-time", "feed", "npc-card", "census", "cast", "legend", "scrub", "btn-play",
    "sky-card", "wx-line", "moon-line", "g-clouds", "g-rain", "g-fog", "g-flash", "g-aurora"]) {
    assert.ok(html.includes('id="' + id + '"'), `page element present: ${id}`);
  }
  for (const token of ["weatherFor", "moonAt(", "moonLitPathD", "activeDialogue", "aurora-grad", "cloudDrift", "rainFall", "fogDrift"]) {
    assert.ok(html.includes(token), `weather/moon machinery present: ${token}`);
  }
  assert.ok(html.includes("dialogue authored"), "the header reports the dialogue pass");
  assert.ok(html.includes("npm run palace:build"), "the page credits its generator");
  assert.ok(!html.includes("fetch(") && !html.includes("XMLHttpRequest"), "the page makes no network requests");
  for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    assert.doesNotThrow(() => new Function(match[1]), "inline page script must parse");
  }
});
