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
The whole cast can be watched living an average day in
[`HARSHALS-PALACE.html`](HARSHALS-PALACE.html) — a self-contained, deterministic
visualization of every bedroom on the map, with the full authored profile
(role, faction, dialogue, inventory, quest, stats) on every character sheet,
under date-seeded weather and the same approximate Moon as the UTS watch
(`npm run palace:build` regenerates it from this roster on disk).

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

**|User|** remains the player at the exact center. The canonical profile
nameplate is `source/|User|/|Name|.txt`; the human key is the player at the
keyboard. The same Ring 0 also includes:

- `source/Harshal's Bedroom/|Name|.txt` — the authored, concise owner profile
  for Harshal P Patel (A44674928). This is a profile record for the same
  Center Origin subject, not an independently verified identity or a second
  player. In the Palace it orbits just outside the eye so it remains selectable.

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

The crew that runs the shell while |User| is looking. Staff nameplates are
rostered in `docs/architecture/npcs/` (not placed in staged `js/`, `css/`,
or `assets/`). `source/Orb 2/` also carries the profile for the local,
read-only 3D teaching model; its labels are not registered OCM addresses:

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
| `|The Storage Attendant|.txt` | `worker/storage.mjs` | Handles optional cloud-storage APIs |

> **Vacated post.** `|The LLM Relay|` (Ring 2, `worker/llm-relay.mjs`) was removed with the
> rest of the model layer; the bedroom directory is gone with it. See
> [`../REMOVED-LLM-LAYER.md`](../REMOVED-LLM-LAYER.md).
| `source/Orb 2/|Name|.txt` | `source/Orb 2/` | Read-only 3D model of the reviewed Characters cast; display-only |

## Ring 3 — The Book / Sclera (CONVERGENCE CYAN)

Librarians, readers, and the manuscript narrator. Nameplates in
`docs/architecture/npcs/` (not placed in `docs/harshal-systems/` or
`manuscript/` which are staged/published):

| NPC | Posting | Role |
|---|---|---|
| `|The Librarian|.txt` | `docs/harshal-systems/` | Curates the 43-document reference library |
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
reserved slots under `business plan/` (none of which is staged). Each
lives in their own `|NPC Name|/` bedroom at their posting.

**TOTOPOTUS's Imperial Court** (the central castle):

| NPC | Posting |
|---|---|
| `|TOTOPOTUS|/` | `…/Access/Alphabet/TOTOPOTUS/` |
| `|Captain of the Loyal Wings|/` | `…/TOTOPOTUS's Loyal Wings/` |
| `|Captain of the Royal Wings|/` | `…/TOTOPOTUS's Royal Wings/` |
| `|The Characters Roster Keeper|/` | `…/TOTOPOTUS's Characters Under Management/` |
| `|The Agency Director|/` | `…/TOTOPOTUS's Agencies Under Management/` |
| `|The Fleet Admiral|/` | `…/TOTOPOTUS's Imperial Fleet/` |
| `|The Chief Enginseer|/` | `…/TOTOPOTUS's Imperial Machinae/` |
| `|The Cavalry Commander|/` | `…/TOTOPOTUS's Imperial Machine Cavalry/` |
| `|The Shadow Hand|/` | `…/TOTOPOTUS's Stealth Technicians/` |
| `|The Data Lake Custodian|/` | `…/TOTOPOTUS's Server Farms and Data Lakes/` |
| `|The Imperial Cartographer|/` | `…/TOTOPOTUS's Age Of Empires/` |
| `|The Lorekeeper|/` | `…/TOTOPOTUS's Age Of Mythology/` |
| `|The Swordsmith of Anduril|/` | `…/TOTOPOTUS's Anduril/` |
| `|The Master Armorer|/` | `…/TOTOPOTUS's Armory And Foundry/` |
| `|The Treasurer|/` | `…/TOTOPOTUS's Budget/` |
| `|The Censor|/` | `…/TOTOPOTUS's Censorship/` |
| `|The Exchequer|/` | `…/TOTOPOTUS's Checkbook/` |
| `|The Civilization Engineer|/` | `…/TOTOPOTUS's Civilization Engine/` |
| `|The Corona Architect|/` | `…/TOTOPOTUS's Corona Builder/` |
| `|The Doge of the Treasury|/` | `…/TOTOPOTUS's DOGE/` |
| `|The Insult Auditor|/` | `…/TOTOPOTUS's Does Harshal Think I'm Retarded Or Not/` |
| `|The Frost Mourne Captain|/` | `…/TOTOPOTUS's Frost Mourne Transportation System/` |
| `|The Ghost Robotics Handler|/` | `…/TOTOPOTUS's Ghost Robotics/` |
| `|The Ice Bourne Gauntlet Warden|/` | `…/TOTOPOTUS's Ice Bourne Gauntlet/` |
| `|The Imperial Activities Registrar|/` | `…/TOTOPOTUS's Imperial Activities And Authorities/` |
| `|The Bandwidth Referee|/` | `…/TOTOPOTUS's Is Your Internet Faster Than Mine Or Not?/` |
| `|The Ultra Fast Judge|/` | `…/TOTOPOTUS's Legal Overrides And Ultra Fast Judgement System/` |
| `|The Marine Commandant|/` | `…/TOTOPOTUS's Marine Management Apparatus/` |
| `|The Jurisdictional Refuser|/` | `…/TOTOPOTUS's My of My Own Isn't Fucking Going To Your Stinky Piss Scented Courtroom/` |
| `|The Land Number Clerk|/` | `…/TOTOPOTUS's On Land Number Generation System/` |
| `|The Palantir Seer|/` | `…/TOTOPOTUS's Palantir/` |
| `|The Prison Warden|/` | `…/TOTOPOTUS's Private Prison Containment System/` |
| `|The RTS General|/` | `…/TOTOPOTUS's Real Time Strategy/` |
| `|The Redactor|/` | `…/TOTOPOTUS's Redactions/` |
| `|The Quartermaster|/` | `…/TOTOPOTUS's Resources/` |
| `|The Risk Assessor|/` | `…/TOTOPOTUS's Risk/` |
| `|The Super Secret Server Admin|/` | `…/TOTOPOTUS's Super Secret Server/Local-ExtraDimensional-ExtraDimensional-Local/` |
| `|The Net Architect|/` | `…/TOTOPOTUS's THE-NET/` |
| `|The Veto Clerk|/` | `…/TOTOPOTUS's Vetoes/` |
| `|The Wag The Dog Spin Doctor|/` | `…/TOTOPOTUS's Wag The Dog/` |
| `|The Wallet Keeper|/` | `…/TOTOPOTUS's Wallets/` |
| `|The Watch Commander|/` | `…/TOTOPOTUS's Walls And Watches/` |
| `|The War Game Master|/` | `…/TOTOPOTUS's War Game/` |
| `|The God Ull Arbiter|/` | `…/TOTOPOTUS's Win God Ull System/` |
| `|The Insurance Trader|/` | `…/TOTOPOTUS's Insurance/TOTOPOTUS's Insurance Trading Platform/` |
| `|The Over Insurance Auditor|/` | `…/TOTOPOTUS's Insurance/TOTOPOTUS's Over Insured Areas/` |
| `|The Under Insurance Advocate|/` | `…/TOTOPOTUS's Insurance/TOTOPOTUS's Under Insured Areas/` |
| `|The Simultaneous Jobs Dispatcher|/` | `…/TOTOPOTUS's Gig Work/…/Simultaneously Running Jobs/` |
| `|The Bank of America Teller|/` | `…/Gig Work/…/Bank of America Payouts/` |
| `|The Chase Bank Teller|/` | `…/Gig Work/…/Chase Bank Payouts/` |
| `|The Desert Financial Teller|/` | `…/Gig Work/…/Desert Financial Payouts/` |

**Executive Orders Wing** — each figure named in an EO has a bedroom at
their EO folder, plus a mirror set under the Legal Directory:

| NPC | Posting |
|---|---|
| `|Al Gore|/` | `…/Executive Orders/Al Gore/` |
| `|Barack Obama|/` | `…/Executive Orders/Barack Obama/` |
| `|Donald Trump|/` | `…/Executive Orders/Donald Trump/` |
| `|The Designated Survivor|/` | `…/Executive Orders/Designated Survivor/` |
| `|George W Bush|/` | `…/Executive Orders/George W Bush/` |
| `|Joe Biden|/` | `…/Executive Orders/Joe Biden/` |
| `|Kamala Harris|/` | `…/Executive Orders/Kamala Harris/` |
| `|The White House Sitter|/` | `…/Executive Orders/White House Actual/` |
| *(+ 8 Legal Directory mirrors of the above at `…/Legal Directory/THE's Executive Orders/`)* | — legal-clerk duplicates |

**Interstellar Lounge** (Waystation):

| NPC | Posting |
|---|---|
| `|The Inkeeper|/` | `…/InterstellarLounge/Inn/` |
| `|The Chef|/` | `…/InterstellarLounge/Restaurant/` |
| `|The Lounge Receptionist|/` | `…/Check In ANDOR Check Out/` |
| `|{Color} Lounge Pass Attendant|/` (×10) | `…/Lounge Pass Color Coding Reference List/` — one per color (Dark Blue, Dark Green, Gold, Gray, Light Blue, Light Green, Orange, Red, Silver, White); each carries the matching color `.#` token in their `|Inventory|.txt` |
| `|The High Grade Lounge Attendant|/` | `…/Services/Empire High Grade Lounges/` |
| `|The WiFi Technician|/` | `…/Services/Free WiFi/` |
| `|The Restroom Attendant|/` | `…/Services/Inclusive Restrooms/` |
| `|The Lounge Attendant|/` | `…/Services/Lounges/` |
| `|The Nursing Room Attendant|/` | `…/Services/Nursing Rooms/` |
| `|The Smoking Area Concierge|/` | `…/Services/Smoking Areas/` |
| `|The Information Hub Attendant|/` | `…/Services/Information Hub/` |
| `|The Museum Curator|/` | `…/Services/Museums/` |
| `|The Transportation Concierge|/` | `…/Services/Transportation Services/` |
| `|The Repair Technician|/` | `…/Services/Repair Work/` |

**Telekinetic Psycopathy Operations** (adversarial/operational cadre):

| NPC | Posting |
|---|---|
| `|The Clown Provost|/` | `…/Actually Good Alignment 1/Clown College/` |
| `|The Corporate Liaison|/` | `…/Actually Good Alignment 1/Corporations/` |
| `|The Paintelephone Operator WA1111-N|/` | `…/WA1111-N Paintelephone Operations/Paintelephone/` |
| `|The AV Encoder|/` | `…/Audio Visual Encoding/` |
| `|The Glossary Clerk|/` | `…/Glossary/` |
| `|The Hyper Mage|/` | `…/Hyper Mage/` |
| `|The Life Files Clerk|/` | `…/Life Files/` |
| `|The Phone Number Operator|/` | `…/Phone Numbers/` |
| `|The Untitled Entity|/` | `…/untitled folder/` |
| `|CREATOR|/` | `…/SRAIE/Emperor HP/` — pre-existing 511-byte CREATOR.txt relocated into `|CREATOR|/|Name|.txt`; all other slots zero-byte |
| `|The Lead Lighter|/` | `…/SRAIE/Lighters/` |
| `|The Orphan Warden|/` | `…/SRAIE/Orphans/` |
| `|The Senior Telepath|/` | `…/SRAIE/Telepaths/` |
| `|The Unseen Agent|/` | `…/SRAIE/Unseen/` |

**Dueling Arena (META):**

| NPC | Posting |
|---|---|
| `|Harshal Priyavadan Patel (Arena Founder)|/` | `…/Arena Founders/META/Harshal Priyavadan Patel/` |
| `|Mark Zuckerberg (Arena Founder)|/` | `…/Arena Founders/META/Mark Zuckerberg/` |
| `|Harshal Priyavadan Patel (Arena Owner)|/` | `…/Arena Owners/META/Harshal Priyavadan Patel/` |
| `|Mark Zuckerberg (Arena Owner)|/` | `…/Arena Owners/META/Mark Zuckerberg/` |
| `|The Beginners Slope Marshall|/` | `…/Arena Locations/Beginners Slope/` |
| `|The Thunderdome Master|/` | `…/Arena Locations/Thunderdome/` |
| `|The Metadata Keeper|/` | `…/Arena Records/META/METADATA/` |
| `|The Results Ledger|/` | `…/Arena Results/META/METADATA/` |
| `|The Summons Server|/` | `…/Arena Summons/META/Summons/` |
| `|The Ethics Adjudicator|/` | `…/Personal/Ethics And Morals/` |
| `|The Evil Data Log Auditor|/` | `…/Evil Bad Data Collection Logs And Associated Profits ANDOR Losses/` |

**War Declaration / Whyland Standard / Financial Entities:**

| NPC | Posting |
|---|---|
| `|The Whyland Standard Bearer|/` | `…/War Declaration/(THE, Owner)'s Whyland Standard/` |
| `|The Imperial Companies Registrar|/` | `…/Companies That (THE, Empire) owns/` |
| `|The Imperial Treasury Minister|/` | `…/Financial Entities/` |
| `|The IP-Respectful Banks Ombudsman|/` | `…/Financial Entities That Do Not Support People Operating With Stolen Intellectual Property/` |
| `|The Funds Unfreezer|/` | `…/Financial Entities That Dont Freeze The Empires Funds Illegally Using Conjured Logics/` |
| `|The Cease And Desist Process Server|/` | `…/Financial Entities That Force Companies Who Illegally Freeze The Empires Funds…/` |
| `|The Federal Reserve Chair|/` | `…/Financial Entities/The Federal Reserve/` |
| `|The Consortium of Central Bankers|/` | `…/Financial Entities/The Other Central Banks/` |

**Other castle services:**

| NPC | Posting |
|---|---|
| `|The Supply Chain Tech Demo Clerk|/` | `…/Government Agencies/Supply Chain Tech Demo/Documentation/` |
| `|The Supply Chain Tech Demo Photographer|/` | `…/Government Agencies/Supply Chain Tech Demo/Visual/` |
| `|The Purist Flame Tender|/` | `…/Harshal's Body Parts/Flames/New/No Plugins/` |
| `|The Fiction Flame Tender|/` | `…/Harshal's Body Parts/Flames/New/Novel/Fiction/` |
| `|The Plugin Flame Tender|/` | `…/Harshal's Body Parts/Flames/New/Plugins/` |
| `|The Parts Scribe|/` | `…/Harshal's Body Parts/Texts/Parts/` |
| `|The Story Scribe|/` | `…/Harshal's Body Parts/Texts/Story/` |
| `|The Sorter Apprentice|/` | `…/TO SORT/Documents in progress/` |
| `|The Receiving Clerk|/` | `…/TO SORT/Stuff/` |
| `|The Disclaimer Clerk|/` | `…/Disclaimer/Disclaimers/` |
| `|The EmptyFolder Disclaimer Clerk|/` | `…/Disclaimer/EmptyFolder Disclaimer/` |
| `Johnny Chimpo/` | `archives/imports/…/Time Gainer/Johnny Chimpo/` (familiar; eponymous archive folder is the bedroom) |
| `Meowie Wowie/` | `archives/imports/…/Time Gainer/Meowie Wowie/` (familiar; eponymous archive folder is the bedroom) |
| `Repeater/` | `archives/imports/…/Time Gainer/Repeater/` (echo entity; eponymous archive folder is the bedroom) |

**Rooms deliberately left as `.gitkeep` attribute slots (no NPC placed):**

The hundreds of `Neo Apophis And (Something And)/` folders under
`Container Creation Toolkit/Harshal's User Names And/`, the `N*Ull And`
namespaced Ull-block attribute slots, the `0 Party/Documentation/*`
category directories under the AUM OS importer, and the TOTOPOTUS
legal-directory root are **attribute slots / inventory enumerations**, not
postings for cast NPCs. They retain their `.gitkeep` placeholders as
originally authored — populating those slots is a content-authoring pass
separate from NPC casting.

**Bedroom count (as of this writing): 184 bedrooms total** — 2 Ring 0
identity/profile records (`User` and Harshal's Bedroom), 18 Ring 1–3 staff
rostered in `docs/architecture/npcs/` plus the Ring 2 Orb 2 display model,
16 Ring 4 assurance/build staff on-post, 15 Ring 5 archive
curators/guards/familiars, and 133 Ring 5 in-world castle NPCs in
`business plan/` (TOTOPOTUS court, EO presidents + legal mirrors, Arena
staff, Interstellar Lounge concierge + 10 color attendants, Telekinetic
Psycopathy Ops cadre, SRAIE faction, Financial Entity ombudsmen, War
Declaration, and CREATOR).

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

Every NPC has their **own bedroom** — a folder named `|NPC Name|/` at their
posting, populated with seven pipe-delimited profile-slot tokens modeled on
the `|EmptyFile|.txt` sentinel. **The profile passes are complete**: six of
the seven palace slots are authored in every bedroom. Most nameplates stay
0-byte by design; CREATOR's alias nameplate and source-side user/model
profiles are authored exceptions.

```
posting/|NPC Name|/
├── |Name|.txt      ← nameplate (usually 0-byte; CREATOR and source profiles are authored)
├── |Role|.txt      ← AUTHORED: role title · "Posting: <path>"
├── |Faction|.txt   ← AUTHORED: faction · canonical Path color · "Ring N · <wing>"
├── |Dialogue|.txt  ← AUTHORED: one utterance per line, optional (morning|noon|evening|night) tag
├── |Inventory|.txt ← AUTHORED: one item per line (2–4 items; $ chips and # passes carried)
├── |Quest|.txt     ← AUTHORED: quest title · quest hook
└── |Stats|.txt     ← AUTHORED: schedule summary (computed from the average day) · signature stat
```

`HARSHALS-PALACE.html` reads every authored slot from the bedrooms at build
time: hovering a resident shows the line they are speaking *right now*
(selected deterministically from the lines valid at that hour), and the
character sheet lists the full profile — role, faction, dialogue with the
current line highlighted, inventory, quest, and stats (the first stats line
is recomputed from the resident's schedule, so the numbers are real). The
bedroom pattern mirrors the existing AUM OS attribute-token convention used
inside the `CleanSlateOS/` and `Repel/` trees.

### Placement rules

1. Pick a folder whose title already describes the posting (don't create a
   new folder unless a posting genuinely does not exist).
2. Create a subfolder named `|NPC Name|/` at that posting — the NPC moves
   into their bedroom; the parent directory is the hall/castle wing.
3. Populate the bedroom with the seven `|Slot|.txt` files listed above and
   author six of them per the formats in the schema block: role (title +
   posting line), faction (faction · canonical color · ring/wing), dialogue
   (2–5 utterances, optional time tags), inventory (2–4 items), quest
   (title + hook), and stats (schedule summary + signature stat).
4. If the posting folder *is already* the NPC (e.g. `Johnny Chimpo/`,
   `Meowie Wowie/`, `Repeater/` — folders named after the NPC themselves),
   treat that folder as the bedroom directly — do not double-nest.
5. If the posting folder is part of the public asset allowlist (`js/`,
   `css/`, `assets/`, `specs/normative/`, `specs/draft/`,
   `docs/harshal-systems/`, `manuscript/`), place the bedroom in
   `docs/architecture/npcs/|NPC Name|/` instead, so NPC nameplates do not
   leak into the browser bundle.
6. Never delete an `.gitkeep`, alias, or placeholder when moving an NPC in;
   the slot reservation predates the occupant.

### Token conventions (recap)

| Token extension | Role |
|---|---|
| `|Name|/|Slot|.txt` | NPC bedroom + profile slots (nameplates may be empty or authored by profile type) |
| `|Name|.txt` (legacy / in AUM OS trees) | AUM OS attribute tokens / contact stubs (left as-is in CleanSlateOS/Repel/etc.) |
| `Name.#` | Suuperposition / Hypperposition entity — a high-authority rolodex contact |
| `Name.$` | Currency/pass/clearance/deploy token — a key card held in `|Inventory|.txt` |
| `.gitkeep` | Unfilled spawn slot — a bedroom waiting for an NPC |
| `|EmptyFile|.txt` | The NPC null token (see `…/API/|EmptyFile|.txt`) |
