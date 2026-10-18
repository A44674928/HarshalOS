# HarshalOS integration plan — FRONTIERSHIP / OUTPOST ONE

## Current implementation: registered desktop app + named deploy allowlist

- `js/apps-frontiership.js` registers `frontiership-outpost-one` in the HarshalOS `APPS` registry before `boot.js` starts the shell. Its `⌂` glyph and `OUTPOST ONE` label therefore appear in the normal desktop grid and app menu.
- `css/frontiership.css` provides app-scoped styling. `index.html` loads the stylesheet and app module as part of the regular desktop bundle.
- The app contains user-directed program and economic assumptions. Cloudflare Access is the external access boundary; the app itself, the Worker static asset binding, and this asset stager do not authenticate or authorize users.
- `scripts/prepare-assets.mjs` stages only explicitly named OUTPOST media and terrain files under `/private/` and `/terrain/`. It does not copy the project folder, render sources, workbooks, full plan documents, or `terrain_real/` wholesale.
- The **Site & Terrain** tab now opens directly to the large live 3DEP/NAIP parcel-and-terrain viewer; video cards no longer precede or push it below the fold. A separate **Videos** tab leads with the new 3:56 investor cut, then labels the older 5-minute Best-Wishes editions and 9-minute feature as archival. The cut is copied only as the explicit `/private/outpost-one-investor-cut.mp4` asset; its guide, renderer, and WAV source clips remain repository-only.
- `harshalos-private-preview.html` opens the existing desktop without injecting a duplicate app; the icon remains visible, with a separate open/restore button. `private-preview-server.mjs` is the allowlisted local development server and is not a production server.
- **Deployment gate:** verify Cloudflare Access covers the complete host and direct static/media paths, including `/js/apps-frontiership.js`, `/css/frontiership.css`, `/private/*`, and `/terrain/*`. This repository does not configure or verify that policy. Do not deploy this bundle to an unprotected staging host or preview URL.

## Current phase and digital review disposition (2026-10-17)

- All current program and amenity concepts are assigned to **Engineered Connections** for digital coordination. This is a workflow phase only; no concept is engineered, selected, approved, or sealed.
- The app's **Review & connections** panel presents a role-based code/zoning screen, an open register of twelve engineering, data-governance, and component-safety interfaces, and a prioritized list of missing evidence. The full non-certifying review is `DIGITAL_CODE_ZONING_REVIEW.md`; the preparatory scope and handoff roadmap is `ENGINEERING_FRONTLOAD_PLAN.md`.
- The front-load plan distinguishes preparatory calculations, traceable source work, and coordinated test-fits from engineering sign-off. It prioritizes the area-only AR-5 pass, then identifies the official-use, survey, accessible-route, well/water, wastewater, civil, MEP, and life-safety inputs to assemble before local design work.
- User-provided county parcel screenshots display **Unincorporated Coconino County**, **AR-5 — Agricultural Residential, 5-acre minimum**, overlay **N/A**, **Lighting Zone II**, and **“No permits found.”** The displayed area-only screen passes: **5.59 > 5.00 acres by 0.59 acres**. The screenshots have not been live-verified; that permit-panel result is not a certified history. The controlling ordinance/code editions, use interpretations, title/access, survey, use/occupancy schedule, and engineering basis remain open. The app therefore reports **NOT ASSESSED**, not compliant/noncompliant. “Open” is an evidence status, not a violation.
- The road-rights concern remains user-reported and independently unverified. No local professional or agency was contacted. The new review document is repository-only and is intentionally excluded from runtime/deployment assets.
- No live deployment is authorized or performed; Cloudflare Access remains external and unverified.

## Product structure

The project cockpit separates six concerns so the build idea, operating entity, economics, and site evidence do not collapse into one unqualified plan:

1. **Overview** — FRONTIERSHIP → OUTPOST ONE brand tree, current concept, headline operating premises, and engineered-connections digital-review status.
2. **Build & operations** — one lean, repeatable plan across the whole build replaces the former cost-unlimited max-house as the active baseline; the bermed wing is an option to test against site and cost constraints. Other concepts include a 20–50 kW sustained lab target, BYO rented compute/demo closet, 30+ day cohorts/no STR, emergency-capable medical concept, wellness/greenhouse ideas, and 18% / 210 CY / five-ponderosa targets. The program panel also records the owner-provided ATBI macro-demonstrator thesis, functional-weighting premise, CPU-team participation / opt-in intent for others, and a current scenario of 62 bedrooms / 57 intended rentals with two owner rooms plus three unallocated. These remain concepts, not validated technology, approved capacity, or revenue.
3. **Site & Terrain** — the public 3DEP/NAIP viewer, ten EPQS samples, and GIS parcel outline occupy a dedicated tab with the viewer first and no video cards above or below it. The parcel boundary is assessor/GIS geometry and the elevation values are spot samples, not survey control.
4. **Videos** — the new 3:56 investor cut is first; the 5-minute Best-Wishes films and 9-minute feature follow as archival, unchanged concepts. Only the investor MP4 is added to the named runtime list at `/private/outpost-one-investor-cut.mp4`. Its script/guide, renderer, and WAV sources remain private. Every film remains concept-only and does not establish site layout, room schedule, capacities, approvals, engineering, or returns.
5. **Business model** — the selected working rate is **$4,800 per rentable room-month** for an all-in resident bundle (room + lab/program access + defined amenities); shared occupancy does not multiply the room price. The exact amenity roster, contract, payer, service costs, demand, and room-level capacity remain TBD and market-unvalidated. The legacy workbook still calculates $4,800 × 57 modeled beds, which is not the selected 57-room basis or a lean-plan pro forma; beds, bedrooms, people, whole units, and room-month bundles remain separate denominators. The old $3,600 whole-2-bedroom-unit case and rejected $1,100–$1,900 bed-month study rates are historical only. No funding is committed. See `OUTPOST_ONE_UNIFIED_PLAN.md` and `OUTPOST_ONE_PARTNER_BRIEF.md`.
6. **Review & connections** — role-based digital code/zoning screen, twelve-item engineered-connections register, missing-input priorities, and provenance/limits. No zoning or code compliance determination is made.

## Data and status model for a later integrated version

If this prototype is approved for broader use, put project data in a small versioned manifest rather than scattering values through UI strings. Every value should carry:

- `claim` — the displayed statement/value;
- `kind` — one of `user_directive`, `public_source`, `planning_assumption`, `unverified`, or `superseded`;
- `source` — a URL or local document identifier;
- `observed_at` / `effective_date` — when known;
- `confidence` and `limits` — enough context to prevent assumptions becoming facts;
- `status` — e.g. `current`, `needs_reconciliation`, or `awaiting_external_review`.

The terrain sources should remain distinct: the parcel polygon is assessor GIS, EPQS is a set of point queries, and the 1-meter DEM is a separate live 3DEP raster locked to source ID 86167. Historical aerial dates should remain attached to the imagery source; known 2019 date conflicts must not be flattened into one date.

## Access and deployment boundary

The app is now registered and the named static media/terrain routes are included by the asset stager. Its browser module includes site and economic premises, so a static deployment is safe only when the external access policy protects it end-to-end.

1. Cloudflare Access must cover the main HTML shell and direct requests to `/js/apps-frontiership.js`, `/css/frontiership.css`, `/private/*`, and `/terrain/*`—not only navigation to the home page.
2. Access is configured outside this repository. Neither `wrangler.jsonc` nor the asset stager installs or verifies the policy; the comments and visible badge are reminders, not enforcement.
3. Protect staging/branch-preview hostnames separately or keep them disabled. Protection of `main.empty.domains` does not automatically protect a different hostname.
4. Keep workbooks, full business plans, medical/legal notes, renderer sources, `DIGITAL_CODE_ZONING_REVIEW.md`, `ENGINEERING_FRONTLOAD_PLAN.md`, and unapproved pre-development files out of the asset list. The stager deliberately copies only the named runtime assets above.
5. Keep the app read-only. A digital consistency pass does not authorize a design iteration or replace appropriately credentialed local professional/agency review.

The app now has separate Site & Terrain and Videos tabs; the named runtime list adds only the investor MP4, not the project directory or its source materials. No Cloudflare Access policy was changed or verified, no production/staging deployment was performed, and no local professional/agency review or broader development-plan iteration is represented as complete.
