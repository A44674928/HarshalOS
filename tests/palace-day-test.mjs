import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildData, moonAtPalace, FACTIONS } from "../scripts/palace-day.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const PAGE = path.join(ROOT, "docs", "architecture", "HARSHALS-PALACE.html");
const DAY_MINUTES = 1440;
const SEVEN_SLOTS = ["|Name|", "|Role|", "|Faction|", "|Dialogue|", "|Inventory|", "|Quest|", "|Stats|"];
const STATE_CODES = new Set(["sl", "qt", "po", "ro", "lg", "wa", "kb", "ti", "un", "se"]);
const AUTHORED_NAMEPLATES = new Set(["CREATOR", "User", "Harshal's Bedroom", "Orb 2"]);
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
  assert.match(result.stdout, /matches the roster \(184 residents\)/);
});

test("palace: every bedroom nameplate on disk is a resident on the map", async () => {
  const [data, nameplates] = await Promise.all([buildData(), collectNameplates(ROOT, [])]);

  assert.equal(nameplates.length, 184, "the roster is 184 bedrooms");
  assert.equal(data.counts.total, 184, "the palace renders 184 residents");

  const onDisk = new Set(nameplates.map(file => {
    const folder = path.basename(path.dirname(file));
    return folder.startsWith("|") && folder.endsWith("|") ? folder.slice(1, -1) : folder;
  }));
  const onMap = new Set(data.npcs.map(npc => npc.name));
  assert.deepEqual([...onMap].sort(), [...onDisk].sort(), "map residents and disk nameplates must be the same set");

  for (const npc of data.npcs) {
    assert.equal(npc.nb > 0, AUTHORED_NAMEPLATES.has(npc.name), `nameplate authored status: ${npc.name}`);
    assert.ok(npc.bedroom.endsWith("/|" + npc.name + "|") || npc.bedroom.endsWith("/" + npc.name),
      `bedroom folder must be named after the resident: ${npc.bedroom}`);
    for (const prefix of STAGED_PREFIXES) {
      assert.equal(npc.bedroom.startsWith(prefix), false,
        `NPC bedroom must not sit in a staged asset directory (${prefix}): ${npc.bedroom}`);
    }
  }
  assert.equal(data.counts.authored, AUTHORED_NAMEPLATES.size);
  assert.ok(data.litany.includes("Harshal Patel"), "CREATOR's alias litany is embedded in the page data");

  const harshal = data.npcs.find(npc => npc.name === "Harshal's Bedroom");
  assert.ok(harshal, "the owner profile is present on the roster");
  assert.deepEqual(
    { wing: harshal.wing, ring: harshal.ring, faction: harshal.faction, archetype: harshal.archetype, posting: harshal.posting },
    { wing: "throne", ring: 0, faction: "throne", archetype: "user", posting: "source/Harshal's Bedroom/" },
    "Harshal's Bedroom is the owner's Ring 0 profile at Center Origin"
  );
  const orb2 = data.npcs.find(npc => npc.name === "Orb 2");
  assert.ok(orb2, "the Orb 2 display model is present on the roster");
  assert.deepEqual(
    { wing: orb2.wing, ring: orb2.ring, faction: orb2.faction, archetype: orb2.archetype, posting: orb2.posting },
    { wing: "machine-keep", ring: 2, faction: "runtime", archetype: "always-on", posting: "source/Orb 2/" },
    "Orb 2 is a Ring 2 display-only runtime model"
  );
});

test("palace: every bedroom holds all seven required profile slots", async () => {
  const data = await buildData();
  for (const npc of data.npcs) {
    const bedroomDir = path.join(ROOT, npc.bedroom);
    const files = (await readdir(bedroomDir)).filter(name => name.endsWith(".txt")).sort();
    for (const slot of SEVEN_SLOTS) {
      assert.ok(files.includes(slot + ".txt"), `bedroom must hold the ${slot} profile token: ${npc.bedroom}`);
    }
  }
});

test("palace: every bedroom's |Dialogue|.txt is authored and well-formed", async () => {
  const data = await buildData();
  const tags = new Set(["morning", "noon", "evening", "night"]);
  assert.equal(data.counts.dialogued, 184, "all 184 residents have authored dialogue");
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

test("palace: the remaining five profile slots are authored, well-formed, and embedded", async () => {
  const data = await buildData();
  assert.equal(data.counts.profiled, 184, "all 184 bedrooms are fully profiled");
  const factionNames = new Set(Object.values(FACTIONS).map(f => f.name));
  const factionCanons = new Set(Object.values(FACTIONS).map(f => f.canon));
  for (const npc of data.npcs) {
    /* |Role|.txt — title + posting line */
    const roleLines = (await readFile(path.join(ROOT, npc.bedroom, "|Role|.txt"), "utf8")).split(/\r?\n/).filter(l => l.trim());
    assert.equal(roleLines.length, 2, `role file is two lines: ${npc.name}`);
    assert.ok(roleLines[0].length >= 4 && roleLines[0].length <= 80, `role title length: ${npc.name}`);
    assert.equal(roleLines[1], "Posting: " + npc.posting, `role posting line matches the classified posting: ${npc.name}`);
    assert.equal(npc.role, roleLines[0], `page role is the file's title: ${npc.name}`);

    /* |Faction|.txt — faction, canonical Path color, ring/wing */
    const factionLines = (await readFile(path.join(ROOT, npc.bedroom, "|Faction|.txt"), "utf8")).split(/\r?\n/).filter(l => l.trim());
    assert.equal(factionLines.length, 3, `faction file is three lines: ${npc.name}`);
    assert.ok(factionNames.has(factionLines[0]), `faction name is canonical: ${npc.name} (${factionLines[0]})`);
    assert.ok(factionCanons.has(factionLines[1]), `faction color is canonical: ${npc.name} (${factionLines[1]})`);
    assert.match(factionLines[2], /^Ring \d · /, `faction ring line: ${npc.name}`);

    /* |Inventory|.txt — 2–4 items */
    const invLines = (await readFile(path.join(ROOT, npc.bedroom, "|Inventory|.txt"), "utf8")).split(/\r?\n/).filter(l => l.trim());
    assert.ok(invLines.length >= 2 && invLines.length <= 4, `2–4 inventory items: ${npc.name} (${invLines.length})`);
    for (const item of invLines) assert.ok(item.length >= 2 && item.length <= 90, `inventory item length: ${npc.name}`);
    assert.deepEqual(npc.inv, invLines, `page inventory matches disk: ${npc.name}`);

    /* |Quest|.txt — title + hook */
    const questLines = (await readFile(path.join(ROOT, npc.bedroom, "|Quest|.txt"), "utf8")).split(/\r?\n/).filter(l => l.trim());
    assert.equal(questLines.length, 2, `quest file is two lines: ${npc.name}`);
    assert.ok(questLines[0].length >= 4 && questLines[0].length <= 80, `quest title length: ${npc.name}`);
    assert.ok(questLines[1].length >= 10 && questLines[1].length <= 140, `quest hook length: ${npc.name}`);
    assert.equal(npc.quest.title, questLines[0], `page quest title matches disk: ${npc.name}`);
    assert.equal(npc.quest.hook, questLines[1], `page quest hook matches disk: ${npc.name}`);

    /* |Stats|.txt — line 1 recomputed from the schedule, line 2 a signature stat */
    const statLines = (await readFile(path.join(ROOT, npc.bedroom, "|Stats|.txt"), "utf8")).split(/\r?\n/).filter(l => l.trim());
    assert.equal(statLines.length, 2, `stats file is two lines: ${npc.name}`);
    const totals = {};
    for (const [t0, t1, state] of npc.sched) totals[state] = (totals[state] || 0) + (t1 - t0);
    const fmt = min => { const h = Math.floor(min / 60), m = min % 60; return h === 0 ? m + "m" : m === 0 ? h + "h" : h + "h " + m + "m"; };
    const keyMap = { po: "Post", wa: "Watch", ro: "Rounds", lg: "Meals", qt: "Quarters", sl: "Sleep", kb: "Keyboard", ti: "Timeless", un: "Unseen", se: "Sealed" };
    const order = ["Post", "Watch", "Keyboard", "Rounds", "Meals", "Quarters", "Sleep", "Timeless", "Unseen", "Sealed"];
    const expected = order.filter(k => Object.entries(totals).some(([st, min]) => keyMap[st] === k && min > 0))
      .map(k => k + "|" + fmt(Object.entries(totals).reduce((a, [st, min]) => keyMap[st] === k ? a + min : a, 0)))
      .join(" · ");
    assert.equal(statLines[0], expected, `stats line 1 is recomputed from the resident's actual schedule: ${npc.name}`);
    assert.match(statLines[1], /\|/, `signature stat is a key|value pair: ${npc.name}`);
    assert.deepEqual(npc.stats, statLines, `page stats match disk: ${npc.name}`);

    /* slot byte counts embedded for the character sheet */
    for (const key of ["role", "faction", "dialogue", "inventory", "quest", "stats"]) {
      assert.ok(npc.slots[key] > 0, `slot byte count embedded (${key}): ${npc.name}`);
    }
    assert.equal(npc.slots.name > 0, AUTHORED_NAMEPLATES.has(npc.name),
      `nameplate byte count is recorded for authored source and CREATOR profiles: ${npc.name}`);
  }
  const totopotus = data.npcs.find(npc => npc.name === "TOTOPOTUS");
  assert.equal(totopotus.role, "Sovereign of the Alphabet Throne", "TOTOPOTUS's curated role title");
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
  assert.equal(data.npcs.length, 184);
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
  for (const marker of ["User", "Harshal's Bedroom", "Orb 2", "TOTOPOTUS", "CREATOR", "The Kernel", "Meowie Wowie"]) {
    assert.ok(names.has(marker), `landmark resident present: ${marker}`);
  }

  assert.match(html, /<title>Harshal's Palace — An Average Day<\/title>/);
  for (const id of ["palace-map", "g-npcs", "g-eye", "clock-time", "feed", "npc-card", "census", "cast", "legend", "scrub", "btn-play",
    "sky-card", "wx-line", "moon-line", "g-clouds", "g-rain", "g-fog", "g-flash", "g-aurora"]) {
    assert.ok(html.includes('id="' + id + '"'), `page element present: ${id}`);
  }
  for (const token of ["weatherFor", "moonAt(", "moonLitPathD", "activeDialogue", "aurora-grad", "cloudDrift", "rainFall", "fogDrift", "inv-item", "quest-title", "stat-line", "fully profiled"]) {
    assert.ok(html.includes(token), `weather/moon machinery present: ${token}`);
  }
  assert.ok(html.includes("fully profiled"), "the header reports the profile pass");
  assert.ok(html.includes("npm run palace:build"), "the page credits its generator");
  assert.ok(!html.includes("fetch(") && !html.includes("XMLHttpRequest"), "the page makes no network requests");
  for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    assert.doesNotThrow(() => new Function(match[1]), "inline page script must parse");
  }
});
