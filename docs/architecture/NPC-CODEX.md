# NPC Codex — |User|'s Cast of Characters

The file/folder superstructure is the world; named empty files are the
**NPCs**. Every `|Name|.txt` is a character sheet placeholder. Every
`Name.#` is a Suuperposition / Hypperposition contact — an entity elevated
onto the high-speed rolodex. Every `Name.$` is a currency, pass, deploy
token, color clearance chip, or key card. `.gitkeep`s are unfilled spawn
slots. Empty files and Finder aliases are reserved NPC slots whose names
*are* the point.

NPCs are arranged by ring, matching the |User|-centric superstructure in
[`USER-CENTRIC-SUPERSTRUCTURE.md`](USER-CENTRIC-SUPERSTRUCTURE.md).

---

## Token key

| Token extension | Role | Location convention |
|---|---|---|
| `|Name|.txt` | Cast NPC — a named being with agency | Placed inside the folder that matches their posting; the filename is their nameplate |
| `Name.#` | Suuperposition / Hypperposition entity — a high-authority contact on the rolodex (DARPA, DoD, Suuperposition* worlds, Paintelephone operators, lounge pass color codes) | `TOTOPOTUS's Rolodex/`, `War Powers And Activities/`, `WA1111-N Paintelephone Operations/Directory/`, Lounge Pass Color Coding Reference List |
| `Name.$` | Currency/pass/clearance/deploy token — a key card, color chip, deploy order, or currency | `Access/Alphabet/` (the 13 canonical Path colors), `Art Mage N's Insurance Company/` (Deploy.$, AdvancedAttackResearchProjectsANET.$, etc.) |
| `.gitkeep` | Unfilled spawn slot — the room exists; the NPC hasn't checked in yet | Every empty reserved folder |
| `Name|.txt` (pipe on the right) | Contact stub — an NPC whose entry is in progress (e.g. `AlexaELizard|`, `ChildSupport|`, `Results|`, `Sisters|` inside CleanSlateOS) | AUM OS subfolders under `archives/imports/` |

---

## Roster directory

Because the public asset staging allowlist copies everything under `css/`,
`js/`, `assets/`, `specs/`, `manuscript/`, and selected portions of
`docs/`, NPC nameplates cannot be dropped into those folders without leaking
into the browser bundle. All **runtime/staff NPCs** for staged rings
(Rings 1–3) are therefore rostered together in:

```
docs/architecture/npcs/
```

Each `|NPC Name|.txt` in that directory is the nameplate; the table below
states the posting the NPC is assigned to. In-world castle NPCs (Ring 5 —
`business plan/`, `archives/`, `updates/`, `scripts/`, `tests/`,
`case-studies/`, `worker/`, `migrations/`, `source/`) are placed directly at
their posting because those folders are not staged as browser assets.

---

## Ring 0 — The Pupil (ALL-SEEING EYE PURPLE)

**|User|** is the only NPC at the center. Their canonical character sheet
token is:

- `source/|User|.txt` — the player character nameplate. The file is the
  origin address; the human key is the player at the keyboard.

Companion tokens that describe the player (already present inside the
`CleanSlateOS` AUM OS under `archives/imports/`):

- `|UserName|.txt`, `|UserLocation|.txt`, `|UserHistory|.txt`, `|End User|.txt`

## Ring 1 — The Iris / Gate (VISION RED)

These NPCs guard the decision gate. They are the inner court; they see
every Phase Declaration Header before anyone else does. Nameplates rostered
in `docs/architecture/npcs/` (not placed in `specs/` which is a staged
asset directory):

| NPC | Posting | Role |
|---|---|---|
| `|The Magistrate|.txt` | `specs/normative/` | keeper of the ratified baseline; refuses to let drafts pass as law |
| `|The Contradiction Ledger Keeper|.txt` | `specs/normative/contradictions.md` | clerk of the contradictions ledger; logs every CL entry |
| `|The Amendment Scribe|.txt` | `specs/draft/` | caretaker of unratified amendments; wears a different sash |

## Ring 2 — The Orb / Runtime (DAY WHITE)

The crew that runs the shell while |User| is looking. Nameplates in
`docs/architecture/npcs/` (not placed in `js/`, `css/`, or `assets/` which
are staged):

| NPC | Posting | Role |
|---|---|---|
| `|Boot|.txt` | `js/boot.js` | Boots the kernel, mounts the window manager |
| `|The Kernel|.txt` | `js/kernel.js` | Executes the Permit/Refuse decision gate |
| `|The Window Manager|.txt` | `js/wm.js` | Draws the desktop; arranges icons on the grid |
| `|The Flame Tender|.txt` | `assets/flame/` | Advances the 120-frame inner flame |
| `|The Orb Weaver|.txt` | `assets/orb/` | Advances the 200-frame iris animation |
| `|The Outer Flame Warden|.txt` | `assets/outer_flame/` | Advances the 600-frame outer corona |
| `|The OCM Operator|.txt` | `js/ocm-*.js` | Routes messages along the Resolution Axis |
| `|The Timekeeper|.txt` | `js/uts.js` | Drives the display-only UTS clock |
| `|The Moon Watcher|.txt` | `js/celestial-context.js` | Approximate Moon/Sun readouts (display-only) |
| `|The LLM Relay|.txt` | `worker/llm-relay.mjs` | Relays free-tier model traffic; never stores keys |
| `|The Storage Attendant|.txt` | `worker/storage.mjs` | Handles optional cloud-storage APIs |

## Ring 3 — The Book / Sclera (CONVERGENCE CYAN)

Librarians, readers, and the manuscript narrator. Nameplates in
`docs/architecture/npcs/` (not placed in `docs/harshal-systems/` or
`manuscript/` which are staged/published):

| NPC | Posting | Role |
|---|---|---|
| `|The Librarian|.txt` | `docs/harshal-systems/` | Curates the 42-file reference library |
| `|The Core Book Reader|.txt` | `docs/harshal-systems/01-core-book.md` | Turns pages of Part I |
| `|The Manuscript Narrator|.txt` | `manuscript/the-grand-river-foundation/` | Reads chapters 00–08 for the Novel tab |
| `|The Publications Printer|.txt` | `publications/` | Compiles .docx / assembled .md editions |
| `|The Editor|.txt` | `docs/harshal-systems/EDITORIAL-REPORT.md` | Maintains the Editorial Report between builds |
| **Convergence Universe NPCs** | world canon (RTF) | GELPA, Celestial Engineers, Quantum Librarians, Starforged Consortium, Hermes Intergalactic, Orion Express, Nebula Harmonics, Interstellar Council, GigaCorp/Panoptes, Vulcan Freight |

## Ring 4 — Assurance / Observatory (STORM BLUE / BALANCE GREEN / REPLICATOR GRAY)

These folders are **not** staged as browser assets, so NPC nameplates live
directly at their postings.

**Auditors** (STORM BLUE) — placed on-post:

| NPC | Posting |
|---|---|
| `|The Case Study Registrar|.txt` | `case-studies/` |
| `|The Badge Engraver|.txt` | `case-studies/badges/` |
| `|The D1 Seed Sower|.txt` | `case-studies/d1/` |
| `|The Storm Watcher|.txt` | `updates/2026-10-02/01-Threat-Intelligence/Storm-0558/` |
| `|The Supply Chain Inspector|.txt` | `archives/Supply Chain/Documentation/` |
| `|The Assurance Verifier|.txt` *(rostered)* | `docs/architecture/npcs/` (posting: `js/good-intelligence-assurance.js`) |

**Assurance & market** (BALANCE GREEN) — placed on-post (worker/ and scripts/ are not staged):

| NPC | Posting |
|---|---|
| `|The Market Tickerbot|.txt` | `worker/` |
| `|The Moon Phases Scribe|.txt` | `scripts/pine/` |
| `|The Pine Script Archivist|.txt` | `scripts/pine/` |

**Replicators / builders** (REPLICATOR GRAY) — placed on-post:

| NPC | Posting |
|---|---|
| `|The Asset Stager|.txt` | `scripts/` |
| `|The Book Library Indexer|.txt` | `scripts/` |
| `|The Manuscript Indexer|.txt` | `scripts/` |
| `|The Integrity Reporter|.txt` | `scripts/` |
| `|The Docx Exporter|.txt` | `scripts/` |
| `|The D1 Migration Clerk|.txt` | `migrations/community/` |

Testers (REPLICATOR GRAY) are the 44 `*-test.mjs` files under `tests/`;
additionally:

| NPC | Posting |
|---|---|
| `|The Red Team Adversary|.txt` | `tests/` |

## Ring 5 — The Outer Dark / Archive (VOID BLACK / DEATH ACID / ETERNAL HORIZON ORANGE)

Beyond the outer flame. NPCs here have been retired, sealed, quarantined,
or wait at the receiving dock. All of `archives/` is outside the public
allowlist, so nameplates live on-post.

**Quarantine guards** (DEATH ACID):

| NPC | Posting |
|---|---|
| `|The Duplicate Quarantine Warden|.txt` | `archives/Duplicates/` |

**Archivists** (REPLICATOR GRAY):

| NPC | Posting |
|---|---|
| `|The Legacy Curator|.txt` | `archives/ags-legacy-exports/` |
| `|The Flame Render Curator|.txt` | `archives/flame-renders/` |
| `|The Eye Animation Curator|.txt` | `archives/animation-source/eye-closing/` |
| `|The Preview Art Curator|.txt` | `archives/HarshalOS Previews/` |
| `|The Manuscript Draft Curator|.txt` | `archives/Manuscript Working Drafts/` |
| `|The RTF Snapshot Curator|.txt` | `archives/manuscript-rtf/` |
| `|The Screenshot Librarian|.txt` | `archives/screenshots/2026-08/` |
| `|The Source Bundle Receiver|.txt` | `archives/source-bundles/` |
| `|The Ground-0 Historian|.txt` | `archives/ground-0/` |
| `|The Import Dock Master|.txt` | `archives/imports/` |

**In-world castle NPCs** (ETERNAL HORIZON ORANGE) — these are posted in the
reserved slots under `business plan/` (none of which is staged):

| NPC | Posting |
|---|---|
| `|TOTOPOTUS|.txt` | `business plan/StarPortal/Access/Alphabet/TOTOPOTUS/` |
| `|Captain of the Loyal Wings|.txt` | `…/TOTOPOTUS's Loyal Wings/` |
| `|Captain of the Royal Wings|.txt` | `…/TOTOPOTUS's Royal Wings/` |
| `|The Characters Roster Keeper|.txt` | `…/TOTOPOTUS's Characters Under Management/` |
| `|The Agency Director|.txt` | `…/TOTOPOTUS's Agencies Under Management/` |
| `|The Fleet Admiral|.txt` | `…/TOTOPOTUS's Imperial Fleet/` |
| `|The Chief Enginseer|.txt` | `…/TOTOPOTUS's Imperial Machinae/` |
| `|The Shadow Hand|.txt` | `…/TOTOPOTUS's Stealth Technicians/` |
| `|The Data Lake Custodian|.txt` | `…/TOTOPOTUS's Server Farms and Data Lakes/` |
| `|The Inkeeper|.txt` | `…/Combined/InterstellarLounge/Inn/` |
| `|The Chef|.txt` | `…/InterstellarLounge/Restaurant/` |
| `|The Lounge Receptionist|.txt` | `…/InterstellarLounge/Check In ANDOR Check Out/` |
| `|The Information Hub Attendant|.txt` | `…/InterstellarLounge/Services/Information Hub/` |
| `|The Museum Curator|.txt` | `…/InterstellarLounge/Services/Museums/` |
| `|The Transportation Concierge|.txt` | `…/InterstellarLounge/Services/Transportation Services/` |
| `|The Repair Technician|.txt` | `…/InterstellarLounge/Services/Repair Work/` |
| `|The Clown Provost|.txt` | `…/Telekinetic Psycopathy Operations/Actually Good Alignment 1/Clown College/` |
| `|The Corporate Liaison|.txt` | `…/Telekinetic Psycopathy Operations/Actually Good Alignment 1/Corporations/` |
| `|The Paintelephone Operator WA1111-N|.txt` | `…/WA1111-N Paintelephone Operations/Paintelephone/` |
| `|The Whyland Standard Bearer|.txt` | `…/War Declaration/(THE, Owner)'s Whyland Standard/` |
| `|The Sorter Apprentice|.txt` | `…/TO SORT/Documents in progress/` |
| `|The Receiving Clerk|.txt` | `…/TO SORT/Stuff/` |
| `|The Disclaimer Clerk|.txt` | `…/Disclaimer/Disclaimers/` |
| `|The EmptyFolder Disclaimer Clerk|.txt` | `…/Disclaimer/EmptyFolder Disclaimer/` |
| `|Johnny Chimpo|.txt` | `…/Time Gainer/Johnny Chimpo/` (AUM OS familiar) |
| `|Meowie Wowie|.txt` | `…/Time Gainer/Meowie Wowie/` (AUM OS familiar) |
| `|The Repeater|.txt` | `…/Time Gainer/Repeater/` (echo entity) |

## Bestiary (Container / Valve alphabets)

The Container alphabet under `archives/imports/New Models/Container/` (Armoire
… Zoids) and the Valve alphabet under `…/Valve/` (AirwayS … ZebraS) are **not**
NPCs — they are the *inventory* and *plumbing* NPCs use. Each A–Z entry is a
spawn room of that container/valve type. The creatures inside those containers
are populated from the `Weaponizing The Help/{Animals,Assassins,Demons,Devils,
Immigrants,Locals,Monsters,Poisons,Savages,Soldiers,Supply Chains}/` folders
and the AUM OS CleanSlateOS pipe-tokens.

## The |EmptyFile| sentinel

`|EmptyFile|.txt` (found at `…/TheWhylandStandard/API/|EmptyFile|.txt`) is the
system's NPC null token — analogous to `EMPTY.$` on the Path color wheel.
It marks an NPC slot that is deliberately empty. It is not a bug; it is the
"nobody here" placard.

---

## Placing a new NPC

1. Pick a folder whose title already describes the posting (don't create a
   new folder unless a posting genuinely does not exist).
2. Name the file `|NPC Name|.txt` using the pipe-delimited convention.
3. Leave it 0-byte unless/until a character sheet is authored. The name is
   the roster entry; the file is the nameplate.
4. If the NPC should appear on the high-speed rolodex, also create a
   `NPC Name.#` token in the appropriate `…/Rolodex/` or `…/Paintelephone/`
   directory.
5. If the NPC carries a clearance, key, or currency chip, create a
   matching `NPC Name.$` token in `Access/Alphabet/` or the appropriate
   token directory.
6. Never delete an `.gitkeep` when placing an NPC; leave it in place so
   the slot reservation is explicit (the slot was there first; the NPC
   has checked in).
