# HarshalOS integration plan — FRONTIERSHIP / OUTPOST ONE

## Current implementation: registered desktop app + named deploy allowlist

- `js/apps-frontiership.js` registers `frontiership-outpost-one` in the HarshalOS `APPS` registry before `boot.js` starts the shell. Its `⌂` glyph and `OUTPOST ONE` label therefore appear in the normal desktop grid and app menu.
- `css/frontiership.css` provides app-scoped styling. `index.html` loads the stylesheet and app module as part of the regular desktop bundle.
- The app contains user-directed program and economic assumptions. Cloudflare Access is the external access boundary; the app itself, the Worker static asset binding, and this asset stager do not authenticate or authorize users.
- `scripts/prepare-assets.mjs` stages only explicitly named OUTPOST media and terrain files under `/private/` and `/terrain/`. It does not copy the project folder, render sources, workbooks, full plan documents, or `terrain_real/` wholesale.
- The Site & Terrain tab leads with the 5-minute, 1080p / 24 fps Best-Wishes 3D film in two editions: a narrated copy with a chapter-aligned AI-generated English voice-over and no music, plus the original silent picture master. The standalone narration MP3, shared poster, and guide are linked; the original 9-minute 1080p / 12 fps feature, OBJ/MTL ZIP, and selected terrain viewer/data remain. The earlier 24-second film remains a secondary reference.
- `harshalos-private-preview.html` opens the existing desktop without injecting a duplicate app; the icon remains visible, with a separate open/restore button. `private-preview-server.mjs` is the allowlisted local development server and is not a production server.
- **Deployment gate:** verify Cloudflare Access covers the complete host and direct static/media paths, including `/js/apps-frontiership.js`, `/css/frontiership.css`, `/private/*`, and `/terrain/*`. This repository does not configure or verify that policy. Do not deploy this bundle to an unprotected staging host or preview URL.

## Product structure

The project cockpit separates five concerns so the build idea, operating entity, economics, and site evidence do not collapse into one unqualified plan:

1. **Overview** — FRONTIERSHIP → OUTPOST ONE brand tree, the current concept, headline operating premises, and the partner-meeting hold.
2. **Build & operations** — forest-cabin residence, bermed wing, 20–50 kW sustained lab target, BYO rented compute/demo closet, 30+ day cohorts, emergency-capable medical concept, Nordic sauna/hot-soak/cold-plunge/rest circuit, greenhouse-to-table shared dining, and the standing 18% / 210 CY / five-ponderosa guardrails. New amenities are visual concepts; water, heat, wastewater, staffing, safety, and operating loads remain unvalidated.
3. **Site & terrain** — the live public 3DEP/NAIP viewer, the 10 EPQS samples and GIS parcel outline, plus the 5-minute Best-Wishes ray-traced 3D concept in two separate editions (chapter-aligned AI narration and a preserved silent master) and the preserved 9-minute silent feature. The narrated copy uses the same H.264 picture stream, with a separate MP3 narration master; no music is added. The Best-Wishes picture adds high-tech concept graphics and a side-on HQ cutaway; the 9-minute feature keeps its longer pixel-art walkthrough and broader room/system overviews. The Best-Wishes editions share a poster and guide; all remain concept-only. Their ten-point interpolated surface, massing, room bands, paths, and system links are illustrative, not survey control, engineering, or design-scale.
4. **Business model** — the $4,800/month bundle premise, owner ≈1/12 capacity, and the bundle-parity/amenity-over-match stance, now including wellness and greenhouse-to-table experience cues as unpriced assumptions. Detailed spreadsheet projections are intentionally not loaded into this prototype.
5. **Evidence & gates** — explicit separation of user directives, public-source observations, unresolved assumptions, and superseded synthetic terrain. The partner meeting is a decision gate, not a trigger for automatic plan changes.

## Data and status model for a later integrated version

If this prototype is approved for broader use, put project data in a small versioned manifest rather than scattering values through UI strings. Every value should carry:

- `claim` — the displayed statement/value;
- `kind` — one of `user_directive`, `public_source`, `planning_assumption`, `unverified`, or `superseded`;
- `source` — a URL or local document identifier;
- `observed_at` / `effective_date` — when known;
- `confidence` and `limits` — enough context to prevent assumptions becoming facts;
- `status` — e.g. `current`, `needs_reconciliation`, or `awaiting_partner_review`.

The terrain sources should remain distinct: the parcel polygon is assessor GIS, EPQS is a set of point queries, and the 1-meter DEM is a separate live 3DEP raster locked to source ID 86167. Historical aerial dates should remain attached to the imagery source; known 2019 date conflicts must not be flattened into one date.

## Access and deployment boundary

The app is now registered and the named static media/terrain routes are included by the asset stager. Its browser module includes site and economic premises, so a static deployment is safe only when the external access policy protects it end-to-end.

1. Cloudflare Access must cover the main HTML shell and direct requests to `/js/apps-frontiership.js`, `/css/frontiership.css`, `/private/*`, and `/terrain/*`—not only navigation to the home page.
2. Access is configured outside this repository. Neither `wrangler.jsonc` nor the asset stager installs or verifies the policy; the comments and visible badge are reminders, not enforcement.
3. Protect staging/branch-preview hostnames separately or keep them disabled. Protection of `main.empty.domains` does not automatically protect a different hostname.
4. Keep workbooks, full business plans, medical/legal notes, renderer sources, and unapproved pre-development files out of the asset list. The stager deliberately copies only the named runtime assets above.
5. Keep the app read-only until the partner review authorizes another planning iteration.

The app registration and deploy-list are included in this change. No Cloudflare Access policy was changed and no production/staging deployment was performed; pro forma publication and broader development-plan iteration remain out of scope.
