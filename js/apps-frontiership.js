/*
 * FRONTIERSHIP · OUTPOST ONE — project app for the HarshalOS desktop.
 * This bundle contains private project and economic assumptions. Cloudflare
 * Access must gate the site and every static/media route; this client module
 * is not authentication or an access-control boundary.
 */
"use strict";

(() => {
  const app = {
    id: "frontiership-outpost-one",
    title: "FRONTIERSHIP · OUTPOST ONE",
    short: "OUTPOST ONE",
    glyph: "⌂",
    desc: "FRONTIERSHIP project cockpit — program, site evidence, concept films, and partner decision gate",
    w: 1180,
    h: 840,
    fullscreen: true,
    render(body) {
      body.innerHTML = `
        <div class="frontiership-app">
          <header class="fo-header">
            <div class="fo-brand-block">
              <div class="fo-eyebrow">FRONTIERSHIP · ACCESS-GATED PROJECT DESK · CONCEPT ONLY</div>
              <h1>OUTPOST ONE</h1>
              <p>Flagship High Desert AI Lab HQ · APN 30055004 · Coconino County, Arizona</p>
            </div>
            <div class="fo-gate" role="status">
              <span class="fo-gate-dot" aria-hidden="true"></span>
              <div><strong>PARTNER GATE PENDING</strong><small>No broader plan iteration in this prototype</small></div>
            </div>
          </header>

          <div class="fo-private-banner"><strong>CLOUDFLARE ACCESS · EXTERNAL GATE</strong><span>Access must cover the desktop and every static/media route. This read-only browser app is not authentication or an access-control boundary.</span></div>

          <nav class="fo-tabs" role="tablist" aria-label="OUTPOST ONE project sections">
            <button type="button" role="tab" aria-selected="true" class="active" data-tab="overview">Overview</button>
            <button type="button" role="tab" aria-selected="false" data-tab="program">Build &amp; operations</button>
            <button type="button" role="tab" aria-selected="false" data-tab="site">Site &amp; terrain</button>
            <button type="button" role="tab" aria-selected="false" data-tab="model">Business model</button>
            <button type="button" role="tab" aria-selected="false" data-tab="evidence">Evidence &amp; gates</button>
          </nav>

          <main class="fo-main">
            <section class="fo-panel" role="tabpanel" data-panel="overview">
              <div class="fo-hero-grid">
                <article class="fo-card fo-idea-card">
                  <div class="fo-card-kicker">THE IDEA · CURRENT DIRECTION</div>
                  <h2>A safety-first frontier lab built around the full long-stay experience.</h2>
                  <p>Make this parcel the FRONTIERSHIP flagship: an income-first, modern forest-cabin HQ that combines a 20–50 kW sustained AI lab, long-stay researcher cohorts, a small on-site medical facility with emergency capabilities, and an experience-led amenity layer. The current concept adds a Nordic-style thermal circuit and greenhouse-to-table commons; facility, operating entity, and pro forma stay joined for review.</p>
                  <div class="fo-tags"><span>USER-DIRECTED CONCEPT</span><span>NOT A BUILD APPROVAL</span></div>
                </article>
                <article class="fo-card fo-status-card">
                  <div class="fo-card-kicker">PROJECT STATE</div>
                  <div class="fo-state-title">Awaiting partner meeting</div>
                  <p>The current job is to consolidate the idea and evidence, not advance design, permitting, financing, or procurement.</p>
                  <div class="fo-state-rule"><span>Gate</span><strong>Partner review before next iteration</strong></div>
                </article>
              </div>

              <div class="fo-metric-grid">
                <div class="fo-metric"><span>Target package premise</span><strong>$4,800 / month</strong><small>Suite + lab + program bundle; validate before underwriting</small></div>
                <div class="fo-metric"><span>AI capability</span><strong>20–50 kW sustained</strong><small>Frontier target; not 1–5 kW or 40+ kW colo</small></div>
                <div class="fo-metric"><span>Operating horizon</span><strong>30+ day cohorts</strong><small>No short-term rental model</small></div>
                <div class="fo-metric"><span>Owner allocation</span><strong>≈ 1/12 capacity</strong><small>Planning premise, capacity definition to reconcile</small></div>
              </div>

              <div class="fo-two-col">
                <article class="fo-card">
                  <div class="fo-card-kicker">BRAND ARCHITECTURE</div>
                  <div class="fo-brand-tree"><strong>FRONTIERSHIP</strong><span>Master brand · company · thesis</span><i></i><strong>OUTPOST ONE</strong><span>This property · flagship HQ</span><i></i><strong>SAFETY FIRST</strong><span>Standard / certification across properties — not a property name</span></div>
                </article>
                <article class="fo-card">
                  <div class="fo-card-kicker">PRICING STANCE</div>
                  <h3>Bundle parity, amenity over-match</h3>
                  <p>Compete against San Francisco-level rent with a comparable monthly price premise and a stronger, explicit amenity bundle. The $4,800 figure is a target assumption, not a validated market rate or commitment.</p>
                  <button class="fo-link-button" type="button" data-go="model">Review the model assumptions <span aria-hidden="true">→</span></button>
                </article>
              </div>
            </section>

            <section class="fo-panel" role="tabpanel" data-panel="program" hidden>
              <div class="fo-panel-heading"><div><div class="fo-card-kicker">FACILITY + OPERATING MODEL</div><h2>Build program, held as directives</h2></div><span class="fo-badge amber">CONCEPT · NOT DESIGN</span></div>
              <div class="fo-program-grid">
                <article class="fo-card fo-program-card"><span class="fo-program-num">01</span><div class="fo-card-kicker">RESIDENCE</div><h3>Modern forest cabin</h3><p>Custom max-house concept with a bermed wing. Owner occupancy is part of the operating model; the resident portion is not treated as monetized inventory.</p><span class="fo-badge">USER-DIRECTED</span></article>
                <article class="fo-card fo-program-card"><span class="fo-program-num">02</span><div class="fo-card-kicker">AI LAB</div><h3>Frontier-scale, right-sized</h3><p>20–50 kW sustained capability. Bring-your-own rented compute plus a demo closet; no 40+ kW colocation path that would trigger a different land-use strategy.</p><span class="fo-badge">CAPACITY TARGET</span></article>
                <article class="fo-card fo-program-card"><span class="fo-program-num">03</span><div class="fo-card-kicker">SAFETY</div><h3>Emergency-capable medical core</h3><p>Reserve a small on-site medical facility with emergency capabilities. Clinical scope, licensure, staffing, EMS interface, and facility design remain to be professionally validated.</p><span class="fo-badge amber">LICENSURE UNVERIFIED</span></article>
                <article class="fo-card fo-program-card"><span class="fo-program-num">04</span><div class="fo-card-kicker">STAY MODEL</div><h3>Researcher cohorts</h3><p>30+ day cohorts; no STR. The accommodation, lab access, services, and safety offer are modeled together rather than as a lodging-only product.</p><span class="fo-badge">OPERATING PREMISE</span></article>
                <article class="fo-card fo-program-card"><span class="fo-program-num">05</span><div class="fo-card-kicker">WELLNESS · NEW CONCEPT</div><h3>Nordic thermal circuit</h3><p>Compact dry sauna/warm room, small hot soak, cold plunge, and quiet rest deck beside the amenity-barn concept. A wellness amenity—not medical treatment. Water, heat, wastewater, staffing, safety, and operating loads are not validated.</p><span class="fo-badge amber">FEASIBILITY GATES OPEN</span></article>
                <article class="fo-card fo-program-card"><span class="fo-program-num">06</span><div class="fo-card-kicker">COMMONS · EXPERIENCE</div><h3>Greenhouse-to-table gathering</h3><p>Shared chef-kitchen / long-table dining, greenhouse produce, and programmed communal meals support the long-stay community. Food-service scope, staffing, utilities, and any licensing remain unvalidated.</p><span class="fo-badge">AMENITY CONCEPT</span></article>
              </div>
              <article class="fo-card fo-guardrail-card">
                <div class="fo-card-kicker">MINIMUM-DISTURBANCE GUARDRAILS</div>
                <div class="fo-guardrails"><div><strong>18%</strong><span>disturbance envelope target</span></div><div><strong>210 CY</strong><span>grading target</span></div><div><strong>5</strong><span>ponderosa to retain</span></div></div>
                <p>These are standing planning directives, not verified takeoffs. The new spa/commons cues do not change the 18% / 210 CY / five-tree targets or establish feasibility; their footprint, water, power, wastewater, safety, and staffing must be reconciled before any plan or pro forma revision.</p>
              </article>
            </section>

            <section class="fo-panel fo-site-panel" role="tabpanel" data-panel="site" hidden>
              <div class="fo-panel-heading fo-site-heading"><div><div class="fo-card-kicker">CONCEPT FILM + PUBLIC REMOTE DATA · NOT SURVEY CONTROL</div><h2>Site &amp; terrain viewer</h2></div><a class="fo-external-link" href="/terrain/" target="_blank" rel="noopener">Open terrain viewer separately ↗</a></div>
              <div class="fo-site-facts"><span><b>3DEP:</b> 1 m source · raster 86167 · NAVD88</span><span><b>EPQS:</b> 10 spot samples · 7,256.2–7,283.0 ft</span><span><b>Parcel service:</b> 5.5895 GIS acres · not a survey</span></div>
              <article class="fo-film-card fo-best-wishes-card">
                <div class="fo-film-head"><div><div class="fo-card-kicker">5-MIN CINEMATIC · NARRATED · BEST-WISHES · RAY-TRACED 3D</div><h3>OUTPOST ONE — Best-Wishes narrated 3D edition</h3></div><div class="fo-film-actions"><a href="/private/outpost-one-best-wishes-3d-narrated-film.mp4" download>Download narrated film ↓</a><a href="/private/outpost-one-best-wishes-narration.mp3" download>Download voice track ↓</a><a href="/private/outpost-one-best-wishes-guide.md" download>Chapters + limits ↓</a></div></div>
                <video class="fo-concept-video" controls preload="metadata" playsinline poster="/private/outpost-one-best-wishes-3d-poster.png" aria-label="Five-minute narrated 1080p FRONTIERSHIP OUTPOST ONE Best-Wishes 3D concept walkthrough"><source src="/private/outpost-one-best-wishes-3d-narrated-film.mp4" type="video/mp4">Your browser does not support embedded MP4 playback.</video>
                <p class="fo-film-note">Separate 5-minute, 1920×1080 / 24 fps edition with AI-generated English narration, chapter-aligned voice-over, and no background music. The voice track is also available as MP3. Ray-traced 3D concept views, slow camera drift, a side-on HQ cutaway, snow, and aspirational system diagrams remain concept-only; water, wastewater, power, network, thermal, medical, fire/EMS, and optional-tunnel ideas are unverified, and 20–50 kW is a capability target—not a service-size claim. The original silent edition below and 9-minute feature remain intact.</p>
              </article>
              <article class="fo-film-card fo-best-wishes-card">
                <div class="fo-film-head"><div><div class="fo-card-kicker">5-MIN CINEMATIC · SILENT ORIGINAL · BEST-WISHES · RAY-TRACED 3D</div><h3>OUTPOST ONE — Best-Wishes silent 3D edition</h3></div><div class="fo-film-actions"><a href="/private/outpost-one-best-wishes-3d-film.mp4" download>Download silent film ↓</a><a href="/private/outpost-one-best-wishes-guide.md" download>Chapters + limits ↓</a></div></div>
                <video class="fo-concept-video" controls preload="metadata" playsinline poster="/private/outpost-one-best-wishes-3d-poster.png" aria-label="Silent five-minute 1080p FRONTIERSHIP OUTPOST ONE Best-Wishes 3D concept walkthrough"><source src="/private/outpost-one-best-wishes-3d-film.mp4" type="video/mp4">Your browser does not support embedded MP4 playback.</video>
                <p class="fo-film-note">Original silent 5-minute, 1920×1080 / 24 fps Best-Wishes picture master, preserved separately and unchanged. Ray-traced 3D concept views, slow camera drift, a side-on HQ cutaway, snow, and aspirational system diagrams. Concept visuals do not establish engineering, approvals, capacities, routes, or selected design; 20–50 kW is a capability target, not a service-size claim.</p>
              </article>
              <article class="fo-film-card">
                <div class="fo-film-head"><div><div class="fo-card-kicker">9-MINUTE PIXEL FEATURE · WHOLE-DESIGN WALKTHROUGH</div><h3>OUTPOST ONE — concept feature film</h3></div><div class="fo-film-actions"><a href="/private/outpost-one-full-feature-film.mp4" download>Download feature MP4 ↓</a><a href="/private/outpost-one-feature-film-guide.md" download>Chapters + assumptions ↓</a><a href="/private/outpost-one-concept-model.zip" download>Download OBJ model ↓</a></div></div>
                <video class="fo-concept-video" controls preload="metadata" playsinline poster="/private/outpost-one-full-feature-poster.png" aria-label="Silent nine-minute 1080p FRONTIERSHIP OUTPOST ONE concept walkthrough"><source src="/private/outpost-one-full-feature-film.mp4" type="video/mp4">Your browser does not support embedded MP4 playback.</video>
                <p class="fo-film-note">Silent 9-minute, 1920×1080 / 12 fps feature. Falling snow, slow chapter holds, Fallout Shelter–inspired side-on building cutaways with visible room zones and exterior context, animated water/wastewater, electrical, network, thermal, drainage/fire/EMS overviews, and an optional dashed tunnel study. Pixel art is upscaled 3× from a 640×360 master. Terrain, footprints, room zones, routes, and capacities remain conceptual—not survey, architecture, engineering, code, clinical, legal, or construction determinations.</p>
              </article>
              <div class="fo-iframe-frame"><iframe class="fo-terrain-frame" title="Live public terrain and historical aerial viewer for APN 30055004" loading="lazy" referrerpolicy="no-referrer" data-src="/terrain/"></iframe></div>
            </section>

            <section class="fo-panel" role="tabpanel" data-panel="model" hidden>
              <div class="fo-panel-heading"><div><div class="fo-card-kicker">ENTITY + FACILITY + ECONOMICS</div><h2>One joined model, explicit assumptions</h2></div><span class="fo-badge amber">UNVALIDATED PREMISES</span></div>
              <div class="fo-model-grid">
                <article class="fo-card"><div class="fo-card-kicker">REVENUE PRODUCT</div><h3>All-in researcher package</h3><div class="fo-big-number">≈ $4,800 / month</div><p>Current target premise for suite + full lab + program membership. Validate against three sponsor-backed comparables before underwriting. Not a published rate or reservation offer.</p></article>
                <article class="fo-card"><div class="fo-card-kicker">CAPACITY &amp; OWNER USE</div><h3>Owner ≈ 1/12</h3><p>Retain about one-twelfth of capacity for the owner; define the denominator and distinguish resident use from monetized inventory in the next reconciled model.</p></article>
                <article class="fo-card"><div class="fo-card-kicker">FACILITY / COMPUTE</div><h3>20–50 kW sustained</h3><p>BYO rented compute and a demo closet are the current infrastructure direction. Keep facility power, IT load, cooling, backup, and operating entity in the same review; do not infer a utility or permit approval.</p></article>
                <article class="fo-card"><div class="fo-card-kicker">AMENITY DIFFERENTIATION</div><h3>Safety First + experience layer</h3><p>The bundle concept now includes private suite, lab/program access, a Nordic sauna–hot soak–cold plunge circuit, greenhouse-to-table commons, and a separately scoped emergency-capable medical function. These features are not priced or feasibility-checked; spa wellness is not medical care, and the $4,800 target remains unvalidated.</p></article>
              </div>
              <div class="fo-model-note"><strong>Private financial workbook is intentionally not mounted here.</strong> This app shows the selected top-level premises only; detailed pro forma, staffing, capex, and revenue sensitivities remain outside this local viewer and must be reconciled before sharing.</div>
            </section>

            <section class="fo-panel" role="tabpanel" data-panel="evidence" hidden>
              <div class="fo-panel-heading"><div><div class="fo-card-kicker">PROVENANCE &amp; LIMITS</div><h2>Keep claims separated by evidence class</h2></div><span class="fo-badge">READ-ONLY</span></div>
              <div class="fo-evidence-grid">
                <article class="fo-card"><div class="fo-evidence-label public">PUBLIC / QUERIED</div><h3>Terrain and aerials</h3><ul><li>USGS 3DEP image service locked to raster 86167; LiDAR-derived 1 m bare-earth source.</li><li>Ten EPQS point samples; range is sampled spread, not parcel-wide extrema.</li><li>NAIP snapshots: 2013, 2017, 2019, 2021, 2023.</li><li>Arizona Water Maps parcel polygon; assessor/GIS only.</li></ul></article>
                <article class="fo-card"><div class="fo-evidence-label directive">USER DIRECTIVE</div><h3>Program and brand</h3><ul><li>FRONTIERSHIP master brand; OUTPOST ONE this HQ.</li><li>SAFETY FIRST is a standard/certification, never the property name.</li><li>Income-first, 30+ day cohorts, no STR; 20–50 kW sustained frontier target.</li><li>18% / 210 CY / five ponderosa are planning guardrails, not measured outputs.</li><li>New amenity direction: Nordic thermal circuit + greenhouse-to-table commons; still concept-only.</li></ul></article>
                <article class="fo-card"><div class="fo-evidence-label caution">UNVERIFIED / CONFLICT</div><h3>Must not become a design or legal claim</h3><ul><li>GIS acreage 5.5895 ac conflicts with earlier 5.00-acre assumptions.</li><li>EPQS date field and 3DEP source acquisition window disagree; exact DEM date unresolved.</li><li>2019 NAIP tile date and USDA date-index date differ by three days.</li><li>Parcel line, road/access rights, fence, track, grades, drainage, medical licensure, and engineering remain unverified.</li><li>Nordic spa water/heat/wastewater, food-service scope, staffing, insurance, and operating loads are not evaluated.</li></ul></article>
                <article class="fo-card"><div class="fo-evidence-label superseded">EXCLUDED FROM CURRENT TERRAIN EVIDENCE</div><h3>Synthetic terrain package</h3><p>Existing generated DEMs, contours, cross-sections, slope claims, and design placements are not used as site evidence. They must be reconciled or replaced before any detailed build model is refreshed.</p><p class="fo-small">User-reported road concern is recorded as a report only; this app does not decide legal status.</p></article>
              </div>
              <div class="fo-decision-gate"><div><span class="fo-card-kicker">NEXT AUTHORIZATION GATE</span><strong>Partner meeting</strong><p>No next-stage development plan is generated here. The partner discussion determines what to revise, validate, or pause.</p></div><span class="fo-lock" aria-hidden="true">Ⅱ</span></div>
            </section>
          </main>
          <footer class="fo-footer"><span>FRONTIERSHIP · OUTPOST ONE</span><span>Read-only concept workspace · hosting Access policy is external · not a survey, offer, permit set, medical design, or legal opinion</span></footer>
        </div>`;

      const panels = [...body.querySelectorAll("[data-panel]")];
      const tabs = [...body.querySelectorAll("[data-tab]")];
      const terrainFrame = body.querySelector(".fo-terrain-frame");
      function showPanel(name) {
        panels.forEach(panel => { panel.hidden = panel.dataset.panel !== name; });
        tabs.forEach(tab => {
          const active = tab.dataset.tab === name;
          tab.classList.toggle("active", active);
          tab.setAttribute("aria-selected", String(active));
          tab.setAttribute("tabindex", active ? "0" : "-1");
        });
        if (name === "site" && terrainFrame && !terrainFrame.dataset.loaded) {
          terrainFrame.src = terrainFrame.dataset.src;
          terrainFrame.dataset.loaded = "true";
        }
      }
      tabs.forEach(tab => tab.addEventListener("click", () => showPanel(tab.dataset.tab)));
      body.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", () => showPanel(button.dataset.go)));
      showPanel("overview");
    }
  };

  window.FRONTIERSHIP_OUTPOST_ONE_APP = app;
  if (Array.isArray(window.APPS) && !window.APPS.some(candidate => candidate.id === app.id)) {
    window.APPS.push(app);
  }
})();
