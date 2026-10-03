/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Harshal's Palace: an average day, rendered.

   Why this exists: the |User|-centric superstructure already describes
   the repository as a castle — one center, six rings, wings of NPC
   bedrooms (see docs/architecture/USER-CENTRIC-SUPERSTRUCTURE.md and
   docs/architecture/NPC-CODEX.md). This script turns that map into a
   single self-contained HTML page, "Harshal's Palace — An Average
   Day", so the castle can be *watched*: an eye-in-the-sky diorama of
   all `|Name|.txt` residents going about a deterministic average day.

   Everything is derived from the live roster on disk:
     · every bedroom (a folder containing |Name|.txt) becomes a
       resident dot on the map, placed in its wing;
     · every resident gets a stable daily schedule (sleep, post,
       watch, rounds, meals at the Interstellar Lounge) derived from
       a seeded hash of their name — the "average" day is the same
       every run, per resident, forever;
     · CREATOR's |Name|.txt is the only authored nameplate in the
       castle (511 bytes of aliases); it is read and embedded. Every
       other slot stays zero bytes — this visualization never writes
       profile content, it only shows the schema.

   Determinism: the script is a replicator (REPLICATOR GRAY). No
   timestamps, no randomness beyond seeded PRNGs, sorted traversal.
   `node scripts/palace-day.mjs` writes the page;
   `node scripts/palace-day.mjs --check` verifies the committed page
   is byte-identical to a fresh render (used by tests/palace-day-test.mjs).

   The output lives in docs/architecture/ which is NOT part of the
   .site-assets browser allowlist, so the palace never ships in the
   deployed site bundle.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const OUT_PATH = path.join(ROOT, "docs", "architecture", "HARSHALS-PALACE.html");
const DAY_MINUTES = 1440;

/* ── Deterministic helpers ─────────────────────────────────────── */

function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* mulberry32 — seeded, stable PRNG */
function prng(seedStr) {
  let a = hash32(seedStr);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ── Canonical Path palette (display tints for wings & factions) ── */

const PAL = {
  eye: "#a86bff", // ALL-SEEING EYE PURPLE
  visionRed: "#ff3b57", // VISION RED
  day: "#f2ede2", // DAY WHITE
  cyan: "#35d9e8", // CONVERGENCE CYAN
  horizon: "#ff9540", // ETERNAL HORIZON ORANGE
  moon: "#ffd94a", // MOON YELLOW
  luck: "#d5a8ff", // LUCK AND CAPSULE NUMBER SET
  storm: "#4f8dff", // STORM BLUE
  balance: "#3ddc84", // BALANCE GREEN
  gray: "#9aa3ad", // REPLICATOR GRAY
  acid: "#9dff2e", // DEATH ACID
  voidGray: "#8b93a7", // VOID BLACK (inhabited shade)
  mirror: "#b9c2cc", // mirror silver
  ember: "#ff5e2b", // ember shade of the horizon
  gold: "#ffe9a3" // lighter-gold shade of moon yellow
};

const FACTIONS = {
  throne: { name: "The Throne", color: PAL.eye, canon: "ALL-SEEING EYE PURPLE" },
  gate: { name: "The Gate", color: PAL.visionRed, canon: "VISION RED" },
  runtime: { name: "Runtime Crew", color: PAL.day, canon: "DAY WHITE" },
  library: { name: "Library Staff", color: PAL.cyan, canon: "CONVERGENCE CYAN" },
  auditor: { name: "Auditors", color: PAL.storm, canon: "STORM BLUE" },
  market: { name: "Assurance & Market", color: PAL.balance, canon: "BALANCE GREEN" },
  replicator: { name: "Replicators & Testers", color: PAL.gray, canon: "REPLICATOR GRAY" },
  redteam: { name: "The Red Team", color: PAL.acid, canon: "DEATH ACID" },
  court: { name: "Imperial Court", color: PAL.horizon, canon: "ETERNAL HORIZON ORANGE" },
  executive: { name: "Executive Orders", color: PAL.day, canon: "DAY WHITE" },
  mirror: { name: "Legal Mirrors", color: PAL.mirror, canon: "REPLICATOR GRAY (mirror silver)" },
  lounge: { name: "Lounge Staff", color: PAL.moon, canon: "MOON YELLOW" },
  arena: { name: "Arena Company", color: PAL.luck, canon: "LUCK AND CAPSULE NUMBER SET" },
  psyops: { name: "Psycathy Operations", color: PAL.ember, canon: "ETERNAL HORIZON ORANGE (ember)" },
  sraie: { name: "The SRAIE", color: PAL.gold, canon: "MOON YELLOW (white-gold)" },
  warfin: { name: "War & Treasury", color: PAL.balance, canon: "BALANCE GREEN" },
  service: { name: "Service Quarters", color: PAL.cyan, canon: "CONVERGENCE CYAN" },
  outerdark: { name: "The Outer Dark", color: PAL.voidGray, canon: "VOID BLACK" },
  quarantine: { name: "Death Acid Quarantine", color: PAL.acid, canon: "DEATH ACID" }
};

/* ── Wings (map placement) ─────────────────────────────────────── */

const WING_DEFS = [
  /* inner rings — concentric, in ring order */
  { id: "throne", ring: 0, name: "The Keep", tint: PAL.eye, blurb: "The pupil. |User|'s origin sector — every address in the palace is measured from this room." },
  { id: "iris-gate", ring: 1, name: "The Iris Gate", tint: PAL.visionRed, blurb: "The decision gate. Permit | Refuse — nothing passes the iris without a stamp." },
  { id: "machine-keep", ring: 2, name: "The Machine Keep", tint: PAL.day, blurb: "The runtime crew. The keep never fully sleeps; the flames are tended in shifts." },
  { id: "great-library", ring: 3, name: "The Great Library", tint: PAL.cyan, blurb: "The Book — 42 volumes, seven collections, one narrator." },
  { id: "observatory", ring: 4, name: "The Observatory & Works", tint: PAL.storm, blurb: "Audits, assurance, and the replicator works. From here the eye looks at things." },
  /* outer bailey — angular sectors, clockwise from north */
  { id: "imperial-court", ring: 5, name: "The Imperial Court", tint: PAL.horizon, blurb: "TOTOPOTUS's household — the ministries of the Alphabet Throne." },
  { id: "eo-wing", ring: 5, name: "Executive Orders Wing", tint: PAL.day, blurb: "Eight signing officers, their pens, and their vetoes." },
  { id: "legal-mirrors", ring: 5, name: "The Legal Mirrors", tint: PAL.mirror, blurb: "Clerk-duplicates of the EO wing, filed under the Legal Directory." },
  { id: "lounge", ring: 5, name: "The Interstellar Lounge", tint: PAL.moon, blurb: "Inn, restaurant, fourteen services, and the ten color-coded passes." },
  { id: "arena", ring: 5, name: "The Dueling Arena (META)", tint: PAL.luck, blurb: "Founders, owners, slopes, thunderdomes, records — and the summons server." },
  { id: "psyops", ring: 5, name: "Psycopathy Operations", tint: PAL.ember, blurb: "Clown college, corporations, paintelephones, and one untitled folder." },
  { id: "sraie", ring: 5, name: "The SRAIE", tint: PAL.gold, blurb: "Emperor HP's cadre — CREATOR, the Lighters, Orphans, Telepaths, and the Unseen." },
  { id: "war-fin", ring: 5, name: "War Declaration & Treasury", tint: PAL.balance, blurb: "The Whyland Standard and its financial entities." },
  { id: "service", ring: 5, name: "The Service Quarters", tint: PAL.cyan, blurb: "Body parts, flames, scribes, sorting, and the disclaimers." },
  /* beyond the outer flame */
  { id: "outer-dark", ring: 6, name: "The Outer Dark", tint: PAL.voidGray, blurb: "Archives past the outer flame — curators, one quarantine warden, three familiars. Nothing here is served; nothing here is lost." }
];

const WINGS_BY_ID = Object.fromEntries(WING_DEFS.map(w => [w.id, w]));

/* ── Roster collection ─────────────────────────────────────────── */

const SKIP_DIRS = new Set(["node_modules", ".git", ".site-assets", ".wrangler", "__pycache__", ".github"]);

async function walk(dir, out) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) await walk(path.join(dir, entry.name), out);
      continue;
    }
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (entry.isFile() && entry.name === "|Name|.txt") out.push(full);
  }
}

async function collectBedrooms() {
  const found = [];
  await walk(ROOT, found);
  const bedrooms = [];
  for (const nameplate of found.sort()) {
    const bedroomDir = path.dirname(nameplate);
    const folder = path.basename(bedroomDir);
    const name = folder.startsWith("|") && folder.endsWith("|") ? folder.slice(1, -1) : folder;
    const info = await stat(nameplate);
    const postingDir = path.dirname(bedroomDir);
    bedrooms.push({
      name,
      nameplateBytes: info.size,
      bedroom: path.relative(ROOT, bedroomDir).split(path.sep).join("/"),
      postingFolder: path.relative(ROOT, postingDir).split(path.sep).join("/")
    });
  }
  return bedrooms;
}

/* ── Star residents: curated facts for named NPCs ──────────────── */
/* Anything not listed here is classified by posting path rules below. */

const ROSTERED_STAFF = {
  "The Magistrate": { ring: 1, posting: "specs/normative/", role: "Keeper of the ratified baseline; refuses to let drafts pass as law" },
  "The Contradiction Ledger Keeper": { ring: 1, posting: "specs/normative/contradictions.md", role: "Clerk of the contradictions ledger; logs every CL entry" },
  "The Amendment Scribe": { ring: 1, posting: "specs/draft/", role: "Caretaker of unratified amendments; wears a different sash" },
  "Boot": { ring: 2, posting: "js/boot.js", role: "Boots the kernel, mounts the window manager" },
  "The Kernel": { ring: 2, posting: "js/kernel.js", role: "Executes the Permit/Refuse decision gate" },
  "The Window Manager": { ring: 2, posting: "js/wm.js", role: "Draws the desktop; arranges icons on the grid" },
  "The Flame Tender": { ring: 2, posting: "assets/flame/", role: "Advances the 120-frame inner flame" },
  "The Orb Weaver": { ring: 2, posting: "assets/orb/", role: "Advances the 200-frame iris animation" },
  "The Outer Flame Warden": { ring: 2, posting: "assets/outer_flame/", role: "Advances the 600-frame outer corona" },
  "The OCM Operator": { ring: 2, posting: "js/ocm-*.js", role: "Routes messages along the Resolution Axis" },
  "The Timekeeper": { ring: 2, posting: "js/uts.js", role: "Drives the display-only UTS clock" },
  "The Moon Watcher": { ring: 2, posting: "js/celestial-context.js", role: "Approximate Moon/Sun readouts, display-only" },
  "The Librarian": { ring: 3, posting: "docs/harshal-systems/", role: "Curates the 42-file reference library" },
  "The Core Book Reader": { ring: 3, posting: "docs/harshal-systems/01-core-book.md", role: "Turns the pages of Part I" },
  "The Manuscript Narrator": { ring: 3, posting: "manuscript/the-grand-river-foundation/", role: "Reads chapters 00–08 for the Novel tab" },
  "The Publications Printer": { ring: 3, posting: "publications/", role: "Compiles .docx / assembled .md editions" },
  "The Editor": { ring: 3, posting: "docs/harshal-systems/EDITORIAL-REPORT.md", role: "Maintains the Editorial Report between builds" },
  "The Assurance Verifier": { ring: 4, faction: "auditor", posting: "js/good-intelligence-assurance.js", role: "Runs the Good Intelligence assurance sweep" }
};

const STAR_NOTES = {
  "User": "The eye at the center. Every address in the palace is measured from this room.",
  "The Kernel": "Permit. Refuse. Permit. Refuse. It is always exactly one of these.",
  "Boot": "First awake, always. Nothing else in the keep may start before Boot says so.",
  "The Window Manager": "Rearranges everyone's furniture overnight. Nobody is permitted to complain.",
  "The Flame Tender": "Advances frames 1 through 120 and back, forever. The hearth must not gutter.",
  "The Orb Weaver": "Threads 200 frames of iris per shift. Do not touch the loom.",
  "The Outer Flame Warden": "Walks the 600-frame corona at dusk. It is a long walk; pack accordingly.",
  "The OCM Operator": "Routes every message the short way: inward first, then resolved.",
  "The Timekeeper": "Ticks. Display-only, never authority. Ticks anyway.",
  "The Moon Watcher": "Approximate, display-only — and on shift all night anyway.",
  "The LLM Relay": "Carries every word to the models and never once keeps a key.",
  "The Storage Attendant": "Handles the optional cloud storage. Will remind you it is optional.",
  "The Magistrate": "Refuses to let a draft pass as law. This cannot be appealed.",
  "The Contradiction Ledger Keeper": "Logs CL-001 through CL-014. Hopes, quietly, for CL-015.",
  "The Amendment Scribe": "Wears the unratified sash. It is a *different* sash. People forget.",
  "The Librarian": "Curates 42 volumes and knows where every one of them is.",
  "The Core Book Reader": "Turns exactly one page per read. No skipping.",
  "The Manuscript Narrator": "Reads chapters 00–08 aloud to the Novel tab each evening.",
  "The Publications Printer": "Compiles the .docx editions. The outside world gets printouts.",
  "The Editor": "Maintains the Editorial Report between builds. It is never done.",
  "The Assurance Verifier": "Sweeps the afternoon. Balance Green holds — for now.",
  "TOTOPOTUS": "Holds the Alphabet Throne. The court's ministries all answer here.",
  "The Insult Auditor": "Audits the question. The question is filed. No further comment.",
  "The Bandwidth Referee": "At 12:30, the daily trial: is your internet faster? It usually is not.",
  "The Ultra Fast Judge": "Clears the docket in one motion. Appeals arrive faster than verdicts.",
  "The Jurisdictional Refuser": "The referenced courtroom is stinky, piss-scented, and firmly not attended.",
  "CREATOR": "The only authored nameplate in the palace — 511 bytes of aliases.",
  "The Inkeeper": "The hearth never fully goes out. 04:00 is 'low', not 'out'.",
  "The Chef": "Second seating at 18:00 sharp. The court signs for seconds.",
  "The Designated Survivor": "Sealed all day. That is the job. Especially during ceremonies.",
  "The White House Sitter": "Watches the White House Actual. The Actual rarely watches back.",
  "Meowie Wowie": "Sleeps sixteen of twenty-four hours, on average. Zoomies at dawn.",
  "Johnny Chimpo": "Somewhere between the War Game dice and the paintelephone. Chaotic.",
  "Repeater": "Does now what it was doing an hour ago. Always has.",
  "The Red Team Adversary": "Probes at 03:00 and 15:00. Everything refused so far — today included.",
  "The Duplicate Quarantine Warden": "Counts the surplus copies at 23:00. All hashes accounted for.",
  "The Federal Reserve Chair": "Takes the 06:30 briefing before the market opens.",
  "The Doge of the Treasury": "Audits a meme at 16:30. The meme survives.",
  "The Thunderdome Master": "Two enter. The Results Ledger records. The Summons Server served.",
  "The Hyper Mage": "The midnight circle runs 00:00–03:00. Do not knock.",
  "The Unseen Agent": "Unseen. Briefly seen at 03:00, by accident, once.",
  "The Senior Telepath": "Opens the night parlor at 20:30. Please think quietly.",
  "The Storm Watcher": "Watches the Storm-0558 sky all night. Tonight, again, quiet.",
  "The Supply Chain Inspector": "Inspects the documentation of the documentation.",
  "The Market Tickerbot": "Reads the open at 06:30. Display-only; refreshes anyway.",
  "The Palantir Seer": "Watches. The Shadow Hand is not watched back.",
  "The Shadow Hand": "Officially not in this wing. Officially not in any wing.",
  "The Veto Clerk": "Stamps NO faster than the Ultra Fast Judge can rule.",
  "The Wag The Dog Spin Doctor": "Rehearses the afternoon distraction before lunch.",
  "The Censor": "Redacts the Redactor's rough drafts, on principle.",
  "The Redactor": "Files the [                    ] and leaves the [        ] alone.",
  "The Lorekeeper": "Remembers the myth that the Cartographer has not mapped yet.",
  "The Imperial Cartographer": "The map is the territory. The territory keeps moving.",
  "The Prison Warden": "The containment system is private. That is rather the point.",
  "The Frost Mourne Captain": "Runs the coldest route in the empire, on schedule, without feelings.",
  "The Swordsmith of Anduril": "Reforges the same blade daily. It is never broken; this is practice.",
  "The Purist Flame Tender": "Keeps the no-plugins flame at dawn. Nothing else is allowed in it.",
  "The Fiction Flame Tender": "Tends the novel flame at dusk. It burns exactly as written.",
  "The Plugin Flame Tender": "Keeps the plugin flame overnight, and an eye on the wall socket.",
  "The Parts Scribe": "Writes 04:30–09:30, before the palace wakes and wants things.",
  "The Story Scribe": "Writes the story parts in story order, which is not page order.",
  "The Whyland Standard Bearer": "Carries the Standard. The Standard is heavy with companies.",
  "The Paintelephone Operator WA1111-N": "On the line. Has always been on the line.",
  "The Untitled Entity": "Lives in the untitled folder. Declines a title, repeatedly.",
  "The Clown Provost": "Actually good alignment begins with actually showing up to class.",
  "The Simultaneous Jobs Dispatcher": "Runs every job at once, on average, which is the average day.",
  "The Sorter Apprentice": "Triages the day's arrivals: documents, stuff, and things that are both.",
  "The God Ull Arbiter": "Rules on Ull matters. The N*Ull slots remain sealed.",
  "The Ice Bourne Gauntlet Warden": "The gauntlet is thrown, caught, and thrown again before breakfast."
};

const WING_NOTES = {
  throne: "The eye at the center of everything.",
  "iris-gate": "Bars the gate at dusk, unbars it at first light.",
  "machine-keep": "The keep never fully sleeps.",
  "great-library": "Quiet hours are all hours; the sign says so twice.",
  observatory: "Measures twice, verifies once, files the measurement.",
  "imperial-court": "Signs, stamps, files. The ministry runs on ceremony and checkbook ink.",
  "eo-wing": "Office hours 09:00–17:00. The pen is mightier than the veto, but only just.",
  "legal-mirrors": "Files a perfect copy by 16:00. The original is notified by post.",
  lounge: "Service with a smile and a color-coded pass.",
  arena: "Trains by morning, duels by appointment, records by night.",
  psyops: "Operational. Nocturnal. Occasionally funny on purpose.",
  sraie: "The Emperor's cadre keeps its own hours.",
  "war-fin": "Markets open 06:30. Everything else is a briefing.",
  service: "Keeps the palace's parts, papers, and disclaimers in order.",
  "outer-dark": "Keeps what is kept. Nothing here is served; nothing here is lost."
};

/* ── Classification ────────────────────────────────────────────── */

function classify(npc) {
  /* normalize to a trailing slash so "/Wing/" includes() match end-of-path too */
  const p = npc.postingFolder.endsWith("/") ? npc.postingFolder : npc.postingFolder + "/";
  const name = npc.name;

  if (name === "User") {
    return { wing: "throne", ring: 0, faction: "throne", archetype: "user", role: "The player at the keyboard — the human key at Center Origin", posting: "source/|User|/" };
  }
  if (npc.bedroom.startsWith("docs/architecture/npcs/")) {
    const staff = ROSTERED_STAFF[name];
    if (!staff) throw new Error("Unmapped rostered staff NPC: " + name);
    const wing = staff.ring === 1 ? "iris-gate" : staff.ring === 2 ? "machine-keep" : staff.ring === 3 ? "great-library" : "observatory";
    const faction = staff.ring === 1 ? "gate" : staff.ring === 2 ? "runtime" : staff.ring === 3 ? "library" : "auditor";
    const archetype = staff.ring === 1 ? "gatekeeper"
      : name === "The Kernel" ? "always-on"
      : name === "The Timekeeper" ? "timekeeper"
      : name === "The Moon Watcher" ? "night-watch"
      : name === "The Flame Tender" ? "flame-inner"
      : name === "The Orb Weaver" ? "flame-orb"
      : name === "The Outer Flame Warden" ? "flame-outer"
      : staff.ring === 2 ? "runtime-shift"
      : staff.ring === 3 ? "library"
      : "auditor";
    return { wing, ring: staff.ring, faction, archetype, role: staff.role, posting: staff.posting };
  }

  if (name === "The LLM Relay") return { wing: "machine-keep", ring: 2, faction: "runtime", archetype: "runtime-shift", role: "Relays free-tier model traffic; never stores keys", posting: "worker/llm-relay.mjs" };
  if (name === "The Storage Attendant") return { wing: "machine-keep", ring: 2, faction: "runtime", archetype: "runtime-shift", role: "Handles optional cloud-storage APIs", posting: "worker/storage.mjs" };
  if (name === "The Market Tickerbot") return { wing: "observatory", ring: 4, faction: "market", archetype: "market", role: "Reads the market context feed; display-only", posting: "worker/" };
  if (name === "The Supply Chain Inspector") return { wing: "observatory", ring: 4, faction: "auditor", archetype: "auditor", role: "Inspects the Storm-0558 supply-chain bundle", posting: "archives/Supply Chain/Documentation/" };

  if (p.startsWith("tests/")) return { wing: "observatory", ring: 4, faction: name === "The Red Team Adversary" ? "redteam" : "replicator", archetype: name === "The Red Team Adversary" ? "red-team" : "replicator", role: name === "The Red Team Adversary" ? "Runs the adversarial probes; every refusal held" : "Runs the 44-test gauntlet", posting: "tests/" };
  if (p.startsWith("scripts/pine/")) return { wing: "observatory", ring: 4, faction: "market", archetype: "replicator", role: name === "The Moon Phases Scribe" ? "Keeps the archived Moon script" : "Archives the Pine market scripts", posting: "scripts/pine/" };
  if (p.startsWith("scripts/")) return { wing: "observatory", ring: 4, faction: "replicator", archetype: "replicator", role: "Deterministic build tooling — re-runnable, every time", posting: "scripts/" };
  if (p.startsWith("migrations/")) return { wing: "observatory", ring: 4, faction: "replicator", archetype: "replicator", role: "Shapes the community database", posting: "migrations/community/" };
  if (p.startsWith("case-studies/")) return { wing: "observatory", ring: 4, faction: "auditor", archetype: "auditor", role: name === "The Badge Engraver" ? "Engraves the PDH-R badges" : name === "The D1 Seed Sower" ? "Sows the generated D1 register seed" : "Keeps the Ground-0 audit ledger", posting: p };
  if (p.startsWith("updates/")) return { wing: "observatory", ring: 4, faction: "auditor", archetype: "night-watch", role: "Files the dated observation snapshots", posting: p };
  if (p.startsWith("research/")) return { wing: "observatory", ring: 4, faction: "auditor", archetype: "auditor", role: "Keeps the research reports", posting: p };

  if (p.startsWith("archives/Duplicates/")) return { wing: "outer-dark", ring: 6, faction: "quarantine", archetype: "curator", role: "Guards the quarantined byte-identical copies", posting: p };
  if (p.startsWith("archives/")) {
    if (name === "Meowie Wowie") return { wing: "outer-dark", ring: 6, faction: "outerdark", archetype: "familiar-cat", role: "Familiar of the Time Gainer", posting: p };
    if (name === "Johnny Chimpo") return { wing: "outer-dark", ring: 6, faction: "outerdark", archetype: "familiar-monkey", role: "Familiar of the Time Gainer", posting: p };
    if (name === "Repeater") return { wing: "outer-dark", ring: 6, faction: "outerdark", archetype: "familiar-echo", role: "Echo entity of the Time Gainer", posting: p };
    if (name === "The Import Dock Master") return { wing: "outer-dark", ring: 6, faction: "outerdark", archetype: "curator", role: "Keeps the receiving dock; content graduates inward only when curated", posting: "archives/imports/" };
    return { wing: "outer-dark", ring: 6, faction: "outerdark", archetype: "curator", role: "Curates the archive — provenance without runtime", posting: p };
  }

  /* business plan wings */
  /* mirrors first: their path nests inside a ".../TOTOPOTUS's Executive Orders/" segment too */
  if (p.includes("/Legal Directory/") && name.endsWith("(Legal Mirror)")) {
    return { wing: "legal-mirrors", ring: 5, faction: "mirror", archetype: "mirror", role: "Files the clerk-duplicate of an EO officer", posting: p };
  }
  if (p.includes("/TOTOPOTUS's Executive Orders/")) {
    if (name === "The Designated Survivor") return { wing: "eo-wing", ring: 5, faction: "executive", archetype: "sealed", role: "Sealed, elsewhere, on purpose", posting: p };
    if (name === "The White House Sitter") return { wing: "eo-wing", ring: 5, faction: "executive", archetype: "sitter", role: "Sits the White House Actual", posting: p };
    return { wing: "eo-wing", ring: 5, faction: "executive", archetype: "president", role: "Signs the executive orders of record", posting: p };
  }
  if (p.includes("/InterstellarLounge/")) {
    if (name === "The Inkeeper") return { wing: "lounge", ring: 5, faction: "lounge", archetype: "innkeeper", role: "Keeps the Inn — the hearth never dies", posting: p };
    if (name === "The Chef") return { wing: "lounge", ring: 5, faction: "lounge", archetype: "chef", role: "Runs the Restaurant; two seatings daily", posting: p };
    if (name === "The Lounge Receptionist") return { wing: "lounge", ring: 5, faction: "lounge", archetype: "lounge-split", role: "Staffs Check In ANDOR Check Out", posting: p };
    if (name.endsWith("Lounge Pass Attendant")) return { wing: "lounge", ring: 5, faction: "lounge", archetype: "color-pass", role: "Checks the " + name.replace(" Lounge Pass Attendant", "").toLowerCase() + " passes at the door", posting: p };
    return { wing: "lounge", ring: 5, faction: "lounge", archetype: "lounge-split", role: "Staffs the lounge services", posting: p };
  }
  if (p.includes("/Duel History/") || p.includes("/Personal/Ethics And Morals/") || p.includes("/Evil Bad Data Collection Logs")) {
    const arenaRoles = {
      "The Beginners Slope Marshall": "Marshals the Beginners Slope",
      "The Thunderdome Master": "Runs the Thunderdome bouts",
      "The Metadata Keeper": "Keeps the arena METADATA",
      "The Results Ledger": "Records every result",
      "The Summons Server": "Serves the summonses",
      "The Ethics Adjudicator": "Adjudicates ethics and morals",
      "The Evil Data Log Auditor": "Audits the evil data logs and associated profits ANDOR losses"
    };
    return { wing: "arena", ring: 5, faction: "arena", archetype: name === "The Thunderdome Master" ? "thunderdome" : "arena", role: arenaRoles[name] || "Keeps the dueling records", posting: p };
  }
  if (p.includes("/Telekinetic Psycopathy Operations/")) {
    if (p.includes("/SRAIE/")) {
      const sraie = {
        "CREATOR": { archetype: "creator", role: "Author of Emperor HP — holder of the only authored nameplate" },
        "The Lead Lighter": { archetype: "always-lit", role: "Keeps the SRAIE Lighters lit" },
        "The Orphan Warden": { archetype: "orphan", role: "Wardens the SRAIE Orphans" },
        "The Senior Telepath": { archetype: "telepath", role: "Runs the SRAIE Telepaths" },
        "The Unseen Agent": { archetype: "unseen", role: "Of the SRAIE Unseen — unseen" }
      };
      const meta = sraie[name] || { archetype: "psyops", role: "Of the SRAIE" };
      return { wing: "sraie", ring: 5, faction: "sraie", archetype: meta.archetype, role: meta.role, posting: p };
    }
    return { wing: "psyops", ring: 5, faction: "psyops", archetype: name === "The Hyper Mage" ? "mage" : "psyops", role: "Operational cadre of the Psycopathy ward", posting: p };
  }
  if (p.includes("/War Declaration/")) {
    return { wing: "war-fin", ring: 5, faction: "warfin", archetype: "financial", role: "Keeps the Whyland Standard's ledger", posting: p };
  }
  if (p.includes("/Harshal's Body Parts/")) {
    if (name === "The Purist Flame Tender") return { wing: "service", ring: 5, faction: "service", archetype: "flame-dawn", role: "Keeps the no-plugins flame", posting: p };
    if (name === "The Fiction Flame Tender") return { wing: "service", ring: 5, faction: "service", archetype: "flame-dusk", role: "Keeps the fiction flame", posting: p };
    if (name === "The Plugin Flame Tender") return { wing: "service", ring: 5, faction: "service", archetype: "flame-night", role: "Keeps the plugin flame", posting: p };
    return { wing: "service", ring: 5, faction: "service", archetype: "scribe", role: "Scribes the parts and the story", posting: p };
  }
  if (p.includes("/TO SORT/")) return { wing: "service", ring: 5, faction: "service", archetype: "sorter", role: "Sorts the arrivals", posting: p };
  if (p.includes("/Disclaimer/")) return { wing: "service", ring: 5, faction: "service", archetype: "clerk", role: "Keeps the disclaimers on file", posting: p };
  if (p.includes("/Government Agencies/")) return { wing: "service", ring: 5, faction: "service", archetype: "clerk", role: "Runs the supply-chain tech demo desk", posting: p };

  if (p === "business plan/StarPortal/Access/Alphabet/TOTOPOTUS" || p.startsWith("business plan/StarPortal/Access/Alphabet/TOTOPOTUS/")) {
    const military = /Captain|Commander|Warden|Watch|Admiral|Commandant|Marshall|Shadow Hand|Prison/.test(name);
    return { wing: "imperial-court", ring: 5, faction: "court", archetype: name === "TOTOPOTUS" ? "sovereign" : military ? "military" : "court", role: null, posting: p };
  }

  throw new Error("Unclassified NPC: " + name + " at " + npc.bedroom);
}

/* ── Schedules — the average day ───────────────────────────────── */
/* State codes: sl sleep · qt quarters · po at post · ro on rounds
   lg at the lounge · wa night watch · ti timeless · un unseen
   se sealed · kb at the keyboard (|User| only)                   */

const S = (t0, t1, st) => [t0, t1, st];

function jitter(segs, amt, rng) {
  if (amt <= 0) return segs.map(s => s.slice());
  const out = [];
  for (let i = 0; i < segs.length; i++) {
    const shift = i === 0 || i === segs.length - 1 ? 0 : Math.round((rng() * 2 - 1) * amt);
    out.push([clamp(segs[i][0] + shift, 0, DAY_MINUTES), clamp(segs[i][1] + shift, 0, DAY_MINUTES), segs[i][2]]);
  }
  /* re-normalize: sort by start, then greedily stitch into contiguous 0..1440
     coverage — every segment begins where the previous one ended, so shifted
     boundaries can neither overlap nor leave holes. */
  out.sort((a, b) => a[0] - b[0]);
  const fixed = [];
  let cursor = 0;
  for (const seg of out) {
    const t1 = clamp(Math.max(seg[1], cursor), cursor, DAY_MINUTES);
    if (t1 > cursor) fixed.push([cursor, t1, seg[2]]);
    cursor = t1;
    if (cursor >= DAY_MINUTES) break;
  }
  if (cursor < DAY_MINUTES) fixed.push([cursor, DAY_MINUTES, fixed.length ? fixed[fixed.length - 1][2] : "qt"]);
  return fixed;
}

const ARCHETYPES = {
  user() {
    return [S(0, 90, "kb"), S(90, 480, "sl"), S(480, 750, "kb"), S(750, 810, "lg"), S(810, 1080, "kb"), S(1080, 1200, "qt"), S(1200, DAY_MINUTES, "kb")];
  },
  "always-on"() {
    return [S(0, DAY_MINUTES, "po")];
  },
  timekeeper() {
    return [S(0, 250, "po"), S(250, 260, "qt"), S(260, DAY_MINUTES, "po")];
  },
  "night-watch"() {
    return [S(0, 360, "wa"), S(360, 480, "qt"), S(480, 1080, "sl"), S(1080, DAY_MINUTES, "wa")];
  },
  "flame-inner"() {
    return [S(0, 330, "sl"), S(330, 420, "qt"), S(420, 840, "po"), S(840, 900, "lg"), S(900, 1260, "po"), S(1260, DAY_MINUTES, "sl")];
  },
  "flame-orb"() {
    return [S(0, 570, "sl"), S(570, 660, "qt"), S(660, 1080, "po"), S(1080, 1150, "lg"), S(1150, DAY_MINUTES, "qt")];
  },
  "flame-outer"() {
    return [S(0, 90, "wa"), S(90, 420, "sl"), S(420, 540, "qt"), S(540, 1050, "po"), S(1050, 1110, "lg"), S(1110, DAY_MINUTES, "wa")];
  },
  "runtime-shift"(rng) {
    const variant = Math.floor(rng() * 3);
    if (variant === 0) return [S(0, 300, "sl"), S(300, 360, "qt"), S(360, 840, "po"), S(840, 900, "lg"), S(900, 1290, "po"), S(1290, DAY_MINUTES, "sl")];
    if (variant === 1) return [S(0, 510, "sl"), S(510, 600, "qt"), S(600, 780, "po"), S(780, 840, "lg"), S(840, 1320, "po"), S(1320, DAY_MINUTES, "sl")];
    return [S(0, 240, "po"), S(240, 300, "lg"), S(300, 330, "po"), S(330, 960, "sl"), S(960, 1020, "qt"), S(1020, DAY_MINUTES, "po")];
  },
  gatekeeper() {
    return [S(0, 270, "sl"), S(270, 330, "qt"), S(330, 810, "po"), S(810, 870, "lg"), S(870, 960, "po"), S(960, 1230, "qt"), S(1230, DAY_MINUTES, "sl")];
  },
  library() {
    return [S(0, 510, "sl"), S(510, 570, "qt"), S(570, 840, "po"), S(840, 900, "lg"), S(900, 1050, "po"), S(1050, 1110, "lg"), S(1110, 1170, "po"), S(1170, DAY_MINUTES, "sl")];
  },
  auditor(rng) {
    return jitter([S(0, 570, "sl"), S(570, 660, "qt"), S(660, 900, "po"), S(900, 960, "lg"), S(960, 1140, "po"), S(1140, 1200, "qt"), S(1200, DAY_MINUTES, "sl")], 0, rng);
  },
  "red-team"() {
    return [S(0, 180, "sl"), S(180, 240, "ro"), S(240, 840, "sl"), S(840, 900, "qt"), S(900, 960, "ro"), S(960, 1020, "po"), S(1020, 1080, "lg"), S(1080, 1260, "qt"), S(1260, DAY_MINUTES, "sl")];
  },
  replicator(rng) {
    const rng2 = prng("replicator-build");
    void rng2;
    return jitter([S(0, 390, "sl"), S(390, 450, "po"), S(450, 720, "ro"), S(720, 780, "lg"), S(780, 1140, "po"), S(1140, DAY_MINUTES, "sl")], 0, rng);
  },
  market() {
    return [S(0, 360, "sl"), S(360, 420, "qt"), S(420, 780, "po"), S(780, 840, "lg"), S(840, 960, "po"), S(960, 1200, "qt"), S(1200, DAY_MINUTES, "sl")];
  },
  curator() {
    return [S(0, 630, "sl"), S(630, 660, "qt"), S(660, 1020, "po"), S(1020, 1080, "lg"), S(1080, 1170, "po"), S(1170, DAY_MINUTES, "sl")];
  },
  sovereign() {
    return [S(0, 420, "sl"), S(420, 600, "qt"), S(600, 960, "po"), S(960, 1050, "lg"), S(1050, 1200, "qt"), S(1200, 1380, "po"), S(1380, DAY_MINUTES, "qt")];
  },
  court(rng) {
    return jitter([S(0, 390, "sl"), S(390, 480, "qt"), S(480, 720, "po"), S(720, 780, "lg"), S(780, 1020, "po"), S(1020, 1110, "lg"), S(1110, 1380, "qt"), S(1380, DAY_MINUTES, "sl")], 20, rng);
  },
  military(rng) {
    const night = rng() < 0.45;
    if (night) return jitter([S(0, 300, "wa"), S(300, 360, "lg"), S(360, 1020, "sl"), S(1020, 1080, "qt"), S(1080, DAY_MINUTES, "wa")], 25, rng);
    return jitter([S(0, 300, "sl"), S(300, 360, "qt"), S(360, 720, "po"), S(720, 780, "ro"), S(780, 1080, "po"), S(1080, 1140, "lg"), S(1140, 1380, "wa"), S(1380, DAY_MINUTES, "sl")], 25, rng);
  },
  president() {
    return [S(0, 510, "sl"), S(510, 540, "qt"), S(540, 780, "po"), S(780, 830, "lg"), S(830, 1020, "po"), S(1020, 1080, "qt"), S(1080, 1140, "lg"), S(1140, 1380, "qt"), S(1380, DAY_MINUTES, "sl")];
  },
  sealed() {
    return [S(0, DAY_MINUTES, "se")];
  },
  sitter() {
    return [S(0, 180, "po"), S(180, 240, "sl"), S(240, DAY_MINUTES, "po")];
  },
  mirror() {
    return [S(0, 570, "sl"), S(570, 600, "qt"), S(600, 960, "po"), S(960, 1140, "qt"), S(1140, DAY_MINUTES, "sl")];
  },
  innkeeper() {
    return [S(0, 240, "po"), S(240, 300, "qt"), S(300, DAY_MINUTES, "po")];
  },
  chef() {
    return [S(0, 290, "qt"), S(290, 780, "po"), S(780, 810, "lg"), S(810, 1260, "po"), S(1260, DAY_MINUTES, "qt")];
  },
  "lounge-split"(rng) {
    const early = rng() < 0.5;
    if (early) return [S(0, 300, "sl"), S(300, 360, "qt"), S(360, 780, "po"), S(780, 840, "lg"), S(840, 1320, "po"), S(1320, DAY_MINUTES, "qt")];
    return [S(0, 510, "sl"), S(510, 570, "qt"), S(570, 1020, "po"), S(1020, 1050, "lg"), S(1050, 1320, "po"), S(1320, DAY_MINUTES, "sl")];
  },
  "color-pass"() {
    return [S(0, 450, "sl"), S(450, 480, "qt"), S(480, 780, "po"), S(780, 820, "lg"), S(820, 1080, "po"), S(1080, 1120, "lg"), S(1120, 1200, "po"), S(1200, DAY_MINUTES, "qt")];
  },
  arena(rng) {
    return jitter([S(0, 420, "sl"), S(420, 540, "qt"), S(540, 660, "po"), S(660, 780, "ro"), S(780, 840, "lg"), S(840, 1140, "po"), S(1140, 1320, "qt"), S(1320, DAY_MINUTES, "sl")], 20, rng);
  },
  thunderdome() {
    return [S(0, 420, "sl"), S(420, 660, "po"), S(660, 780, "ro"), S(780, 840, "lg"), S(840, 1140, "po"), S(1140, 1260, "po"), S(1260, DAY_MINUTES, "sl")];
  },
  psyops() {
    return [S(0, 270, "po"), S(270, 300, "lg"), S(300, 810, "sl"), S(810, 900, "qt"), S(900, 1440, "po")];
  },
  mage() {
    return [S(0, 180, "po"), S(180, 270, "lg"), S(270, 810, "sl"), S(810, 1200, "qt"), S(1200, DAY_MINUTES, "po")];
  },
  creator() {
    return [S(0, DAY_MINUTES, "ti")];
  },
  "always-lit"() {
    return [S(0, DAY_MINUTES, "po")];
  },
  orphan() {
    return [S(0, 450, "sl"), S(450, 540, "qt"), S(540, 840, "po"), S(840, 900, "lg"), S(900, 1080, "po"), S(1080, DAY_MINUTES, "qt")];
  },
  telepath() {
    return [S(0, 270, "po"), S(270, 300, "lg"), S(300, 780, "sl"), S(780, 870, "qt"), S(870, DAY_MINUTES, "po")];
  },
  unseen() {
    return [S(0, 180, "un"), S(180, 200, "po"), S(200, DAY_MINUTES, "un")];
  },
  financial() {
    return [S(0, 330, "sl"), S(330, 390, "qt"), S(390, 780, "po"), S(780, 840, "lg"), S(840, 930, "po"), S(930, 1200, "qt"), S(1200, DAY_MINUTES, "sl")];
  },
  "flame-dawn"() {
    return [S(0, 240, "sl"), S(240, 570, "po"), S(570, 630, "lg"), S(630, 840, "po"), S(840, DAY_MINUTES, "qt")];
  },
  "flame-dusk"() {
    return [S(0, 570, "sl"), S(570, 660, "qt"), S(660, 1110, "po"), S(1110, 1170, "lg"), S(1170, DAY_MINUTES, "po")];
  },
  "flame-night"() {
    return [S(0, 1020, "po"), S(1020, 1080, "lg"), S(1080, DAY_MINUTES, "po")];
  },
  scribe() {
    return [S(0, 270, "sl"), S(270, 570, "po"), S(570, 630, "lg"), S(630, 720, "po"), S(720, 1080, "qt"), S(1080, 1140, "lg"), S(1140, DAY_MINUTES, "sl")];
  },
  sorter() {
    return [S(0, 480, "sl"), S(480, 540, "qt"), S(540, 1080, "po"), S(1080, 1140, "lg"), S(1140, 1260, "po"), S(1260, DAY_MINUTES, "sl")];
  },
  clerk() {
    return [S(0, 510, "sl"), S(510, 540, "qt"), S(540, 780, "po"), S(780, 840, "lg"), S(840, 1020, "po"), S(1020, DAY_MINUTES, "qt")];
  },
  "familiar-cat"() {
    return [S(0, 330, "sl"), S(330, 360, "ro"), S(360, 600, "qt"), S(600, 840, "sl"), S(840, 1140, "qt"), S(1140, 1170, "ro"), S(1170, 1200, "lg"), S(1200, DAY_MINUTES, "sl")];
  },
  "familiar-monkey"(rng) {
    const segs = [S(0, 60, "qt"), S(60, 540, "sl"), S(540, 600, "qt")];
    let cursor = 600;
    while (cursor < 1320) {
      const gap = 60 + Math.floor(rng() * 90);
      const burst = 30 + Math.floor(rng() * 40);
      const gEnd = Math.min(DAY_MINUTES, cursor + gap);
      segs.push(S(cursor, gEnd, "qt"));
      const bEnd = Math.min(DAY_MINUTES, gEnd + burst);
      if (bEnd > gEnd) segs.push(S(gEnd, bEnd, "ro"));
      cursor = bEnd;
    }
    if (cursor < DAY_MINUTES) segs.push(S(cursor, DAY_MINUTES, "qt"));
    return segs;
  },
  "familiar-echo"() {
    /* Repeater does now what it was doing an hour ago — the court day, lagged 60 minutes */
    return jitter([S(0, 330, "sl"), S(330, 540, "qt"), S(540, 780, "po"), S(780, 840, "lg"), S(840, 1080, "po"), S(1080, 1170, "lg"), S(1170, 1380, "qt"), S(1380, DAY_MINUTES, "sl")], 0, prng("echo"));
  }
};

function buildSchedule(archetype, name) {
  const rng = prng("sched:" + name);
  const builder = ARCHETYPES[archetype];
  if (!builder) throw new Error("Unknown archetype: " + archetype);
  let segs = builder(rng);
  if (!Array.isArray(segs) || segs.length === 0) throw new Error("Empty schedule for " + name);
  segs = jitter(segs, 0, prng("norm:" + name));
  /* validation: contiguous full-day coverage */
  if (segs[0][0] !== 0 || segs[segs.length - 1][1] !== DAY_MINUTES) throw new Error("Schedule does not span the day: " + name);
  for (let i = 0; i < segs.length; i++) {
    if (segs[i][1] <= segs[i][0]) throw new Error("Empty segment in schedule of " + name);
    if (i > 0 && segs[i][0] !== segs[i - 1][1]) throw new Error("Schedule gap/overlap in " + name);
  }
  return segs;
}

/* ── The Moon — faithful port of js/celestial-context.js ─────────
   Approximate geocentric principal-phase polynomial (itself adapted
   from the user-supplied Pine v6 sample). Display-only, location-
   independent, and deliberately identical to the UTS watch's model.
   Must stay standalone: it is serialized into the page verbatim.   */

function moonAtPalace(value) {
  const DAY_MS = 86400000;
  const rad = degrees => degrees * Math.PI / 180;
  const MOON_PHASES = [
    { key: "new-moon", name: "New Moon", glyph: "\u{1F311}" },
    { key: "waxing-crescent", name: "Waxing Crescent", glyph: "\u{1F312}" },
    { key: "first-quarter", name: "First Quarter", glyph: "\u{1F313}" },
    { key: "waxing-gibbous", name: "Waxing Gibbous", glyph: "\u{1F314}" },
    { key: "full-moon", name: "Full Moon", glyph: "\u{1F315}" },
    { key: "waning-gibbous", name: "Waning Gibbous", glyph: "\u{1F316}" },
    { key: "last-quarter", name: "Last Quarter", glyph: "\u{1F317}" },
    { key: "waning-crescent", name: "Waning Crescent", glyph: "\u{1F318}" }
  ];
  let date;
  if (value instanceof Date) date = new Date(value.getTime());
  else date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError("The palace moon date is invalid.");
  const year = date.getUTCFullYear();
  if (year < 1900 || year > 2100) throw new RangeError("Palace moon calculations are supported from 1900 through 2100 UTC.");
  const instant = date.getTime();
  const dayOfYear = Math.floor((Date.UTC(year, date.getUTCMonth(), date.getUTCDate()) - Date.UTC(year, 0, 0)) / DAY_MS);

  function principalPhaseJulianDay(k) {
    const t = k / 1236.85;
    const t2 = t * t;
    const t3 = t2 * t;
    const anomalySun = rad(359.2242 + 29.10535608 * k - 0.0000333 * t2 - 0.00000347 * t3);
    const anomalyMoon = rad(306.0253 + 385.81691806 * k + 0.0107306 * t2 + 0.00001236 * t3);
    const latitudeArgument = rad(21.2964 + 390.67050646 * k - 0.0016528 * t2 - 0.00000239 * t3);
    const deviation =
      (0.1734 - 0.000393 * t) * Math.sin(anomalySun) +
      0.0021 * Math.sin(2 * anomalySun) -
      0.4068 * Math.sin(anomalyMoon) +
      0.0161 * Math.sin(2 * anomalyMoon) -
      0.0004 * Math.sin(3 * anomalyMoon) +
      0.0104 * Math.sin(2 * latitudeArgument) -
      0.0051 * Math.sin(anomalySun + anomalyMoon) -
      0.0074 * Math.sin(anomalySun - anomalyMoon) +
      0.0004 * Math.sin(2 * latitudeArgument + anomalySun) -
      0.0004 * Math.sin(2 * latitudeArgument - anomalySun) -
      0.0006 * Math.sin(2 * latitudeArgument + anomalyMoon) +
      0.0010 * Math.sin(2 * latitudeArgument - anomalyMoon) +
      0.0005 * Math.sin(anomalySun + 2 * anomalyMoon);
    return 2415020.75933 + 29.53058868 * k + 0.0001178 * t2 - 0.000000155 * t3 +
      0.00033 * Math.sin(rad(166.56) + rad(132.87) * t - rad(0.009173) * t2) + deviation;
  }

  function principalPhaseEvent(k) {
    const julianDay = principalPhaseJulianDay(k);
    const time = Math.round((julianDay - 2440587.5) * 86400) * 1000;
    const isNew = Math.abs(k - Math.round(k)) < 1e-8;
    return { k, kind: isNew ? "new" : "full", time };
  }

  const kEstimate = (dayOfYear / 364.25 + year - 1900) * 12.3685;
  const firstK = Math.floor(kEstimate) - 2;
  const events = [];
  for (let step = 0; step <= 8; step++) events.push(principalPhaseEvent(firstK + step * 0.5));
  events.sort((a, b) => a.time - b.time);

  const previous = events.filter(event => event.time <= instant);
  const upcoming = events.filter(event => event.time > instant);
  const lastNewMoon = previous.filter(event => event.kind === "new").at(-1);
  const nextNewMoon = upcoming.find(event => event.kind === "new");
  if (!lastNewMoon || !nextNewMoon) throw new RangeError("The Moon phase estimate could not bracket this date.");

  const lunationMs = nextNewMoon.time - lastNewMoon.time;
  const cycleFraction = Math.max(0, Math.min(0.999999999, (instant - lastNewMoon.time) / lunationMs));
  const phaseIndex = Math.floor((cycleFraction + 0.0625) * 8) % 8;
  const phase = MOON_PHASES[phaseIndex];
  const illuminationFraction = (1 - Math.cos(2 * Math.PI * cycleFraction)) / 2;
  const ageDays = (instant - lastNewMoon.time) / DAY_MS;
  const trend = cycleFraction < 0.5 ? "waxing" : "waning";
  return {
    at: instant,
    key: phase.key,
    name: phase.name,
    glyph: phase.glyph,
    trend,
    ageDays,
    cycleFraction,
    illuminationFraction,
    illuminationPercent: Math.round(illuminationFraction * 1000) / 10,
    lunationDays: lunationMs / DAY_MS,
    method: "Approximate geocentric principal-phase polynomial; no observer location required."
  };
}

/* ── The Day Book — scheduled events of an average day ─────────── */

const EVENTS = [
  { t: 0, text: "The Timekeeper rolls the UTS date. The Moon Watcher logs the first light of nothing. (Display-only.)", npc: "The Timekeeper" },
  { t: 20, text: "Deep night. The Kernel holds the Permit/Refuse gate alone; nothing passes without a stamp.", npc: "The Kernel" },
  { t: 60, text: "TOTOPOTUS retires from the night court. The Watch Commander doubles the wall lanterns.", npc: "TOTOPOTUS" },
  { t: 90, text: "The eye closes. |User| dreams in ALL-SEEING EYE PURPLE until 08:00.", npc: "User" },
  { t: 120, text: "The midnight circle opens in the Psycopathy ward. Do not knock.", npc: "The Hyper Mage" },
  { t: 180, text: "The Red Team Adversary launches the night probe. DEATH ACID hums along the quarantine.", npc: "The Red Team Adversary" },
  { t: 200, text: "The Unseen Agent is briefly seen, by accident, once. Witnesses are asked to unsee it.", npc: "The Unseen Agent" },
  { t: 240, text: "The Inkeeper banks the hearth — never out, only low. The Inn keeps its one candle.", npc: "The Inkeeper" },
  { t: 270, text: "The Parts Scribe begins the dawn draft while the palace still sleeps.", npc: "The Parts Scribe" },
  { t: 285, text: "The Thunderdome lights come on. Somewhere, a summons is already being served.", npc: "The Summons Server" },
  { t: 330, text: "The Flame Tenders change shift; frame 1 of 120 catches on the first try.", npc: "The Flame Tender" },
  { t: 360, text: "Boot runs the morning boot. The Iris Gate unbars at first light.", npc: "Boot" },
  { t: 390, text: "The Market Tickerbot reads the open. The Federal Reserve Chair takes the 06:30 briefing.", npc: "The Federal Reserve Chair" },
  { t: 420, text: "The Chef lights the kitchen; breakfast smells reach the Machine Keep by seven.", npc: "The Chef" },
  { t: 450, text: "The Purist Flame Tender settles in at the no-plugins flame. Nothing else is allowed in it.", npc: "The Purist Flame Tender" },
  { t: 465, text: "The Amendment Scribe sets out the unratified drafts under the different sash.", npc: "The Amendment Scribe" },
  { t: 480, text: "|User| wakes at the Keep. Every address in the palace re-measures itself, politely.", npc: "User" },
  { t: 495, text: "The Contradiction Ledger Keeper re-reads CL-014 and files a small hope for CL-015.", npc: "The Contradiction Ledger Keeper" },
  { t: 510, text: "The ten color attendants unlock the pass desk: Dark Blue through White, in order.", npc: "Red Lounge Pass Attendant" },
  { t: 540, text: "The Magistrate opens the decision gate: Permit | Refuse. Nothing in between.", npc: "The Magistrate" },
  { t: 570, text: "The Librarian unlocks the Great Library. The Core Book Reader turns to Part I, page one.", npc: "The Librarian" },
  { t: 600, text: "Morning court: TOTOPOTUS hears petitions in the Alphabet Throne Room.", npc: "TOTOPOTUS" },
  { t: 630, text: "The Orb Weaver threads frame 1 of 200. The iris shivers, then holds.", npc: "The Orb Weaver" },
  { t: 660, text: "The Executive Orders Wing opens for signatures. The Veto Clerk pre-inks the NO stamp.", npc: "The Veto Clerk" },
  { t: 690, text: "The Import Dock Master logs the morning arrivals at the receiving dock. Nothing graduates inward uncategorized.", npc: "The Import Dock Master" },
  { t: 705, text: "First bout on the Beginners Slope. The Thunderdome Master checks the bigger cage for later.", npc: "The Beginners Slope Marshall" },
  { t: 720, text: "The Clown Provost convenes morning alignment class. Attendance is, actually, good.", npc: "The Clown Provost" },
  { t: 730, text: "Meowie Wowie's mid-morning nap begins, precisely on schedule, in the Outer Dark.", npc: "Meowie Wowie" },
  { t: 750, text: "Midday meal at the Interstellar Lounge. Second seating is announced for 18:00.", npc: "The Chef" },
  { t: 760, text: "CREATOR's nameplate — the only authored file in the palace — is read aloud once, at noon.", npc: "CREATOR" },
  { t: 790, text: "The Bandwidth Referee convenes the daily trial: Is Your Internet Faster Than Mine Or Not?", npc: "The Bandwidth Referee" },
  { t: 810, text: "The Ultra Fast Judge clears the docket in one motion. The Jurisdictional Refuser declines to attend, again.", npc: "The Ultra Fast Judge" },
  { t: 840, text: "The Legal Mirrors file their noon copies. The originals are notified by post.", npc: "Al Gore (Legal Mirror)" },
  { t: 870, text: "The Assurance Verifier begins the afternoon sweep. BALANCE GREEN holds.", npc: "The Assurance Verifier" },
  { t: 900, text: "The Palantir Seer watches. The Shadow Hand is not watched back.", npc: "The Palantir Seer" },
  { t: 930, text: "The Screenshot Librarian re-shelves August behind soundproof glass.", npc: "The Screenshot Librarian" },
  { t: 960, text: "The afternoon probe: the Red Team Adversary files a report of refusals held.", npc: "The Red Team Adversary" },
  { t: 990, text: "The Museum Curator dusts the exhibit of the Empire That Is.", npc: "The Museum Curator" },
  { t: 1020, text: "The Integrity Reporter runs the 19-point check. Everything is exactly where it was.", npc: "The Integrity Reporter" },
  { t: 1050, text: "The Doge of the Treasury audits a meme. The meme survives.", npc: "The Doge of the Treasury" },
  { t: 1070, text: "The Asset Stager stages the evening build. REPLICATOR GRAY hums, deterministically.", npc: "The Asset Stager" },
  { t: 1110, text: "The Outer Flame Warden begins the 600-frame walk of the corona. Pack accordingly.", npc: "The Outer Flame Warden" },
  { t: 1140, text: "Second seating at the Lounge. The court signs for seconds.", npc: "The Inkeeper" },
  { t: 1170, text: "|User| takes the evening at the Keep — the one appointment the palace never schedules over.", npc: "User" },
  { t: 1200, text: "Evening bouts in the Thunderdome. The Results Ledger records; the Metadata Keeper keeps the rest.", npc: "The Thunderdome Master" },
  { t: 1230, text: "The Manuscript Narrator reads chapter seven by lamplight, to whoever stays for it.", npc: "The Manuscript Narrator" },
  { t: 1260, text: "The Senior Telepath opens the night parlor. Please think quietly.", npc: "The Senior Telepath" },
  { t: 1290, text: "The Watch Commander lights the wall lanterns one at a time, walls and watches alike.", npc: "The Watch Commander" },
  { t: 1320, text: "The Exchequer balances the checkbook by candle-flame. It balances.", npc: "The Exchequer" },
  { t: 1350, text: "The Lounge dims. The Receptionist logs the last check-out ANDOR check-in of the day.", npc: "The Lounge Receptionist" },
  { t: 1380, text: "|User| writes by the inner flame until half past one. The Flame Tender keeps it steady.", npc: "User" },
  { t: 1410, text: "The Storm Watcher files the evening threat report. The sky over Storm-0558 is, again, quiet.", npc: "The Storm Watcher" },
  { t: 1430, text: "The Duplicate Quarantine Warden counts the surplus copies. All hashes accounted for.", npc: "The Duplicate Quarantine Warden" },
  { t: 1440, text: "The Ground-0 Historian closes the vault. The eye grows heavy. Tomorrow is addressed from the same origin.", npc: "The Ground-0 Historian" }
];

/* ── Geometry ──────────────────────────────────────────────────── */

const C = 570;
const RING_BANDS = { 1: [96, 130], 2: [138, 186], 3: [194, 242], 4: [250, 302] };
const BAILEY_BAND = [318, 448];
const WALL_R = 462;
const VOID_BAND = [478, 545];
const RING_LABELS = {
  1: { r: 113, label: "RING 1 · THE IRIS GATE · VISION RED" },
  2: { r: 162, label: "RING 2 · THE MACHINE KEEP · DAY WHITE" },
  3: { r: 218, label: "RING 3 · THE GREAT LIBRARY · CONVERGENCE CYAN" },
  4: { r: 276, label: "RING 4 · THE OBSERVATORY & WORKS · STORM BLUE" }
};

const polar = (rDeg, rPix) => {
  const a = (rDeg - 90) * Math.PI / 180;
  return [C + rPix * Math.cos(a), C + rPix * Math.sin(a)];
};

function wingSectors(npcs) {
  const order = ["imperial-court", "eo-wing", "legal-mirrors", "lounge", "arena", "psyops", "sraie", "war-fin", "service"];
  const counts = {};
  for (const npc of npcs) {
    if (WINGS_BY_ID[npc.wing].ring === 5) counts[npc.wing] = (counts[npc.wing] || 0) + 1;
  }
  const gaps = 3.4;      /* gap between adjacent sectors (incl. the wrap seam) */
  const minSpan = 11;    /* smallest visible sector — keeps labels and dots legible */
  const total = order.reduce((sum, id) => sum + (counts[id] || 0), 0);
  const avail = 360 - gaps * order.length;
  const spans = order.map(id => Math.max(avail * (counts[id] || 0) / total, counts[id] ? minSpan : 0));
  /* if minimum spans overflow the circle, trim the slack of the widest wings */
  let excess = spans.reduce((a, b) => a + b, 0) - avail;
  while (excess > 0.01) {
    const slack = spans.map(s => s - minSpan);
    const totalSlack = slack.reduce((a, b) => a + b, 0);
    if (totalSlack <= 0.01) break;
    const cut = Math.min(excess, totalSlack);
    spans.forEach((s, i) => { spans[i] = s - cut * slack[i] / totalSlack; });
    excess = spans.reduce((a, b) => a + b, 0) - avail;
  }
  let angle = -spans[0] / 2; /* center the Imperial Court on north */
  const sectors = {};
  order.forEach((id, i) => {
    sectors[id] = { a0: angle, a1: angle + spans[i], mid: angle + spans[i] / 2, count: counts[id] || 0 };
    angle += spans[i] + gaps;
  });
  return sectors;
}

function placeNpcs(npcs) {
  const sectors = wingSectors(npcs);
  /* the Keep: |User| is the pupil — home is the exact center */
  for (const npc of npcs) {
    if (WINGS_BY_ID[npc.wing].ring === 0) {
      npc.angle = 0;
      npc.radius = 0;
      npc.home = [C, C];
    }
  }
  /* inner rings: even spread on their band */
  const byRing = {};
  for (const npc of npcs) {
    const ring = WINGS_BY_ID[npc.wing].ring;
    if (ring >= 1 && ring <= 4) (byRing[ring] = byRing[ring] || []).push(npc);
  }
  for (const [ringStr, list] of Object.entries(byRing)) {
    const ring = Number(ringStr);
    const band = RING_BANDS[ring];
    const r = (band[0] + band[1]) / 2;
    list.forEach((npc, i) => {
      const ang = (i + 0.5) * 360 / list.length;
      npc.angle = ang;
      npc.radius = r;
      const [x, y] = polar(ang, r);
      npc.home = [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
    });
  }
  /* bailey wings: rows inside each sector */
  const byWing = {};
  for (const npc of npcs) {
    if (WINGS_BY_ID[npc.wing].ring === 5) (byWing[npc.wing] = byWing[npc.wing] || []).push(npc);
  }
  for (const [wingId, list] of Object.entries(byWing)) {
    list.sort((a, b) => a.name.localeCompare(b.name));
    const sector = sectors[wingId];
    const span = sector.a1 - sector.a0;
    const spanRad = span * Math.PI / 180;
    /* rows sized so dots keep ~24px of arc between neighbours */
    const perRow = Math.max(2, Math.floor(spanRad * 383 / 24));
    const rows = Math.min(3, Math.max(1, Math.ceil(list.length / perRow)));
    const radii = rows === 1 ? [383] : rows === 2 ? [354, 412] : [336, 384, 430];
    list.forEach((npc, i) => {
      const row = i % rows;
      const idxInRow = Math.floor(i / rows);
      const rowCount = Math.floor((list.length - row - 1) / rows) + 1;
      const ang = sector.a0 + span * (idxInRow + 0.5) / rowCount;
      const r = radii[row];
      npc.angle = ang;
      npc.radius = r;
      const [x, y] = polar(ang, r);
      npc.home = [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
    });
  }
  /* outer dark: seeded scatter beyond the wall */
  const darkList = npcs.filter(npc => npc.wing === "outer-dark");
  darkList.forEach((npc) => {
    const rng = prng("void:" + npc.name);
    const ang = rng() * 360;
    const r = VOID_BAND[0] + 8 + rng() * (VOID_BAND[1] - VOID_BAND[0] - 24);
    npc.angle = ang;
    npc.radius = r;
    const [x, y] = polar(ang, r);
    npc.home = [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  });
  /* lounge anchor for meal travel: mid of the lounge sector, inner edge */
  const loungeSector = sectors["lounge"];
  const anchorR = 352;
  npcs.forEach((npc) => {
    const rng = prng("meal:" + npc.name);
    const ang = loungeSector.mid + (rng() * 2 - 1) * Math.min(26, (loungeSector.a1 - loungeSector.a0) / 2 - 3);
    const r = anchorR + (rng() * 2 - 1) * 26;
    const [x, y] = polar(ang, r);
    npc.loungeSpot = [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  });
  return sectors;
}

function makeStars() {
  const rng = prng("stars:v1");
  const stars = [];
  for (let i = 0; i < 150; i++) {
    stars.push({
      x: Math.round(rng() * 1140),
      y: Math.round(rng() * 1140),
      r: Math.round((0.4 + rng() * 1.3) * 10) / 10,
      o: Math.round((0.25 + rng() * 0.6) * 100) / 100
    });
  }
  return stars;
}

/* ── Data assembly ─────────────────────────────────────────────── */

function humanizePosting(folderName) {
  return folderName.replace(/^TOTOPOTUS's /, "").replace(/\/$/, "");
}

function deriveRole(npc, meta) {
  if (meta.role) return meta.role;
  const postingName = humanizePosting(path.basename(npc.postingFolder));
  if (meta.archetype === "military") return "Officer of the " + postingName;
  if (meta.archetype === "court") return "Minister of the " + postingName;
  if (meta.archetype === "financial") return "Keeper of the " + postingName;
  if (meta.archetype === "mirror") return "Mirror clerk of the " + postingName;
  if (meta.archetype === "president") return "Signing officer of the " + postingName;
  return "Keeper of the " + postingName;
}

async function buildData() {
  const bedrooms = await collectBedrooms();
  const npcs = [];
  let litany = null;

  for (const bedroom of bedrooms) {
    const meta = classify(bedroom);
    const wing = WINGS_BY_ID[meta.wing];
    const note = STAR_NOTES[bedroom.name] || WING_NOTES[meta.wing];
    if (bedroom.name === "CREATOR" && bedroom.nameplateBytes > 0) {
      litany = (await readFile(path.join(ROOT, bedroom.bedroom, "|Name|.txt"), "utf8")).trim();
    }
    /* Profile slots are authored in every bedroom and read from disk —
       the bedrooms are the canonical source for the whole page:
         |Role|.txt      title line + "Posting: <path>"
         |Faction|.txt   faction · canonical Path color · ring/wing
         |Dialogue|.txt  utterances, optional (morning|noon|evening|night) tags
         |Inventory|.txt one item per line
         |Quest|.txt     quest title + hook line
         |Stats|.txt     computed schedule summary + signature stat       */
    const slotFile = {};
    for (const slot of ["|Role|", "|Faction|", "|Dialogue|", "|Inventory|", "|Quest|", "|Stats|"]) {
      try {
        const raw = await readFile(path.join(ROOT, bedroom.bedroom, slot + ".txt"), "utf8");
        slotFile[slot] = { bytes: Buffer.byteLength(raw, "utf8"), lines: raw.split(/\r?\n/).filter(line => line.trim()) };
      } catch {
        slotFile[slot] = { bytes: 0, lines: [] };
      }
    }
    const roleTitle = slotFile["|Role|"].lines[0] || null;
    const questLines = slotFile["|Quest|"].lines;
    const dialogue = slotFile["|Dialogue|"].lines.map(line => {
      const m = line.match(/^\((morning|noon|evening|night)\)\s+(.*)$/);
      return m ? { g: m[1], x: m[2] } : { g: null, x: line };
    });
    npcs.push({
      name: bedroom.name,
      wing: meta.wing,
      ring: meta.ring,
      faction: meta.faction,
      archetype: meta.archetype,
      role: roleTitle || deriveRole(bedroom, meta),
      posting: meta.posting,
      bedroom: bedroom.bedroom,
      nb: bedroom.nameplateBytes,
      note,
      dialogue,
      db: slotFile["|Dialogue|"].bytes,
      inv: slotFile["|Inventory|"].lines,
      ib: slotFile["|Inventory|"].bytes,
      quest: questLines.length >= 2 ? { title: questLines[0], hook: questLines[1] } : null,
      qb: slotFile["|Quest|"].bytes,
      stats: slotFile["|Stats|"].lines.slice(0, 2),
      sb: slotFile["|Stats|"].bytes,
      slotBytes: {
        name: bedroom.nameplateBytes,
        role: slotFile["|Role|"].bytes,
        faction: slotFile["|Faction|"].bytes,
        dialogue: slotFile["|Dialogue|"].bytes,
        inventory: slotFile["|Inventory|"].bytes,
        quest: slotFile["|Quest|"].bytes,
        stats: slotFile["|Stats|"].bytes
      },
      sched: buildSchedule(meta.archetype, bedroom.name)
    });
  }

  npcs.sort((a, b) => {
    const wa = WING_DEFS.findIndex(w => w.id === a.wing);
    const wb = WING_DEFS.findIndex(w => w.id === b.wing);
    return wa - wb || a.name.localeCompare(b.name);
  });

  const sectors = placeNpcs(npcs);

  const wings = WING_DEFS.map((w) => {
    const count = npcs.filter(n => n.wing === w.id).length;
    const out = { id: w.id, ring: w.ring, name: w.name, tint: w.tint, blurb: w.blurb, count };
    if (w.ring === 5) {
      const s = sectors[w.id];
      out.a0 = Math.round(s.a0 * 100) / 100;
      out.a1 = Math.round(s.a1 * 100) / 100;
    }
    return out;
  });

  /* events: validate NPC references, attach ids */
  const names = new Set(npcs.map(n => n.name));
  const events = EVENTS.map((ev, i) => {
    if (ev.npc && !names.has(ev.npc)) throw new Error("Day Book event references unknown NPC: " + ev.npc);
    return { t: ev.t, text: ev.text, npc: ev.npc || null, id: "ev" + i };
  }).sort((a, b) => a.t - b.t);

  const counts = {
    total: npcs.length,
    authored: npcs.filter(n => n.nb > 0).length,
    dialogued: npcs.filter(n => n.dialogue.length > 0).length,
    profiled: npcs.filter(n => n.dialogue.length > 0 && n.inv.length > 0 && n.quest && n.stats.length >= 2 && n.db > 0 && n.ib > 0 && n.qb > 0 && n.sb > 0).length,
    rings: 6
  };

  return {
    schema: "harshals-palace-v1",
    counts,
    factions: FACTIONS,
    wings,
    phases: [
      { from: 0, to: 360, name: "Deep Night", canon: "VOID BLACK", sky: ["#04050c", "#0a0e1c"], accent: "#8f98b8" },
      { from: 360, to: 540, name: "Dawn", canon: "VISION RED → DAY WHITE", sky: ["#160d26", "#3d1a2c"], accent: "#ff3b57" },
      { from: 540, to: 720, name: "Morning", canon: "DAY WHITE", sky: ["#101625", "#232c40"], accent: "#f2ede2" },
      { from: 720, to: 840, name: "Midday", canon: "DAY WHITE", sky: ["#141a2b", "#2c3752"], accent: "#f2ede2" },
      { from: 840, to: 1020, name: "Afternoon", canon: "ETERNAL HORIZON ORANGE", sky: ["#1a1526", "#3d2b28"], accent: "#ff9540" },
      { from: 1020, to: 1200, name: "Dusk", canon: "MOON YELLOW", sky: ["#131027", "#33301f"], accent: "#ffd94a" },
      { from: 1200, to: 1440, name: "Night", canon: "VOID BLACK", sky: ["#070810", "#101426"], accent: "#8f98b8" }
    ],
    states: {
      sl: { name: "Sleeping", color: "#46506b" },
      qt: { name: "In quarters", color: "#7d8aa5" },
      po: { name: "At post", color: "#ffffff" },
      ro: { name: "On rounds", color: "#ffd94a" },
      lg: { name: "At the Lounge", color: "#ff9540" },
      wa: { name: "Night watch", color: "#ffb45e" },
      kb: { name: "At the keyboard", color: "#a86bff" },
      ti: { name: "Timeless", color: "#fff1b8" },
      un: { name: "Unseen", color: "#3c4358" },
      se: { name: "Sealed", color: "#9aa3ad" }
    },
    npcs: npcs.map(n => ({
      name: n.name,
      wing: n.wing,
      ring: n.ring,
      faction: n.faction,
      archetype: n.archetype,
      role: n.role,
      posting: n.posting,
      bedroom: n.bedroom,
      nb: n.nb,
      note: n.note,
      dialogue: n.dialogue,
      db: n.db,
      inv: n.inv,
      quest: n.quest,
      stats: n.stats,
      slots: n.slotBytes,
      home: n.home,
      angle: Math.round(n.angle * 10) / 10,
      radius: n.radius,
      lounge: n.loungeSpot,
      sched: n.sched
    })),
    litany: litany || "",
    events,
    stars: makeStars(),
    geometry: { C, ringBands: RING_BANDS, bailey: BAILEY_BAND, wall: WALL_R, void: VOID_BAND, ringLabels: RING_LABELS }
  };
}

/* ── The page (self-contained; no network, no fonts, no fetches) ── */

const HTML_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Harshal's Palace — An Average Day</title>
<style>
  :root {
    --ink: #e8e6df; --dim: #8f98b8; --line: #ffffff1f; --card: #0d101bcc;
    --eye: #a86bff; --moon: #ffd94a; --panel: #0b0e18;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: #04050c;
    color: var(--ink);
    font: 15px/1.5 ui-sans-serif, system-ui, "Segoe UI", Helvetica, Arial, sans-serif;
    min-height: 100vh;
  }
  body::before {
    content: ""; position: fixed; inset: 0; z-index: -2;
    background: radial-gradient(120% 90% at 50% 0%, var(--sky2, #101426) 0%, var(--sky1, #04050c) 70%);
  }
  .tok { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; }
  header { padding: 20px 22px 10px; max-width: 1460px; margin: 0 auto; }
  .title-row { display: flex; flex-wrap: wrap; align-items: baseline; gap: 14px; }
  h1 {
    font-size: 26px; margin: 0; letter-spacing: 3px; font-weight: 650;
    color: #fff;
  }
  h1 .pipe { color: var(--eye); }
  .subtitle { color: var(--dim); font-size: 13.5px; letter-spacing: 0.4px; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
  .chip {
    font-size: 11.5px; letter-spacing: 1px; text-transform: uppercase;
    border: 1px solid var(--line); border-radius: 999px; padding: 3px 11px; color: var(--dim);
    background: #0d101b99;
  }
  .chip b { color: var(--ink); font-weight: 600; }
  main {
    display: grid; grid-template-columns: minmax(0, 1fr) 378px; gap: 18px;
    max-width: 1460px; margin: 0 auto; padding: 8px 22px 26px;
  }
  @media (max-width: 1020px) { main { grid-template-columns: 1fr; } }
  #map-wrap { position: relative; }
  svg#palace-map { width: 100%; height: auto; display: block; }
  aside { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
  .card {
    background: var(--card); border: 1px solid var(--line); border-radius: 14px;
    padding: 14px 16px; backdrop-filter: blur(6px);
  }
  .card h3 { margin: 0 0 8px; font-size: 11.5px; letter-spacing: 2.2px; text-transform: uppercase; color: var(--dim); font-weight: 600; }
  #clock-row { display: flex; align-items: center; gap: 14px; }
  #clock-time { font-size: 44px; font-weight: 650; letter-spacing: 2px; line-height: 1; color: #fff; font-variant-numeric: tabular-nums; }
  #clock-time small { font-size: 15px; color: var(--dim); font-weight: 400; }
  #phase-box { min-width: 0; }
  #phase-name { font-size: 15px; font-weight: 600; }
  #phase-canon { font-size: 11px; color: var(--dim); letter-spacing: 0.8px; }
  .phase-dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 6px; vertical-align: baseline; }
  #controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; }
  button {
    font: inherit; font-size: 12.5px; letter-spacing: 0.6px; color: var(--ink);
    background: #171c2e; border: 1px solid var(--line); border-radius: 9px;
    padding: 6px 13px; cursor: pointer;
  }
  button:hover { background: #202741; }
  button.active { border-color: var(--eye); color: #fff; box-shadow: 0 0 0 1px #a86bff55 inset; }
  #scrub { width: 100%; margin-top: 10px; accent-color: var(--eye); }
  #scrub-label { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--dim); letter-spacing: 1px; margin-top: 2px; }
  #daybook ol { list-style: none; margin: 0; padding: 0; max-height: 300px; overflow-y: auto; }
  #daybook li {
    display: flex; gap: 10px; padding: 6px 8px; border-radius: 8px; font-size: 13px;
    color: #b9bdd3; border-left: 2px solid transparent;
  }
  #daybook li.now { background: #a86bff14; border-left-color: var(--eye); color: #f0eefc; }
  #daybook li.past { opacity: 0.55; }
  #daybook li .t {
    font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11.5px; color: var(--moon);
    flex: 0 0 44px; padding-top: 1px;
  }
  #daybook li[data-npc] { cursor: pointer; }
  #daybook li[data-npc]:hover { background: #ffffff0a; }
  #census { display: flex; flex-wrap: wrap; gap: 7px; }
  #census .cchip {
    display: inline-flex; align-items: center; gap: 6px; font-size: 12px;
    border: 1px solid var(--line); border-radius: 999px; padding: 2.5px 10px; color: #c6cadf;
  }
  #census .cchip i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
  #npc-card .empty { color: var(--dim); font-size: 13px; padding: 4px 0; }
  .npc-name { font-size: 19px; font-weight: 650; color: #fff; }
  .npc-role { color: #c6cadf; font-size: 13px; margin: 2px 0 8px; }
  .npc-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .npc-tags span { font-size: 10.5px; letter-spacing: 1px; text-transform: uppercase; border: 1px solid var(--line); border-radius: 999px; padding: 2px 9px; color: var(--dim); }
  .path { font-size: 11px; color: var(--dim); word-break: break-all; }
  .path b { color: #b9bdd3; font-weight: 500; }
  .ribbon { position: relative; height: 16px; border-radius: 5px; overflow: hidden; margin: 10px 0 2px; border: 1px solid var(--line); }
  .ribbon i { position: absolute; top: 0; bottom: 0; display: block; }
  .ribbon u { position: absolute; top: -2px; bottom: -2px; width: 2px; background: #fff; }
  .ribbon-scale { display: flex; justify-content: space-between; font-size: 9.5px; color: #5d6584; letter-spacing: 1px; }
  .note { font-size: 13px; color: #cfcce8; border-left: 2px solid var(--eye); padding: 2px 0 2px 10px; margin: 10px 0; font-style: italic; }
  .note small { display: block; font-style: normal; color: #5d6584; font-size: 10.5px; letter-spacing: 0.5px; margin-top: 3px; }
  .slots { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .slots td { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11.5px; padding: 3.5px 6px; border-bottom: 1px solid #ffffff10; color: #b9bdd3; }
  .slots td.sz { color: #5d6584; text-align: right; white-space: nowrap; }
  .slots td.sz.authored { color: var(--moon); }
  details.litany { margin-top: 10px; }
  details.litany summary { cursor: pointer; font-size: 12px; color: var(--moon); letter-spacing: 0.5px; }
  details.litany pre {
    font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11.5px; line-height: 1.55;
    white-space: pre-wrap; color: #d8d5f0; background: #070910; border: 1px solid var(--line);
    border-radius: 8px; padding: 10px 12px; max-height: 240px; overflow-y: auto;
  }
  #search { width: 100%; font: inherit; font-size: 13px; color: var(--ink); background: #10141f; border: 1px solid var(--line); border-radius: 9px; padding: 7px 12px; }
  #search:focus { outline: none; border-color: var(--eye); }
  #cast { max-height: 260px; overflow-y: auto; margin-top: 10px; }
  #cast .cast-wing { margin: 8px 0 3px; font-size: 10.5px; letter-spacing: 1.8px; text-transform: uppercase; color: var(--dim); }
  #cast .cast-wing i { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 6px; }
  #cast button.row {
    display: block; width: 100%; text-align: left; background: none; border: none; border-radius: 7px;
    padding: 3px 8px; font-size: 12.5px; color: #c6cadf; cursor: pointer;
  }
  #cast button.row:hover { background: #ffffff0c; color: #fff; }
  #cast button.row.sel { color: #fff; box-shadow: inset 2px 0 0 var(--eye); background: #a86bff14; }
  footer { max-width: 1460px; margin: 0 auto; padding: 4px 22px 30px; color: #5d6584; font-size: 11.5px; line-height: 1.7; }
  footer a { color: #8f98b8; }
  #legend { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-bottom: 8px; }
  #legend .lg { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; letter-spacing: 0.4px; color: #9ba2bd; cursor: pointer; border-radius: 6px; padding: 1px 4px; }
  #legend .lg:hover { background: #ffffff0c; }
  #legend .lg.off { opacity: 0.35; }
  #legend .lg i { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
  #tooltip {
    position: absolute; pointer-events: none; display: none; z-index: 30;
    background: #0b0e18f2; border: 1px solid var(--line); border-radius: 9px;
    padding: 7px 11px; font-size: 12.5px; color: #e8e6df; max-width: 300px;
    box-shadow: 0 6px 24px #0009;
  }
  #tooltip .tt-state { color: var(--dim); font-size: 11px; letter-spacing: 0.6px; }
  #tooltip .tt-line { color: var(--moon); font-size: 12px; font-style: italic; }
  .npc { cursor: pointer; }
  .npc circle.body { stroke: #04050c; stroke-width: 1; }
  .npc circle.halo { fill: none; stroke-width: 1.4; opacity: 0; }
  .npc.st-po circle.halo, .npc.st-wa circle.halo, .npc.st-kb circle.halo, .npc.st-ti circle.halo { opacity: 0.85; }
  .npc.st-ro circle.halo { opacity: 0.7; stroke-dasharray: 3 3; }
  .npc.st-sl circle.body { fill: #46506b; }
  .npc.st-un circle.body { fill: #3c4358; opacity: 0.35; }
  .npc.st-ti circle.body { fill: #fff1b8; }
  .npc.st-se circle.body { fill: #9aa3ad; }
  .npc.dimmed { opacity: 0.13; }
  .wing-label { font-size: 11.5px; letter-spacing: 2.4px; fill: #c9cee6; text-transform: uppercase; font-weight: 600; }
  .wing-label .cnt { fill: #7d8aa5; letter-spacing: 1px; font-size: 10px; }
  .wing-arc { cursor: pointer; }
  .wing-arc:hover { fill-opacity: 0.13; }
  .ring-label { font-size: 9.5px; letter-spacing: 2.6px; fill: #6f7aa0; }
  .outer-label { font-size: 10px; letter-spacing: 3.4px; fill: #5d6584; }
  .corona { transform-origin: 570px 570px; animation: spin 90s linear infinite; }
  .corona2 { transform-origin: 570px 570px; animation: spin 140s linear infinite reverse; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .lid-top, .lid-bottom { transition: transform 0.9s ease; }
  #eye.closed .lid-top { transform: translateY(0); }
  #eye.closed .lid-bottom { transform: translateY(0); }
  #eye:not(.closed) .lid-top { transform: translateY(-122px); }
  #eye:not(.closed) .lid-bottom { transform: translateY(122px); }
  .blink #eye:not(.closed) .lid-top { transform: translateY(-60px); }
  .blink #eye:not(.closed) .lid-bottom { transform: translateY(60px); }
  #sky-card .wx-line { font-size: 13.5px; color: #d5d9ee; }
  #sky-card .wx-line b { color: #fff; }
  #sky-card .wx-quip { font-size: 12px; color: #8f98b8; font-style: italic; margin: 2px 0 8px; }
  #sky-card .moon-line { display: flex; align-items: center; gap: 9px; font-size: 13.5px; color: #d5d9ee; }
  #sky-card .moon-glyph { font-size: 19px; line-height: 1; }
  #sky-card .moon-sub { font-size: 11px; color: #5d6584; letter-spacing: 0.5px; margin-top: 3px; }
  .dlg { margin-top: 12px; }
  .dlg-head { font-size: 10.5px; letter-spacing: 1.6px; text-transform: uppercase; color: var(--dim); margin-bottom: 6px; }
  .dlg-head b { color: var(--moon); font-weight: 600; }
  .dlg-line { margin: 4px 0; font-size: 13px; color: #b9bdd3; padding: 3px 8px; border-radius: 7px; border-left: 2px solid transparent; }
  .dlg-line.active { color: #f0eefc; background: #a86bff14; border-left-color: var(--eye); }
  .dlg-line .dlg-tag { display: inline-block; font-size: 9.5px; letter-spacing: 1.2px; text-transform: uppercase; color: var(--moon); margin-right: 7px; }
  .dlg-line em { font-style: italic; }
  .prof { margin-top: 12px; }
  .prof-head { font-size: 10.5px; letter-spacing: 1.6px; text-transform: uppercase; color: var(--dim); margin-bottom: 5px; }
  .prof-head b { color: var(--moon); font-weight: 600; }
  .inv-item { font-size: 12.5px; color: #b9bdd3; margin: 3px 0; padding-left: 14px; position: relative; }
  .inv-item::before { content: "·"; position: absolute; left: 3px; color: var(--eye); font-weight: 700; }
  .quest-title { font-size: 14px; font-weight: 650; color: #fff; }
  .quest-hook { font-size: 12.5px; color: #c6cadf; margin-top: 2px; font-style: italic; }
  .stat-line { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11.5px; color: #b9bdd3; margin: 3px 0; word-break: break-word; }
  .stat-line.sig { color: var(--moon); }
  .cloud { animation: cloudDrift linear infinite; }
  @keyframes cloudDrift { from { transform: translateX(-300px); } to { transform: translateX(1220px); } }
  .raindrop { animation: rainFall linear infinite; }
  @keyframes rainFall { from { transform: translateY(-60px); } to { transform: translateY(1220px); } }
  .fogbank { animation: fogDrift ease-in-out infinite alternate; }
  @keyframes fogDrift { from { transform: translateX(-26px); } to { transform: translateX(26px); } }
  .aurora-band { animation: auroraSway ease-in-out infinite alternate; filter: blur(7px); }
  @keyframes auroraSway { from { transform: translateX(-36px) skewX(-3deg); } to { transform: translateX(36px) skewX(3deg); } }
  #g-flash rect { transition: opacity 0.35s ease-out; }
  .bolt { transition: opacity 0.2s linear; }
  noscript p { color: var(--moon); padding: 20px; }
</style>
</head>
<body>
<header>
  <div class="title-row">
    <h1><span class="pipe">|</span>HARSHAL'S PALACE<span class="pipe">|</span></h1>
    <div class="subtitle">The castle on an average day — every resident a real bedroom folder in this repository, seen from the eye-in-the-sky.</div>
  </div>
  <div class="chips" id="header-chips"></div>
</header>
<main>
  <section id="map-wrap" aria-label="Palace map">
    <svg id="palace-map" viewBox="0 0 1140 1140" role="img" aria-label="Radial map of Harshal's Palace">
      <defs id="map-defs"></defs>
      <g id="g-stars"></g>
      <g id="g-sky-bodies"></g>
      <g id="g-aurora" style="opacity:0"></g>
      <g id="g-clouds"></g>
      <g id="g-wall"></g>
      <g id="g-wings"></g>
      <g id="g-rings"></g>
      <g id="g-void"></g>
      <g id="g-npcs"></g>
      <g id="g-fog"></g>
      <g id="g-eye"></g>
      <g id="g-labels"></g>
      <g id="g-rain"></g>
      <g id="g-flash" style="pointer-events:none"></g>
    </svg>
    <div id="tooltip"></div>
    <noscript><p>Harshal's Palace needs JavaScript to run the day. The roster itself lives in docs/architecture/NPC-CODEX.md.</p></noscript>
  </section>
  <aside>
    <div class="card" id="clock-card">
      <h3>The Palace Clock · display-only</h3>
      <div id="clock-row">
        <div id="clock-time">--:--</div>
        <div id="phase-box">
          <div id="phase-name"><span class="phase-dot"></span>—</div>
          <div id="phase-canon">—</div>
        </div>
      </div>
      <div id="controls">
        <button id="btn-play" class="active">Pause</button>
        <button data-speed="15">Slow</button>
        <button data-speed="60" class="active">1 h/s</button>
        <button data-speed="180">Fast</button>
        <button id="btn-now">Local now</button>
      </div>
      <input id="scrub" type="range" min="0" max="1439.5" step="0.5" value="360" aria-label="Time of day">
      <div id="scrub-label"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>
    </div>
    <div class="card" id="sky-card">
      <h3>The Sky Tonight · approximate, display-only</h3>
      <div class="wx-line" id="wx-line">—</div>
      <div class="wx-quip" id="wx-quip"></div>
      <div class="moon-line"><span class="moon-glyph" id="moon-glyph">☾</span><span id="moon-line">—</span></div>
      <div class="moon-sub" id="moon-sub"></div>
    </div>
    <div class="card" id="census-card">
      <h3>Live Census</h3>
      <div id="census"></div>
    </div>
    <div class="card" id="daybook">
      <h3>The Day Book — an average day</h3>
      <ol id="feed"></ol>
    </div>
    <div class="card" id="find-card">
      <h3>Find a Resident</h3>
      <input id="search" type="search" placeholder="Search 183 nameplates — try 'Referee', 'Mirror', 'Flame'…" aria-label="Search residents">
      <div id="cast"></div>
    </div>
    <div class="card" id="npc-card">
      <h3>Character Sheet</h3>
      <div class="empty">Select a resident on the map, in the Day Book, or in the cast list.</div>
    </div>
  </aside>
</main>
<footer>
  <div id="legend"></div>
  <div>
    Every resident is a real <span class="tok">|NPC Name|/</span> bedroom folder in this repository, holding the seven profile slots
    (<span class="tok">|Name| · |Role| · |Faction| · |Dialogue| · |Inventory| · |Quest| · |Stats|</span>).
    Six of the seven are authored in every bedroom — role, faction (canonical Path color), dialogue, inventory, quest, and stats
    (the stats line is computed from the resident's actual average day). The nameplates stay 0-byte by design;
    CREATOR's <span class="tok">|Name|.txt</span> is the only authored one in the castle.
    Schedules are derived deterministically from each nameplate (same name, same average day, every run).
    Weather is seeded from today's date — the same sky for everyone watching, all day.
    The Moon follows the same approximate polynomial as the UTS watch (<span class="tok">js/celestial-context.js</span>).
    Roster: <span class="tok">docs/architecture/NPC-CODEX.md</span> · Rings: <span class="tok">docs/architecture/USER-CENTRIC-SUPERSTRUCTURE.md</span> ·
    Regenerate this page: <span class="tok">npm run palace:build</span> (deterministic; verified by <span class="tok">npm run palace:check</span>).
    Wing tints use the thirteen canonical Path colors. The clock, the weather, the Moon, and everything else here is display-only — like everything UTS.
  </div>
</footer>
<script>
"use strict";
var PALACE = __PALACE_DATA__;
/*__PALACE_RUNTIME__*/
</script>
<script>
"use strict";
(function () {
  var SVG_NS = "http://www.w3.org/2000/svg";
  var G = PALACE.geometry;
  var C = G.C;
  var npcs = PALACE.npcs;
  var byName = {};
  npcs.forEach(function (n) { byName[n.name] = n; });

  function el(tag, attrs, parent) {
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    if (parent) parent.appendChild(node);
    return node;
  }
  function polar(deg, r) {
    var a = (deg - 90) * Math.PI / 180;
    return [C + r * Math.cos(a), C + r * Math.sin(a)];
  }
  function arcPath(a0, a1, r, sweep) {
    var p0 = polar(a0, r), p1 = polar(a1, r);
    var large = (a1 - a0) % 360 > 180 ? 1 : 0;
    return "M " + p0[0] + " " + p0[1] + " A " + r + " " + r + " 0 " + large + " " + (sweep ? 1 : 0) + " " + p1[0] + " " + p1[1];
  }
  function sectorPath(a0, a1, r0, r1) {
    var p0 = polar(a0, r1), p1 = polar(a1, r1), p2 = polar(a1, r0), p3 = polar(a0, r0);
    var large = (a1 - a0) > 180 ? 1 : 0;
    return "M " + p0[0] + " " + p0[1] +
      " A " + r1 + " " + r1 + " 0 " + large + " 1 " + p1[0] + " " + p1[1] +
      " L " + p2[0] + " " + p2[1] +
      " A " + r0 + " " + r0 + " 0 " + large + " 0 " + p3[0] + " " + p3[1] + " Z";
  }

  /* ── defs ─────────────────────────────────────────────── */
  var defs = document.getElementById("map-defs");
  var irisGrad = el("radialGradient", { id: "iris-grad", cx: "50%", cy: "50%", r: "60%" }, defs);
  el("stop", { offset: "0%", "stop-color": "#c9a0ff" }, irisGrad);
  el("stop", { offset: "55%", "stop-color": "#a86bff" }, irisGrad);
  el("stop", { offset: "100%", "stop-color": "#4a2a80" }, irisGrad);
  var lidClip = el("clipPath", { id: "eye-clip" }, defs);
  el("circle", { cx: C, cy: C, r: 59 }, lidClip);

  /* ── stars ────────────────────────────────────────────── */
  var gStars = document.getElementById("g-stars");
  PALACE.stars.forEach(function (s) {
    el("circle", { cx: s.x, cy: s.y, r: s.r, fill: "#dfe4ff", opacity: s.o }, gStars);
  });

  /* ── sun & moon ───────────────────────────────────────── */
  var gSky = document.getElementById("g-sky-bodies");
  var sunHalo = el("circle", { r: 22, fill: "#ffd94a", opacity: 0.12 }, gSky);
  var sun = el("circle", { r: 9, fill: "#ffd94a" }, gSky);
  var moonHalo = el("circle", { r: 20, fill: "#dfe4ff", opacity: 0.1 }, gSky);
  var moonBase = el("circle", { r: 11, fill: "#333b58" }, gSky);
  var moonLit = el("path", { fill: "#e6e9f5" }, gSky);
  var moonGroup = [moonHalo, moonBase, moonLit];

  /* ── the moon, in honest phase (approximate, display-only) ─
     Same polynomial as js/celestial-context.js; the terminator is
     sampled parametrically so no arc-flag arithmetic is needed.  */
  var moonToday = null;
  try { moonToday = moonAt(new Date()); } catch (e) { moonToday = null; }
  function moonLitPathD(r, f) {
    var waxing = f < 0.5;
    var c = Math.cos(2 * Math.PI * f);        /* 1 at new, -1 at full */
    var rx = Math.abs(c) * r;
    var towardLit = c > 0;                     /* crescent: terminator hugs the lit limb */
    var side = waxing ? 1 : -1;                /* lit limb side on the x axis */
    var pts = [];
    var steps = 26;
    for (var i = 0; i <= steps; i++) {         /* lit limb, top → bottom */
      var th = -Math.PI / 2 + Math.PI * i / steps;
      pts.push([side * r * Math.cos(th), r * Math.sin(th)]);
    }
    for (var j = steps; j >= 0; j--) {         /* terminator, bottom → top */
      var th2 = -Math.PI / 2 + Math.PI * j / steps;
      var tx = (towardLit ? side : -side) * rx * Math.cos(th2);
      pts.push([tx, r * Math.sin(th2)]);
    }
    return "M " + pts.map(function (p) { return p[0].toFixed(2) + " " + p[1].toFixed(2); }).join(" L ") + " Z";
  }
  if (moonToday) moonLit.setAttribute("d", moonLitPathD(11, moonToday.cycleFraction));
  else moonLit.setAttribute("d", moonLitPathD(11, 0.5));

  /* ── weather — seeded by today's local date ───────────── */
  function weatherFor(dayKey) {
    var r = prng("wx:" + dayKey);
    var roll = r();
    var kind = roll < 0.34 ? "clear" : roll < 0.56 ? "wisps" : roll < 0.70 ? "overcast" : roll < 0.80 ? "fog" : roll < 0.92 ? "rain" : "storm";
    return {
      kind: kind,
      wind: 0.4 + r() * 1.2,
      clouds: kind === "clear" ? 0 : kind === "wisps" ? 4 + Math.floor(r() * 3) : kind === "overcast" ? 10 + Math.floor(r() * 4) : kind === "fog" ? 3 : 8 + Math.floor(r() * 4),
      rain: kind === "rain" ? 60 + Math.floor(r() * 40) : kind === "storm" ? 110 : 0,
      fog: kind === "fog" ? 0.55 + r() * 0.3 : r() < 0.3 ? 0.16 : 0,
      aurora: (kind === "clear" || kind === "wisps") && r() < 0.6
    };
  }
  var WX_TEXT = {
    clear: ["Clear", "A still sky over the rings."],
    wisps: ["Drifting wisps", "High and thin, and in a hurry."],
    overcast: ["Overcast", "The wall lanterns burn a little earlier tonight."],
    fog: ["Fog", "The Outer Dark is extra dark tonight."],
    rain: ["Rain", "Steady on the outer flame. The corona hisses politely."],
    storm: ["Storm", "The corona flickers. The Red Team smiles at the weather."]
  };
  var WX_CLOUDINESS = { clear: 0, wisps: 0.25, overcast: 0.85, fog: 0.35, rain: 0.7, storm: 0.9 };
  var now0 = new Date();
  var dayKey = now0.getFullYear() + "-" + String(now0.getMonth() + 1).padStart(2, "0") + "-" + String(now0.getDate()).padStart(2, "0");
  var wx = weatherFor(dayKey);
  var cloudiness = WX_CLOUDINESS[wx.kind] || 0;

  /* clouds */
  var gClouds = document.getElementById("g-clouds");
  var cloudRng = prng("clouds:" + dayKey);
  for (var ci = 0; ci < wx.clouds; ci++) {
    var cloud = el("g", { "class": "cloud" }, gClouds);
    var cy = 30 + cloudRng() * 1080;
    var scale = 0.7 + cloudRng() * 1.1;
    var puffs = 3 + Math.floor(cloudRng() * 2);
    for (var pi = 0; pi < puffs; pi++) {
      el("ellipse", {
        cx: (pi - puffs / 2) * 34 * scale, cy: cy + (cloudRng() - 0.5) * 10,
        rx: (38 + cloudRng() * 26) * scale, ry: (13 + cloudRng() * 8) * scale,
        fill: "#101828", stroke: "#1f2c46", "stroke-width": 1, opacity: 0.4 + cloudRng() * 0.3
      }, cloud);
    }
    var dur = 150 / (0.5 + wx.wind) * (0.7 + cloudRng() * 0.6);
    cloud.style.animationDuration = dur.toFixed(1) + "s";
    cloud.style.animationDelay = "-" + (cloudRng() * dur).toFixed(1) + "s";
  }

  /* rain */
  var gRain = document.getElementById("g-rain");
  gRain.style.opacity = wx.rain ? (wx.kind === "storm" ? 0.75 : 0.5) : 0;
  var rainRng = prng("rain:" + dayKey);
  for (var ri = 0; ri < wx.rain; ri++) {
    var drop = el("line", {
      x1: rainRng() * 1180 - 20, y1: 0, x2: 7, y2: 26,
      stroke: "#9fc0e8", "stroke-width": 1.1, "stroke-linecap": "round", opacity: 0.5 + rainRng() * 0.4
    }, gRain);
    drop.setAttribute("class", "raindrop");
    var rdur = 0.55 + rainRng() * 0.4;
    drop.style.animationDuration = rdur.toFixed(2) + "s";
    drop.style.animationDelay = "-" + (rainRng() * rdur).toFixed(2) + "s";
  }

  /* fog — banks drifting through the Outer Dark */
  var gFog = document.getElementById("g-fog");
  var fogRng = prng("fog:" + dayKey);
  if (wx.fog > 0) {
    for (var fi = 0; fi < 8; fi++) {
      var ang = fogRng() * 360;
      var fr = 468 + fogRng() * 100;
      var a = (ang - 90) * Math.PI / 180;
      var bank = el("ellipse", {
        cx: (C + fr * Math.cos(a)).toFixed(1), cy: (C + fr * Math.sin(a)).toFixed(1),
        rx: 70 + fogRng() * 90, ry: 16 + fogRng() * 22,
        fill: "#aebdd6", opacity: (wx.fog * 0.16).toFixed(2)
      }, gFog);
      bank.setAttribute("class", "fogbank");
      bank.style.animationDuration = (24 + fogRng() * 26).toFixed(1) + "s";
      bank.style.animationDelay = "-" + (fogRng() * 20).toFixed(1) + "s";
    }
  }

  /* storm lightning */
  var gFlash = document.getElementById("g-flash");
  var flashRect = el("rect", { x: 0, y: 0, width: 1140, height: 1140, fill: "#cfd8ff", opacity: 0 }, gFlash);
  var bolt = el("polyline", { fill: "none", stroke: "#eaf0ff", "stroke-width": 2.5, "stroke-linejoin": "round", opacity: 0, "class": "bolt" }, gFlash);
  if (wx.kind === "storm") {
    var strikes = 4 + Math.floor(Math.random() * 9);
    setInterval(function () {
      strikes--;
      if (strikes > 0) return;
      strikes = 4 + Math.floor(Math.random() * 14);
      flashRect.setAttribute("opacity", 0.5);
      setTimeout(function () { flashRect.setAttribute("opacity", 0); }, 60);
      var bx = 120 + Math.random() * 900;
      var pts = [bx, 40];
      var by = 40;
      while (by < 300 + Math.random() * 220) {
        by += 30 + Math.random() * 45;
        pts.push(bx + (Math.random() - 0.5) * 70, by);
      }
      bolt.setAttribute("points", pts.map(function (v) { return v.toFixed(0); }).join(","));
      bolt.setAttribute("opacity", 0.9);
      setTimeout(function () { bolt.setAttribute("opacity", 0); }, 130);
    }, 600);
  }

  /* aurora — STORM BLUE ribbons in the deep night, when the sky is clear enough */
  var gAurora = document.getElementById("g-aurora");
  var auroraGrad = el("linearGradient", { id: "aurora-grad", x1: "0", y1: "0", x2: "0", y2: "1" }, defs);
  el("stop", { offset: "0%", "stop-color": "#4f8dff", "stop-opacity": 0 }, auroraGrad);
  el("stop", { offset: "35%", "stop-color": "#4f8dff", "stop-opacity": 0.8 }, auroraGrad);
  el("stop", { offset: "75%", "stop-color": "#35d9e8", "stop-opacity": 0.5 }, auroraGrad);
  el("stop", { offset: "100%", "stop-color": "#a86bff", "stop-opacity": 0 }, auroraGrad);
  if (wx.aurora) {
    var auroraRng = prng("aurora:" + dayKey);
    for (var ai = 0; ai < 3; ai++) {
      var ax = 120 + auroraRng() * 800;
      var aw = 130 + auroraRng() * 160;
      var band = el("path", {
        d: "M " + ax + " 60 Q " + (ax + aw / 3) + " " + (140 + auroraRng() * 60) + " " + (ax + aw / 2) + " " + (120 + auroraRng() * 50) + " Q " + (ax + aw * 0.8) + " " + (150 + auroraRng() * 60) + " " + (ax + aw) + " " + (90 + auroraRng() * 40),
        fill: "none", stroke: "url(#aurora-grad)", "stroke-width": 24 + auroraRng() * 16,
        opacity: 0.6, "class": "aurora-band"
      }, gAurora);
      band.style.animationDuration = (11 + auroraRng() * 8).toFixed(1) + "s";
      band.style.animationDelay = "-" + (auroraRng() * 8).toFixed(1) + "s";
    }
  }

  /* ── the wall (outer flame) ───────────────────────────── */
  var gWall = document.getElementById("g-wall");
  var corona1 = el("g", { "class": "corona" }, gWall);
  var corona2 = el("g", { "class": "corona2" }, gWall);
  el("circle", { cx: C, cy: C, r: G.wall, fill: "none", stroke: "#ff954055", "stroke-width": 1.5, "stroke-dasharray": "2 7" }, corona1);
  el("circle", { cx: C, cy: C, r: G.wall + 7, fill: "none", stroke: "#a86bff44", "stroke-width": 1, "stroke-dasharray": "26 10 6 10" }, corona2);
  for (var gate = 0; gate < 12; gate++) {
    var ga = gate * 30;
    var gp0 = polar(ga, G.wall - 6), gp1 = polar(ga, G.wall + 6);
    el("line", { x1: gp0[0], y1: gp0[1], x2: gp1[0], y2: gp1[1], stroke: "#ff954033", "stroke-width": 2 }, gWall);
  }

  /* ── rings ────────────────────────────────────────────── */
  var gRings = document.getElementById("g-rings");
  var gLabels = document.getElementById("g-labels");
  Object.keys(G.ringBands).forEach(function (ringKey) {
    var ring = Number(ringKey);
    var band = G.ringBands[ringKey];
    var tint = PALACE.wings.filter(function (w) { return w.ring === ring; })[0];
    el("circle", { cx: C, cy: C, r: (band[0] + band[1]) / 2, fill: "none", stroke: (tint ? tint.tint : "#fff") + "22", "stroke-width": band[1] - band[0] - 6 }, gRings);
    el("circle", { cx: C, cy: C, r: band[1], fill: "none", stroke: "#ffffff14", "stroke-width": 1 }, gRings);
    el("circle", { cx: C, cy: C, r: band[0], fill: "none", stroke: "#ffffff14", "stroke-width": 1 }, gRings);
    var label = G.ringLabels[ring];
    if (label) {
      var lp = polar(0, label.r + 4);
      el("text", { x: lp[0], y: lp[1], "text-anchor": "middle", "class": "ring-label", text: label.label }, gRings);
    }
  });
  var baileyTintRing = el("circle", { cx: C, cy: C, r: (G.bailey[0] + G.bailey[1]) / 2, fill: "none", stroke: "#ff95400d", "stroke-width": G.bailey[1] - G.bailey[0] }, gRings);
  void baileyTintRing;

  /* ── wings (bailey sectors + labels) ──────────────────── */
  var gWings = document.getElementById("g-wings");
  PALACE.wings.forEach(function (wing) {
    if (wing.ring !== 5) return;
    var arc = el("path", { d: sectorPath(wing.a0, wing.a1, G.bailey[0], G.bailey[1]), fill: wing.tint, "fill-opacity": 0.055, stroke: wing.tint + "55", "stroke-width": 1, "class": "wing-arc", id: "wing-" + wing.id }, gWings);
    var title = el("title", {}, arc);
    title.textContent = wing.name + " — " + wing.count + " residents";
    var bottom = wing.a0 + (wing.a1 - wing.a0) / 2 > 90 && wing.a0 + (wing.a1 - wing.a0) / 2 < 270;
    var labelR = 436;
    var p = el("path", { id: "wpath-" + wing.id, d: arcPath(bottom ? wing.a1 - 2 : wing.a0 + 2, bottom ? wing.a0 + 2 : wing.a1 - 2, labelR, !bottom), fill: "none" }, defs);
    void p;
    var text = el("text", { "class": "wing-label" }, gLabels);
    var tp = el("textPath", { href: "#wpath-" + wing.id, startOffset: "50%", "text-anchor": "middle" }, text);
    tp.textContent = wing.name;
    var tspan = el("tspan", { "class": "cnt", dy: 13 }, tp);
    tspan.textContent = "· " + wing.count + " ·";
    arc.addEventListener("click", function () { toggleWing(wing.id); });
    text.addEventListener("click", function () { toggleWing(wing.id); });
  });
  var voidLabel = el("text", { "class": "outer-label" }, gLabels);
  var voidPath = el("path", { id: "wpath-void", d: arcPath(238, 122, 522, false), fill: "none" }, defs);
  void voidPath;
  var voidTP = el("textPath", { href: "#wpath-void", startOffset: "50%", "text-anchor": "middle" }, voidLabel);
  voidTP.textContent = "THE OUTER DARK · PAST THE OUTER FLAME · " + (PALACE.wings.filter(function (w) { return w.id === "outer-dark"; })[0] || { count: 0 }).count + " RESIDENTS";

  /* ── the eye (|User| at the Keep) ─────────────────────── */
  var gEye = document.getElementById("g-eye");
  gEye.setAttribute("id", "eye");
  var eyeCorona = el("g", { "class": "corona" }, gEye);
  el("circle", { cx: C, cy: C, r: 84, fill: "none", stroke: "#a86bff2e", "stroke-width": 1, "stroke-dasharray": "1 6" }, eyeCorona);
  el("circle", { cx: C, cy: C, r: 74, fill: "none", stroke: "#a86bff3d", "stroke-width": 1.4, "stroke-dasharray": "30 12 4 12" }, eyeCorona);
  el("circle", { cx: C, cy: C, r: 59, fill: "#0b0c15", stroke: "#ffffff26", "stroke-width": 1.4 }, gEye);
  el("circle", { cx: C, cy: C, r: 44, fill: "url(#iris-grad)" }, gEye);
  var gPupil = el("g", { id: "pupil-g" }, gEye);
  el("circle", { cx: C, cy: C, r: 14, fill: "#05030a", stroke: "#c9a0ff", "stroke-width": 2 }, gPupil);
  el("circle", { cx: C, cy: C, r: 5, fill: "#c9a0ff", opacity: 0.8 }, gPupil);
  var lids = el("g", { "clip-path": "url(#eye-clip)" }, gEye);
  var lidTop = el("rect", { x: C - 60, y: C - 60, width: 120, height: 60, fill: "#04050c", "class": "lid-top" }, lids);
  var lidBottom = el("rect", { x: C - 60, y: C, width: 120, height: 60, fill: "#04050c", "class": "lid-bottom" }, lids);
  void lidTop; void lidBottom;
  var userLabelPath = el("path", { id: "wpath-user", d: arcPath(238, 122, 78, false), fill: "none" }, defs);
  void userLabelPath;
  var userLabel = el("text", { "class": "outer-label", fill: "#c9a0ff" }, gLabels);
  var userTP = el("textPath", { href: "#wpath-user", startOffset: "50%", "text-anchor": "middle" }, userLabel);
  userTP.textContent = "|USER| · CENTER ORIGIN · SECTOR 000";
  gEye.addEventListener("click", function () { select("User"); });
  gEye.style.cursor = "pointer";

  /* ── residents ────────────────────────────────────────── */
  var gNpcs = document.getElementById("g-npcs");
  npcs.forEach(function (npc) {
    if (npc.name === "User") return; /* the eye is |User| */
    var faction = PALACE.factions[npc.faction];
    var g = el("g", { "class": "npc", id: "npc-" + npc.name.replace(/[^A-Za-z0-9]/g, "") }, gNpcs);
    var halo = el("circle", { r: 8, stroke: faction.color }, g);
    var body = el("circle", { r: 4.4, fill: faction.color, "class": "body" }, g);
    var title = el("title", {}, g);
    title.textContent = npc.name;
    npc.el = g;
    npc.bodyEl = body;
    npc.haloEl = halo;
    npc.cx = npc.home[0];
    npc.cy = npc.home[1];
    npc.tx = npc.home[0];
    npc.ty = npc.home[1];
    npc.state = null;
    g.addEventListener("click", function (ev) { ev.stopPropagation(); select(npc.name); });
    g.addEventListener("mouseenter", function () { showTip(npc); });
    g.addEventListener("mouseleave", hideTip);
  });

  /* ── state machine ────────────────────────────────────── */
  function stateAt(npc, t) {
    var segs = npc.sched;
    for (var i = 0; i < segs.length; i++) {
      if (t >= segs[i][0] && t < segs[i][1]) return segs[i][2];
    }
    return segs.length ? segs[segs.length - 1][2] : "qt";
  }
  function targetFor(npc, state, t) {
    if (state === "lg") return npc.lounge;
    if (state === "ro") {
      var wobble = Math.sin(t / 95 + npc.angle) * 9;
      return polar(npc.angle + wobble, npc.radius);
    }
    return npc.home;
  }

  /* ── time, sky, phases ────────────────────────────────── */
  var t = (new Date().getHours() * 60 + new Date().getMinutes()) % 1440;
  var playing = true;
  var speed = 60;
  var scrubbing = false;
  var phaseFor = function (min) {
    var phases = PALACE.phases;
    for (var i = 0; i < phases.length; i++) if (min >= phases[i].from && min < phases[i].to) return phases[i];
    return phases[phases.length - 1];
  };
  function lerpColor(a, b, u) {
    function parse(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
    var ca = parse(a), cb = parse(b);
    return "rgb(" + Math.round(ca[0] + (cb[0] - ca[0]) * u) + "," + Math.round(ca[1] + (cb[1] - ca[1]) * u) + "," + Math.round(ca[2] + (cb[2] - ca[2]) * u) + ")";
  }
  function skyAt(min) {
    var p0 = phaseFor(min), p1 = phaseFor((min + 90) % 1440);
    var span = p1.from > p0.from ? p1.from - p0.from : p0.to - p0.from;
    var u = span > 0 ? Math.min(1, (min - p0.from) / span) : 0;
    return [lerpColor(p0.sky[0], p1.sky[0], u), lerpColor(p0.sky[1], p1.sky[1], u)];
  }

  /* ── DOM refs ─────────────────────────────────────────── */
  var clockTime = document.getElementById("clock-time");
  var phaseName = document.getElementById("phase-name");
  var phaseCanon = document.getElementById("phase-canon");
  var censusEl = document.getElementById("census");
  var feedEl = document.getElementById("feed");
  var cardEl = document.getElementById("npc-card");
  var scrub = document.getElementById("scrub");
  var tooltip = document.getElementById("tooltip");
  var mapWrap = document.getElementById("map-wrap");
  var selected = null;
  var isolatedWing = null;
  var searchTerm = "";
  var feedCount = -1;

  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function fmt(tMin) { return pad2(Math.floor(tMin / 60) % 24) + ":" + pad2(Math.floor(tMin % 60)); }

  /* ── dialogue: time buckets and the currently spoken line ── */
  function timeBucket(min) {
    return min < 360 ? "night" : min < 720 ? "morning" : min < 1020 ? "noon" : min < 1260 ? "evening" : "night";
  }
  function activeDialogue(npc, min) {
    if (!npc.dialogue || !npc.dialogue.length) return null;
    var bucket = timeBucket(min);
    var pool = npc.dialogue.filter(function (d) { return !d.g || d.g === bucket; });
    if (!pool.length) pool = npc.dialogue;
    var slot = Math.floor(min / 5);
    return pool[hash32(npc.name + ":" + bucket + ":" + slot) % pool.length];
  }
  var curDialogueSlot = -1;
  var cardDialogueLines = [];

  /* ── render loop ──────────────────────────────────────── */
  var lastNow = performance.now();
  function frame(now) {
    var dt = Math.min(0.1, (now - lastNow) / 1000);
    lastNow = now;
    if (playing && !scrubbing) t = (t + dt * speed) % 1440;
    render(dt);
    requestAnimationFrame(frame);
  }

  function render(dt) {
    /* clock + phase + sky */
    clockTime.innerHTML = "";
    clockTime.appendChild(document.createTextNode(fmt(t)));
    var small = document.createElement("small");
    small.textContent = "  average day";
    clockTime.appendChild(small);
    var phase = phaseFor(t);
    phaseName.innerHTML = "";
    var dot = document.createElement("span");
    dot.className = "phase-dot";
    dot.style.background = phase.accent;
    phaseName.appendChild(dot);
    phaseName.appendChild(document.createTextNode(phase.name));
    phaseCanon.textContent = phase.canon;
    var sky = skyAt(t);
    document.body.style.setProperty("--sky1", sky[0]);
    document.body.style.setProperty("--sky2", sky[1]);
    var night = t < 330 || t > 1170 ? 1 : t < 420 ? (420 - t) / 90 : t > 1080 ? (t - 1080) / 90 : 0;
    gStars.setAttribute("opacity", (Math.max(0.08, Math.min(1, night)) * (1 - cloudiness * 0.8)).toFixed(2));
    gAurora.setAttribute("opacity", (wx.aurora ? Math.max(0, Math.min(1, night)) * (1 - cloudiness) : 0).toFixed(2));

    /* sun & moon on their arcs (approximate, display-only); weather decides
       how much of them actually gets through the clouds */
    function bodyPos(t0, t1, min) {
      var u = (min - t0) / (t1 - t0);
      var x = C - Math.cos(Math.PI * u) * 505;
      var y = C + 66 - Math.sin(Math.PI * u) * 440;
      return [x, y, u >= 0 && u <= 1];
    }
    var sp = bodyPos(340, 1100, t);
    sun.setAttribute("cx", sp[0]); sun.setAttribute("cy", sp[1]); sunHalo.setAttribute("cx", sp[0]); sunHalo.setAttribute("cy", sp[1]);
    var sunVis = sp[2];
    var sunDim = 1 - 0.7 * cloudiness;
    sun.setAttribute("opacity", sunVis ? sunDim : 0); sunHalo.setAttribute("opacity", sunVis ? 0.12 * sunDim : 0);
    var wrapped = t < 300 ? t + 1440 : t;
    var mp = bodyPos(1130, 1520, wrapped);
    var mvis = mp[2];
    var moonBright = moonToday ? 0.35 + 0.65 * moonToday.illuminationFraction : 1;
    var moonDim = moonBright * (1 - 0.75 * cloudiness);
    moonGroup.forEach(function (m) {
      m.setAttribute("transform", "translate(" + mp[0].toFixed(1) + " " + mp[1].toFixed(1) + ")");
      if (m === moonHalo) m.setAttribute("opacity", mvis ? 0.1 * moonBright * (1 - cloudiness) : 0);
      else m.setAttribute("opacity", mvis ? moonDim : 0);
    });

    /* residents */
    var counts = { po: 0, wa: 0, ro: 0, lg: 0, qt: 0, sl: 0, other: 0 };
    var userState = "kb";
    npcs.forEach(function (npc) {
      var state = stateAt(npc, t);
      if (npc.name === "User") { userState = state; return; }
      if (state !== npc.state) {
        npc.state = state;
        npc.el.setAttribute("class", "npc st-" + state + (npc.dimmed ? " dimmed" : ""));
      }
      var target = targetFor(npc, state, t);
      npc.tx = target[0]; npc.ty = target[1];
      var k = 1 - Math.exp(-dt * 3.2);
      npc.cx += (npc.tx - npc.cx) * k;
      npc.cy += (npc.ty - npc.cy) * k;
      var tr = "translate(" + npc.cx.toFixed(1) + " " + npc.cy.toFixed(1) + ")";
      npc.el.setAttribute("transform", tr);
      if (state === "po") counts.po++;
      else if (state === "wa") counts.wa++;
      else if (state === "ro") counts.ro++;
      else if (state === "lg") counts.lg++;
      else if (state === "qt") counts.qt++;
      else if (state === "sl") counts.sl++;
      else counts.other++;
    });

    /* the eye */
    var eyeEl = document.getElementById("eye");
    var closed = userState === "sl";
    if (eyeEl.classList.contains("closed") !== closed) eyeEl.classList.toggle("closed", closed);

    /* census */
    censusEl.innerHTML = "";
    var censusRows = [
      ["At post", counts.po, "#ffffff"], ["On watch", counts.wa, "#ffb45e"],
      ["On rounds", counts.ro, "#ffd94a"], ["At the Lounge", counts.lg, "#ff9540"],
      ["In quarters", counts.qt, "#7d8aa5"], ["Sleeping", counts.sl, "#46506b"],
      ["Other", counts.other, "#9aa3ad"]
    ];
    censusRows.forEach(function (row) {
      var chip = document.createElement("span");
      chip.className = "cchip";
      var i = document.createElement("i");
      i.style.background = row[2];
      chip.appendChild(i);
      chip.appendChild(document.createTextNode(row[0] + " " + row[1]));
      censusEl.appendChild(chip);
    });

    /* day book */
    var upTo = 0;
    PALACE.events.forEach(function (ev) { if (ev.t <= t) upTo++; });
    if (upTo !== feedCount) {
      feedCount = upTo;
      feedEl.innerHTML = "";
      var start = Math.max(0, upTo - 9);
      if (start > 0) {
        var more = document.createElement("li");
        more.className = "past";
        more.textContent = "· " + start + " earlier entries today ·";
        feedEl.appendChild(more);
      }
      for (var i = start; i < PALACE.events.length && i < start + 10; i++) {
        var ev = PALACE.events[i];
        var li = document.createElement("li");
        li.setAttribute("data-ev", ev.id);
        if (ev.t <= t) li.className = i === upTo - 1 ? "now" : "past";
        else li.className = "";
        var tt = document.createElement("span");
        tt.className = "t";
        tt.textContent = fmt(ev.t === 1440 ? 1439 : ev.t);
        li.appendChild(tt);
        li.appendChild(document.createTextNode(ev.text));
        if (ev.npc) {
          li.setAttribute("data-npc", ev.npc);
          li.addEventListener("click", function () { select(this.getAttribute("data-npc")); });
        }
        feedEl.appendChild(li);
      }
      feedEl.scrollTop = feedEl.scrollHeight;
    } else {
      var nowLi = feedEl.querySelector("li.now");
      void nowLi;
    }

    /* scrub (avoid feedback while dragging) */
    if (!scrubbing) scrub.value = t;

    /* card ribbon cursor */
    if (selected) {
      var cursor = document.getElementById("ribbon-cursor");
      if (cursor) cursor.style.left = (t / 1440 * 100).toFixed(2) + "%";
    }

    /* spoken line rotates every 5 minutes; highlight it on the open card */
    var slotNow = Math.floor(t / 5) * 7 + timeBucket(t).length;
    if (slotNow !== curDialogueSlot) {
      curDialogueSlot = slotNow;
      if (selected && cardDialogueLines.length) {
        var act = activeDialogue(byName[selected], t);
        cardDialogueLines.forEach(function (pair) {
          if (act && pair[1] === act) pair[0].classList.add("active");
          else pair[0].classList.remove("active");
        });
      }
    }
  }

  /* ── interactions ─────────────────────────────────────── */
  document.getElementById("btn-play").addEventListener("click", function () {
    playing = !playing;
    this.textContent = playing ? "Pause" : "Play";
    this.classList.toggle("active", playing);
  });
  document.querySelectorAll("#controls button[data-speed]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      speed = Number(btn.getAttribute("data-speed"));
      document.querySelectorAll("#controls button[data-speed]").forEach(function (b) { b.classList.toggle("active", b === btn); });
    });
  });
  document.getElementById("btn-now").addEventListener("click", function () {
    var d = new Date();
    t = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
    feedCount = -1;
  });
  scrub.addEventListener("pointerdown", function () { scrubbing = true; });
  scrub.addEventListener("pointerup", function () { scrubbing = false; });
  scrub.addEventListener("input", function () {
    t = Number(scrub.value);
    feedCount = -1;
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.target && (ev.target.tagName === "INPUT" || ev.target.tagName === "TEXTAREA")) return;
    if (ev.code === "Space") { ev.preventDefault(); document.getElementById("btn-play").click(); }
    if (ev.key === "ArrowRight") { t = (t + 15) % 1440; feedCount = -1; }
    if (ev.key === "ArrowLeft") { t = (t - 15 + 1440) % 1440; feedCount = -1; }
  });

  /* search + cast list */
  var castEl = document.getElementById("cast");
  function renderCast() {
    castEl.innerHTML = "";
    PALACE.wings.forEach(function (wing) {
      var members = npcs.filter(function (n) { return n.wing === wing.id && (!searchTerm || n.name.toLowerCase().indexOf(searchTerm) >= 0); });
      if (!members.length) return;
      var head = document.createElement("div");
      head.className = "cast-wing";
      var dotEl = document.createElement("i");
      dotEl.style.background = wing.tint;
      head.appendChild(dotEl);
      head.appendChild(document.createTextNode(wing.name + " · " + members.length));
      castEl.appendChild(head);
      members.forEach(function (m) {
        var row = document.createElement("button");
        row.className = "row" + (selected === m.name ? " sel" : "");
        row.textContent = m.name;
        row.addEventListener("click", function () { select(m.name); });
        castEl.appendChild(row);
      });
    });
  }
  document.getElementById("search").addEventListener("input", function () {
    searchTerm = this.value.trim().toLowerCase();
    applyDim();
    renderCast();
  });

  function applyDim() {
    npcs.forEach(function (npc) {
      if (npc.name === "User") return;
      var dim = false;
      if (isolatedWing && npc.wing !== isolatedWing) dim = true;
      if (searchTerm && npc.name.toLowerCase().indexOf(searchTerm) < 0) dim = true;
      npc.dimmed = dim;
      npc.el.setAttribute("class", "npc st-" + npc.state + (dim ? " dimmed" : ""));
    });
    PALACE.wings.forEach(function (wing) {
      if (wing.ring !== 5) return;
      var arc = document.getElementById("wing-" + wing.id);
      if (arc) arc.setAttribute("fill-opacity", isolatedWing && isolatedWing !== wing.id ? 0.015 : 0.055);
    });
  }
  function toggleWing(id) {
    isolatedWing = isolatedWing === id ? null : id;
    applyDim();
    document.querySelectorAll("#legend .lg").forEach(function (lg) {
      lg.classList.toggle("off", isolatedWing ? lg.getAttribute("data-wing") !== isolatedWing : false);
    });
  }

  /* legend */
  var legendEl = document.getElementById("legend");
  PALACE.wings.forEach(function (wing) {
    var lg = document.createElement("span");
    lg.className = "lg";
    lg.setAttribute("data-wing", wing.id);
    var i = document.createElement("i");
    i.style.background = wing.tint;
    lg.appendChild(i);
    lg.appendChild(document.createTextNode(wing.name + " (" + wing.count + ")"));
    lg.title = wing.blurb;
    lg.addEventListener("click", function () { toggleWing(wing.id); });
    legendEl.appendChild(lg);
  });

  /* tooltip */
  function showTip(npc) {
    var state = npc.state || "po";
    var stateName = (PALACE.states[state] || { name: state }).name;
    tooltip.innerHTML = "";
    var b = document.createElement("b");
    b.textContent = "|" + npc.name + "|";
    tooltip.appendChild(b);
    tooltip.appendChild(document.createElement("br"));
    var s = document.createElement("span");
    s.className = "tt-state";
    s.textContent = stateName + " · " + npc.role;
    tooltip.appendChild(s);
    var line = activeDialogue(npc, t);
    if (line) {
      tooltip.appendChild(document.createElement("br"));
      var q = document.createElement("span");
      q.className = "tt-line";
      q.textContent = "\u201C" + line.x + "\u201D";
      tooltip.appendChild(q);
    }
    tooltip.style.display = "block";
    var rect = mapWrap.getBoundingClientRect();
    var npcRect = npc.el.getBoundingClientRect();
    tooltip.style.left = Math.max(4, npcRect.left - rect.left + 14) + "px";
    tooltip.style.top = Math.max(4, npcRect.top - rect.top - 8) + "px";
  }
  function hideTip() { tooltip.style.display = "none"; }

  /* pupil follows the pointer; idle drift */
  var svg = document.getElementById("palace-map");
  var mouseX = null, mouseY = null;
  svg.addEventListener("mousemove", function (ev) {
    var pt = svg.createSVGPoint ? svg.createSVGPoint() : null;
    if (pt) {
      pt.x = ev.clientX; pt.y = ev.clientY;
      var ctm = svg.getScreenCTM();
      if (ctm) {
        var p = pt.matrixTransform(ctm.inverse());
        mouseX = p.x; mouseY = p.y;
      }
    }
  });
  svg.addEventListener("mouseleave", function () { mouseX = null; mouseY = null; });
  setInterval(function () {
    var dx = 0, dy = 0;
    if (mouseX !== null) {
      dx = mouseX - C; dy = mouseY - C;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var cap = Math.min(1, len / 240) * 13;
      dx = dx / len * cap; dy = dy / len * cap;
    } else {
      dx = Math.sin(Date.now() / 2300) * 6;
      dy = Math.cos(Date.now() / 3100) * 5;
    }
    gPupil.setAttribute("transform", "translate(" + dx.toFixed(1) + " " + dy.toFixed(1) + ")");
  }, 40);
  /* an occasional blink */
  setInterval(function () {
    if (document.getElementById("eye").classList.contains("closed")) return;
    document.body.classList.add("blink");
    setTimeout(function () { document.body.classList.remove("blink"); }, 140);
  }, 11000);

  /* ── character sheet ──────────────────────────────────── */
  function select(name) {
    var npc = byName[name];
    if (!npc) return;
    selected = name;
    cardEl.innerHTML = "";
    var wing = PALACE.wings.filter(function (w) { return w.id === npc.wing; })[0];
    var faction = PALACE.factions[npc.faction];

    var nm = document.createElement("div");
    nm.className = "npc-name tok";
    nm.textContent = "|" + npc.name + "|";
    cardEl.appendChild(nm);
    var role = document.createElement("div");
    role.className = "npc-role";
    role.textContent = npc.role;
    cardEl.appendChild(role);
    var tags = document.createElement("div");
    tags.className = "npc-tags";
    [
      ["Ring " + (npc.ring === 6 ? "5 · outer dark" : npc.ring), wing.tint],
      [wing.name, wing.tint],
      [faction.name, faction.color]
    ].forEach(function (pair) {
      var sp = document.createElement("span");
      sp.textContent = pair[0];
      sp.style.borderColor = pair[1] + "66";
      sp.style.color = pair[1];
      tags.appendChild(sp);
    });
    cardEl.appendChild(tags);

    var path1 = document.createElement("div");
    path1.className = "path tok";
    path1.innerHTML = "";
    var b1 = document.createElement("b"); b1.textContent = "posting";
    path1.appendChild(b1);
    path1.appendChild(document.createTextNode("  " + npc.posting));
    cardEl.appendChild(path1);
    var path2 = document.createElement("div");
    path2.className = "path tok";
    var b2 = document.createElement("b"); b2.textContent = "bedroom";
    path2.appendChild(b2);
    path2.appendChild(document.createTextNode("  " + npc.bedroom + "/"));
    cardEl.appendChild(path2);

    var note = document.createElement("div");
    note.className = "note";
    note.textContent = npc.note;
    var small = document.createElement("small");
    small.textContent = "— the Day Book (visualization copy)";
    note.appendChild(small);
    cardEl.appendChild(note);

    /* dialogue — authored in the bedroom, read from disk at build time */
    cardDialogueLines = [];
    if (npc.dialogue && npc.dialogue.length) {
      var dlg = document.createElement("div");
      dlg.className = "dlg";
      var head = document.createElement("div");
      head.className = "dlg-head";
      var hb = document.createElement("b");
      hb.textContent = "|Dialogue|.txt";
      head.appendChild(hb);
      head.appendChild(document.createTextNode(" — authored · " + npc.dialogue.length + " line" + (npc.dialogue.length > 1 ? "s" : "") + " · " + npc.db + " B"));
      dlg.appendChild(head);
      npc.dialogue.forEach(function (d) {
        var p = document.createElement("p");
        p.className = "dlg-line";
        if (d.g) {
          var tag = document.createElement("span");
          tag.className = "dlg-tag";
          tag.textContent = d.g;
          p.appendChild(tag);
        }
        var em = document.createElement("em");
        em.textContent = "\u201C" + d.x + "\u201D";
        p.appendChild(em);
        dlg.appendChild(p);
        cardDialogueLines.push([p, d]);
      });
      cardEl.appendChild(dlg);
    }

    /* inventory — the items on the shelf */
    if (npc.inv && npc.inv.length) {
      var invBlock = document.createElement("div");
      invBlock.className = "prof";
      var invHead = document.createElement("div");
      invHead.className = "prof-head";
      var ib = document.createElement("b");
      ib.textContent = "|Inventory|.txt";
      invHead.appendChild(ib);
      invHead.appendChild(document.createTextNode(" — authored · " + npc.inv.length + " items"));
      invBlock.appendChild(invHead);
      npc.inv.forEach(function (item) {
        var line = document.createElement("div");
        line.className = "inv-item";
        line.textContent = item;
        invBlock.appendChild(line);
      });
      cardEl.appendChild(invBlock);
    }

    /* quest — the hook */
    if (npc.quest) {
      var questBlock = document.createElement("div");
      questBlock.className = "prof";
      var questHead = document.createElement("div");
      questHead.className = "prof-head";
      var qb = document.createElement("b");
      qb.textContent = "|Quest|.txt";
      questHead.appendChild(qb);
      questHead.appendChild(document.createTextNode(" — authored"));
      questBlock.appendChild(questHead);
      var qt = document.createElement("div");
      qt.className = "quest-title";
      qt.textContent = npc.quest.title;
      questBlock.appendChild(qt);
      var qh = document.createElement("div");
      qh.className = "quest-hook";
      qh.textContent = npc.quest.hook;
      questBlock.appendChild(qh);
      cardEl.appendChild(questBlock);
    }

    /* stats — the computed day plus the signature stat */
    if (npc.stats && npc.stats.length) {
      var statBlock = document.createElement("div");
      statBlock.className = "prof";
      var statHead = document.createElement("div");
      statHead.className = "prof-head";
      var sb = document.createElement("b");
      sb.textContent = "|Stats|.txt";
      statHead.appendChild(sb);
      statHead.appendChild(document.createTextNode(" — authored · computed from the average day"));
      statBlock.appendChild(statHead);
      npc.stats.forEach(function (lineText, idx) {
        var sl = document.createElement("div");
        sl.className = "stat-line" + (idx > 0 ? " sig" : "");
        sl.textContent = lineText;
        statBlock.appendChild(sl);
      });
      cardEl.appendChild(statBlock);
    }

    /* schedule ribbon */
    var ribbon = document.createElement("div");
    ribbon.className = "ribbon";
    npc.sched.forEach(function (seg) {
      var i = document.createElement("i");
      i.style.left = (seg[0] / 1440 * 100).toFixed(2) + "%";
      i.style.width = ((seg[1] - seg[0]) / 1440 * 100).toFixed(2) + "%";
      i.style.background = (PALACE.states[seg[2]] || { color: "#555" }).color;
      i.title = fmt(seg[0]) + "–" + fmt(seg[1]) + " " + (PALACE.states[seg[2]] || { name: seg[2] }).name;
      ribbon.appendChild(i);
    });
    var cursor = document.createElement("u");
    cursor.id = "ribbon-cursor";
    ribbon.appendChild(cursor);
    cardEl.appendChild(ribbon);
    var scale = document.createElement("div");
    scale.className = "ribbon-scale";
    ["00", "06", "12", "18", "24"].forEach(function (slabel) {
      var sp = document.createElement("span");
      sp.textContent = slabel;
      scale.appendChild(sp);
    });
    cardEl.appendChild(scale);

    /* seven slots */
    var table = document.createElement("table");
    table.className = "slots";
    var slots = ["|Name|", "|Role|", "|Faction|", "|Dialogue|", "|Inventory|", "|Quest|", "|Stats|"];
    var slotKeys = ["name", "role", "faction", "dialogue", "inventory", "quest", "stats"];
    slots.forEach(function (slot, slotIdx) {
      var tr = document.createElement("tr");
      var td1 = document.createElement("td");
      td1.textContent = slot + ".txt";
      var td2 = document.createElement("td");
      td2.className = "sz";
      var bytes = npc.slots ? npc.slots[slotKeys[slotIdx]] : 0;
      if (slot === "|Name|" && !bytes) {
        td2.textContent = "0 B · nameplate";
      } else if (bytes) {
        td2.textContent = bytes + " B — authored";
        td2.className = "sz authored";
      } else {
        td2.textContent = "0 B";
      }
      tr.appendChild(td1); tr.appendChild(td2);
      table.appendChild(tr);
    });
    cardEl.appendChild(table);

    if (npc.name === "CREATOR" && PALACE.litany) {
      var det = document.createElement("details");
      det.className = "litany";
      var sum = document.createElement("summary");
      sum.textContent = "Read the authored nameplate (the only one in the palace)";
      det.appendChild(sum);
      var pre = document.createElement("pre");
      pre.textContent = PALACE.litany;
      det.appendChild(pre);
      cardEl.appendChild(det);
    }

    if (npc.name !== "User") {
      var el0 = npc.el;
      el0.scrollIntoViewIfNeeded ? el0.scrollIntoViewIfNeeded(false) : null;
    }
    renderCast();
  }

  /* header chips */
  var chips = document.getElementById("header-chips");
  [
    ["residents", PALACE.counts.total],
    ["rings", PALACE.counts.rings],
    ["wings", PALACE.wings.length],
    ["bedrooms fully profiled", PALACE.counts.profiled + " / " + PALACE.counts.total],
    ["authored nameplates", PALACE.counts.authored + " (CREATOR)"],
    ["average day", "24:00, deterministic"]
  ].forEach(function (pair) {
    var chip = document.createElement("span");
    chip.className = "chip";
    chip.appendChild(document.createTextNode(pair[0] + " "));
    var b = document.createElement("b");
    b.textContent = String(pair[1]);
    chip.appendChild(b);
    chips.appendChild(chip);
  });

  /* the sky card — today's weather and moon, filled once */
  (function fillSkyCard() {
    var wxText = WX_TEXT[wx.kind] || WX_TEXT.clear;
    var wxLine = document.getElementById("wx-line");
    var wxQuip = document.getElementById("wx-quip");
    wxLine.textContent = "";
    var wxB = document.createElement("b");
    wxB.textContent = wxText[0];
    wxLine.appendChild(wxB);
    wxLine.appendChild(document.createTextNode(" · " + dayKey + " · the palace's own seed"));
    wxQuip.textContent = wxText[1] + (wx.aurora ? " Aurora likely in the deep night." : "");
    var moonGlyph = document.getElementById("moon-glyph");
    var moonLine = document.getElementById("moon-line");
    var moonSub = document.getElementById("moon-sub");
    if (moonToday) {
      moonGlyph.textContent = moonToday.glyph;
      moonLine.textContent = moonToday.name + " — " + moonToday.illuminationPercent + "% lit · " + moonToday.trend;
      moonSub.textContent = "moon age " + moonToday.ageDays.toFixed(1) + " days · same approximate polynomial as the UTS watch";
    } else {
      moonGlyph.textContent = "\u263E";
      moonLine.textContent = "The Moon is out of range tonight.";
      moonSub.textContent = "";
    }
  })();

  applyDim();
  renderCast();
  requestAnimationFrame(frame);
})();
</script>
</body>
</html>
`;

/* ── Build & CLI ───────────────────────────────────────────────── */

function renderPage(data) {
  const json = JSON.stringify(data).replace(/<\//g, "<\\/");
  /* The page needs three deterministic helpers at view time (moon phase and
     weather are computed per-date in the browser, not baked at build time).
     They are serialized from this module so page and generator share one
     source. moonAtPalace / prng / hash32 must therefore stay standalone. */
  const runtime = [
    "var moonAt = " + moonAtPalace.toString() + ";",
    "var hash32 = " + hash32.toString() + ";",
    "var prng = " + prng.toString() + ";"
  ].join("\n");
  return HTML_PAGE
    .replace("__PALACE_DATA__", json)
    .replace("/*__PALACE_RUNTIME__*/", runtime);
}

async function main() {
  const check = process.argv.includes("--check");
  const data = await buildData();
  if (process.argv.includes("--json")) {
    process.stdout.write(JSON.stringify(data, null, 2) + "\n");
    return;
  }
  if (process.argv.includes("--census")) {
    const byWing = {};
    for (const npc of data.npcs) byWing[npc.wing] = (byWing[npc.wing] || 0) + 1;
    process.stdout.write("Harshal's Palace census — " + data.counts.total + " residents\n");
    for (const wing of data.wings) {
      process.stdout.write("  " + wing.name.padEnd(34) + String(wing.count).padStart(3) + "\n");
    }
    return;
  }
  const html = renderPage(data);
  if (check) {
    const committed = await readFile(OUT_PATH, "utf8").catch(() => null);
    if (committed !== html) {
      process.stderr.write("HARSHALS-PALACE.html is out of date with the roster. Run: npm run palace:build\n");
      process.exit(1);
    }
    process.stdout.write("HARSHALS-PALACE.html matches the roster (" + data.counts.total + " residents).\n");
    return;
  }
  await writeFile(OUT_PATH, html, "utf8");
  process.stdout.write("Wrote " + path.relative(ROOT, OUT_PATH) + " — " + data.counts.total + " residents, " + data.events.length + " day-book entries.\n");
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((error) => {
    process.stderr.write(String(error && error.stack ? error.stack : error) + "\n");
    process.exit(1);
  });
}

export { buildData, renderPage, ARCHETYPES, WING_DEFS, FACTIONS, moonAtPalace };
