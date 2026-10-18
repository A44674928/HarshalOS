/*
 * FRONTIERSHIP · OUTPOST ONE — project app for the HarshalOS desktop.
 * This bundle contains private project and economic assumptions. Cloudflare
 * Access must gate the site and every static/media route; this client module
 * is not authentication or an access-control boundary.
 */
"use strict";

(() => {
  const connectionReviewRows = [
    { id: "EC-01", scope: "Authority + land use", endpoints: "APN / AR-5 → every proposed use", next: "Verify the county screenshot's Unincorporated Coconino County, AR-5, overlay N/A, and Lighting Zone II fields; retrieve the governing ordinance and use classifications." },
    { id: "EC-02", scope: "Occupancy + life safety", endpoints: "Residence · 62-bedroom scenario · cohorts · lab · medical · commons · wellness", next: "Schedule areas, persons, room sharing/bunk scenarios, first phase, operations, adopted code editions, mixed-use, egress, and accessibility." },
    { id: "EC-03", scope: "Legal access + fire / EMS", endpoints: "Public road / easements → site → buildings", next: "Resolve title and legal access; obtain fire-apparatus, turnaround, grade, and response criteria." },
    { id: "EC-04", scope: "Survey + civil / stewardship", endpoints: "Boundary · trees · grading · drainage", next: "Use survey-controlled boundary/topography and tree inventory to test 18% / 210 CY / five-tree targets." },
    { id: "EC-05", scope: "Power + compute", endpoints: "Utility / backup → distribution → IT + building loads", next: "Separate IT and facility loads; obtain utility data, critical-load needs, and cooling requirements." },
    { id: "EC-06", scope: "Water + wellness / greenhouse", endpoints: "Source → treatment / storage → domestic + amenity demand", next: "Verify source, rights, yield, quality, demand, treatment, storage, and reuse assumptions." },
    { id: "EC-07", scope: "Domestic wastewater", endpoints: "Fixtures → treatment / dispersal → reserve", next: "Obtain soils/percolation and regulatory basis; keep lab/clinical regulated waste separate." },
    { id: "EC-08", scope: "Thermal + ventilation", endpoints: "Envelope / plant → residence · lab · medical · amenities", next: "Establish envelope, occupancy, IT heat, ventilation, heat rejection, and zone loads." },
    { id: "EC-09", scope: "Network + security", endpoints: "Carrier / WAN → campus core → lab · home · medical · guest", next: "Confirm carrier/path; define throughput, redundancy, segmentation, security, and operations." },
    { id: "EC-10", scope: "Clinical · dining · optional tunnel", endpoints: "Medical / food / wellness uses · optional subgrade link", next: "Define scope/licensure and life safety; keep tunnel outside baseline pending geotech, access, egress, and approvals." },
    { id: "EC-11", scope: "Human data + AI governance", endpoints: "Component/process signals + human activity → CPU team / opt-in others → pooled data", next: "Scope the owner's intent to collect both technical and human data; CPU-team participation is intended, everyone else opt-in. Define whether core-team human-data participation is voluntary/withdrawable, plus purposes, fields, security, retention, reuse, and applicable review; reconcile with AGS V0.2 before collection." },
    { id: "EC-12", scope: "Macro demonstrator + component safety", endpoints: "Dynamic aspect / unit → identified component → container → unique pin / matched socket", next: "Define function/material, container and hazard controls, the functional-weight assignment rules and tests, unique interface specs, whether the first model is inert or functional, visible safety evidence, and applicable standards before any physical build or miniaturization." }
  ];

  const app = {
    id: "frontiership-outpost-one",
    title: "FRONTIERSHIP · OUTPOST ONE",
    short: "OUTPOST ONE",
    glyph: "⌂",
    desc: "FRONTIERSHIP project cockpit — program, site evidence, concept films, and digital code/zoning connections review",
    w: 1180,
    h: 840,
    fullscreen: true,
    render(body) {
      body.innerHTML = `
        <div class="frontiership-app">
          <header class="fo-header">
            <div class="fo-brand-block">
              <div class="fo-eyebrow">FRONTIERSHIP · ACCESS-GATED PROJECT DESK · ENGINEERED CONNECTIONS</div>
              <h1>OUTPOST ONE</h1>
              <p>Flagship High Desert AI Lab HQ · APN 30055004 · User-provided county screenshot: Unincorporated Coconino County · AR-5</p>
            </div>
            <div class="fo-gate" role="status">
              <span class="fo-gate-dot" aria-hidden="true"></span>
              <div><strong>ENGINEERED CONNECTIONS</strong><small>Digital review · no design is engineered or approved</small></div>
            </div>
          </header>

          <div class="fo-private-banner"><strong>CLOUDFLARE ACCESS · EXTERNAL GATE</strong><span>Access must cover the desktop and every static/media route. This read-only browser app is not authentication or an access-control boundary.</span></div>

          <nav class="fo-tabs" role="tablist" aria-label="OUTPOST ONE project sections">
            <button type="button" role="tab" aria-selected="true" class="active" data-tab="overview">Overview</button>
            <button type="button" role="tab" aria-selected="false" data-tab="program">Build &amp; operations</button>
            <button type="button" role="tab" aria-selected="false" data-tab="site">Site &amp; terrain</button>
            <button type="button" role="tab" aria-selected="false" data-tab="model">Business model</button>
            <button type="button" role="tab" aria-selected="false" data-tab="review">Review &amp; connections</button>
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
                  <div class="fo-state-title">Engineered connections</div>
                  <p>All concepts are in a role-based digital pre-review. Missing authority, survey, title/access, and system inputs remain open; no connection is engineered or approved.</p>
                  <div class="fo-state-rule"><span>Next gate</span><strong>Digital evidence check before local review</strong></div>
                </article>
              </div>

              <div class="fo-metric-grid">
                <div class="fo-metric"><span>Selected working bundle price</span><strong>$4,800 / room-month</strong><small>Room + lab/program + defined amenities; roster TBD</small></div>
                <div class="fo-metric"><span>Gross room-revenue potential</span><strong>$3.283M / year</strong><small>57 rooms at 100% occupancy; not a forecast</small></div>
                <div class="fo-metric"><span>AI capability</span><strong>20–50 kW sustained</strong><small>Frontier target; not 1–5 kW or 40+ kW colo</small></div>
                <div class="fo-metric"><span>Operating horizon</span><strong>30+ day cohorts</strong><small>No short-term rental model</small></div>
              </div>

              <div class="fo-two-col">
                <article class="fo-card">
                  <div class="fo-card-kicker">BRAND ARCHITECTURE</div>
                  <div class="fo-brand-tree"><strong>FRONTIERSHIP</strong><span>Master brand · company · thesis</span><i></i><strong>OUTPOST ONE</strong><span>This property · flagship HQ</span><i></i><strong>SAFETY FIRST</strong><span>Standard / certification across properties — not a property name</span></div>
                </article>
                <article class="fo-card">
                  <div class="fo-card-kicker">PRICING STANCE</div>
                  <h3>Bundle parity, amenity over-match</h3>
                  <p>The selected working price is $4,800 per rentable room-month for an all-in resident bundle: room, lab/program access, and defined amenities. Shared occupancy does not multiply the room price. The exact amenity roster, contract, and service costs remain TBD; the rate is not market-validated. The old $3,600 whole-furnished-2BR-ADU case and $1,100–$1,900 bed-month study rates are historical only.</p>
                  <button class="fo-link-button" type="button" data-go="model">Review the model assumptions <span aria-hidden="true">→</span></button>
                </article>
              </div>
            </section>

            <section class="fo-panel" role="tabpanel" data-panel="program" hidden>
              <div class="fo-panel-heading"><div><div class="fo-card-kicker">ENGINEERED CONNECTIONS · PROGRAM INPUTS</div><h2>Concept packages · interfaces open</h2></div><span class="fo-badge amber">WORKFLOW PHASE · NOT ENGINEERING</span></div>
              <div class="fo-program-grid">
                <article class="fo-card fo-program-card"><span class="fo-program-num">01</span><div class="fo-card-kicker">RESIDENCE · LEAN WHOLE-BUILD PLAN</div><h3>Modern forest cabin</h3><p>One lean, repeatable plan across the whole build replaces the former cost-unlimited max-house as the active baseline. The bermed wing remains an option to test against site constraints, safety, and cost; it is not assumed to fit or to be free.</p><span class="fo-badge">CURRENT DIRECTION</span></article>
                <article class="fo-card fo-program-card"><span class="fo-program-num">02</span><div class="fo-card-kicker">AI LAB</div><h3>Frontier-scale, right-sized</h3><p>20–50 kW sustained capability. Bring-your-own rented compute plus a demo closet; no 40+ kW colocation path that would trigger a different land-use strategy.</p><span class="fo-badge">CAPACITY TARGET</span></article>
                <article class="fo-card fo-program-card"><span class="fo-program-num">03</span><div class="fo-card-kicker">SAFETY</div><h3>Emergency-capable medical core</h3><p>Reserve a small on-site medical facility with emergency capabilities. Clinical scope, licensure, staffing, EMS interface, and facility design remain to be professionally validated.</p><span class="fo-badge amber">LICENSURE UNVERIFIED</span></article>
                <article class="fo-card fo-program-card"><span class="fo-program-num">04</span><div class="fo-card-kicker">STAY MODEL</div><h3>Researcher cohorts</h3><p>30+ day cohorts; no STR. The accommodation, lab access, services, and safety offer are modeled together rather than as a lodging-only product.</p><span class="fo-badge">OPERATING PREMISE</span></article>
                <article class="fo-card fo-program-card"><span class="fo-program-num">05</span><div class="fo-card-kicker">WELLNESS · NEW CONCEPT</div><h3>Nordic thermal circuit</h3><p>Compact dry sauna/warm room, small hot soak, cold plunge, and quiet rest deck beside the amenity-barn concept. A wellness amenity—not medical treatment. Water, heat, wastewater, staffing, safety, and operating loads are not validated.</p><span class="fo-badge amber">FEASIBILITY GATES OPEN</span></article>
                <article class="fo-card fo-program-card"><span class="fo-program-num">06</span><div class="fo-card-kicker">COMMONS · EXPERIENCE</div><h3>Greenhouse-to-table gathering</h3><p>Shared chef-kitchen / long-table dining, greenhouse produce, and programmed communal meals support the long-stay community. Food-service scope, staffing, utilities, and any licensing remain unvalidated.</p><span class="fo-badge">AMENITY CONCEPT</span></article>
                <article class="fo-card fo-program-card"><span class="fo-program-num">07</span><div class="fo-card-kicker">COMPANY THESIS · OWNER-PROVIDED</div><h3>ATBI solutions + frontier nanotechnology</h3><p>The owner describes a macrotechnology demonstrator with containerized “aspects”/“units” and a unique CPU pin matched to each socket before miniaturization. “Weighting” means assigning functional weights, not measuring mass. The terms aspect, application, and unit are fluid; examples include one Focus Modes application with settings and a Human capable of fitting into a role. Weight criteria, component function/material, hazards, prototype operation, standards, and technical feasibility remain undefined. No safety compliance or nanotech capability is established.</p><span class="fo-badge amber">SCOPE UNDEFINED</span></article>
                <article class="fo-card fo-program-card"><span class="fo-program-num">08</span><div class="fo-card-kicker">ATBI · HUMAN-DATA THESIS</div><h3>Technical + human data</h3><p>The owner intends to collect both component/process signals and people's activity/data. The central processing unit team participates; everyone else is intended to be opt-in. This does not yet define the data inventory, purposes, consent/withdrawal (including for core-team members), access, retention, or model reuse. Reconcile “everything is collected” with AGS V0.2 minimization/anti-surveillance principles before collection.</p><span class="fo-badge amber">PROTOCOL NOT DEFINED</span></article>
                <article class="fo-card fo-program-card"><span class="fo-program-num">09</span><div class="fo-card-kicker">BEDROOMS · CURRENT SCENARIO</div><h3>62 bedrooms · 57 intended rentals</h3><p>Two owner bedrooms plus three extras not yet allocated make up the five non-rental rooms. Shared occupancy is allowed for planning; the selected $4,800 rate remains total per rentable room-month and is not multiplied per resident. Bunk layouts and fewer rooms are design options, not verified savings. Bedrooms do not establish beds, people, approved capacity, or guaranteed revenue. The legacy workbook uses $4,800 per 57 modeled beds and is not the new room-month pro forma. Contract, amenity roster, occupancy limits, demand, costs, and phase remain open; 30+ day/no-STR direction remains.</p><span class="fo-badge amber">PROGRAM / USE OPEN</span></article>
              </div>
              <article class="fo-card fo-guardrail-card">
                <div class="fo-card-kicker">MINIMUM-DISTURBANCE GUARDRAILS</div>
                <div class="fo-guardrails"><div><strong>18%</strong><span>disturbance envelope target</span></div><div><strong>210 CY</strong><span>grading target</span></div><div><strong>5</strong><span>ponderosa to retain</span></div></div>
                <p>These are standing planning directives, not verified takeoffs. The new spa/commons cues do not change the 18% / 210 CY / five-tree targets or establish feasibility; their footprint, water, power, wastewater, safety, and staffing must be reconciled before any plan or pro forma revision.</p>
              </article>
            </section>

            <section class="fo-panel fo-site-panel" role="tabpanel" data-panel="site" hidden>
              <div class="fo-panel-heading fo-site-heading"><div><div class="fo-card-kicker">ENGINEERED CONNECTIONS · CONCEPT FILMS + PUBLIC DATA</div><h2>Site &amp; terrain viewer</h2><p class="fo-review-foot">Film/model geometry is still illustrative; public GIS/EPQS is not survey control. No route, connection, or capacity is engineered.</p></div><a class="fo-external-link" href="/terrain/" target="_blank" rel="noopener">Open terrain viewer separately ↗</a></div>
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
              <div class="fo-panel-heading"><div><div class="fo-card-kicker">ENGINEERED CONNECTIONS · ENTITY + FACILITY + ECONOMICS</div><h2>One joined model, explicit assumptions</h2></div><span class="fo-badge amber">UNVALIDATED PREMISES</span></div>
              <div class="fo-model-grid">
                <article class="fo-card"><div class="fo-card-kicker">REVENUE PRODUCT · SELECTED WORKING ASSUMPTION</div><h3>$4,800 per rentable room-month</h3><div class="fo-big-number">All-in resident bundle</div><p>Includes room, lab/program access, and defined amenities; exact roster, service scope, payer, and contract remain TBD. Shared occupancy does not multiply the total room rate. The selected price is not market-validated and is not a reservation offer. The legacy workbook applies $4,800 per modeled bed; that denominator and its max-house costs do not form the current room-month model. The old $3,600 whole-2BR-ADU case and $1,100–$1,900 bed-month study remain historical only.</p></article>
                <article class="fo-card"><div class="fo-card-kicker">CAPACITY &amp; OWNER USE</div><h3>2 owner rooms · 3 extras unallocated</h3><p>Current scenario: 62 bedrooms total, with 57 intended rentals, two owner bedrooms, and three extras left unassigned. These are bedrooms, not beds, people, approved capacity, or guaranteed revenue units. Legacy ≈1/12 and “2/5 of The Owner’s Area” premises remain unreconciled.</p></article>
                <article class="fo-card"><div class="fo-card-kicker">FACILITY / COMPUTE</div><h3>20–50 kW sustained</h3><p>BYO rented compute and a demo closet are the current infrastructure direction. Keep facility power, IT load, cooling, backup, and operating entity in the same review; do not infer a utility or permit approval.</p></article>
                <article class="fo-card"><div class="fo-card-kicker">AMENITY DIFFERENTIATION</div><h3>Safety First + experience layer</h3><p>The selected bundle includes the room, lab/program access, and a defined amenity package. The exact roster is still TBD; Nordic wellness, greenhouse-to-table commons, and other earlier ideas are candidate concepts, not confirmed bundle inclusions. Operating costs and feasibility are unvalidated. Wellness is not medical treatment, and the small emergency-capable medical function has a separate scope gate.</p></article>
                <article class="fo-card"><div class="fo-card-kicker">FUNDING PATH · NO CASH</div><h3>External, in-kind, or earned funding</h3><p>Grants, sponsors, and in-kind materials/compute/services are acceptable options but are not secured. Job income is also acceptable, with an acknowledged project delay. Keep the current stage no-spend and do not represent any source as committed capital.</p></article>
              </div>
              <div class="fo-model-note"><strong>Private financial workbook is intentionally not mounted here.</strong> Current working price: $4,800 per rentable room-month for an all-in resident bundle. The legacy worksheet multiplies $4,800 by 57 modeled beds; the current 57 intended rentals are bedrooms, not an approved bedspace or occupancy schedule. Full-occupancy gross potential is $3.2832M/year before vacancy and all costs—not a forecast, NOI, or return. The old $3,600 amount is a whole furnished 2BR ADU case. Market demand, bundle contract and amenity roster, lean capex/OPEX, and financing remain TBD.</div>
            </section>

            <section class="fo-panel" role="tabpanel" data-panel="review" hidden>
              <div class="fo-panel-heading"><div><div class="fo-card-kicker">ENGINEERED CONNECTIONS · DIGITAL PRE-REVIEW</div><h2>Code, zoning &amp; system interfaces</h2></div><span class="fo-badge amber">NOT A COMPLIANCE DETERMINATION</span></div>

              <div class="fo-phase-strip"><span class="fo-phase-label">CURRENT WORKSTREAM</span><strong>Engineered connections</strong><span>All current program concepts assigned</span><small>Workflow phase only — no system is engineered, approved, or sealed.</small></div>
              <div class="fo-review-glance" aria-label="Digital review status">
                <div><strong>12</strong><span>open interfaces</span></div>
                <div><strong>0</strong><span>engineered / sealed</span></div>
                <div><strong>0</strong><span>compliance determinations</span></div>
                <span class="fo-badge">AR-5 · AREA SCREEN PASS</span>
              </div>
              <p class="fo-review-note"><strong>Area-only AR-5 screen: PASS.</strong> The county screenshot shows 5.59 ac against a 5.00 ac minimum: +0.59 ac on the displayed figures. It also displays Unincorporated Coconino County, overlay N/A, Lighting Zone II, and “No permits found.” Screenshots are not live-verified; that permit message is not a certified history. This numeric area pass is not overall zoning/code compliance. Use standards, legal access, survey, and occupancy remain open; no local professional or agency was contacted.</p>

              <div class="fo-review-priorities" aria-label="Priority digital inputs">
                <div class="fo-review-priority"><span>01</span><strong>Authority + land use</strong><small>Verify county screenshot · ordinance · overlays · use interpretations</small></div>
                <div class="fo-review-priority"><span>02</span><strong>Title + survey</strong><small>Legal access · easements · boundary/topography · trees</small></div>
                <div class="fo-review-priority"><span>03</span><strong>Program + code basis</strong><small>Uses · areas · occupants · operations · adopted editions</small></div>
                <div class="fo-review-priority"><span>04</span><strong>Utility + site feasibility</strong><small>Power · water · wastewater · fire/EMS · grading</small></div>
              </div>

              <details class="fo-disclosure">
                <summary><span>Pre-design evidence we can assemble now</span><small>Front-load coordination · not engineering sign-off</small><span class="fo-disclosure-mark" aria-hidden="true">+</span></summary>
                <div class="fo-table-scroll"><table class="fo-review-table fo-role-table">
                  <caption>Preparatory work can reduce discovery/rework; licensed professionals still verify and issue their own designs.</caption>
                  <thead><tr><th scope="col">Workstream</th><th scope="col">Can prepare now</th><th scope="col">Still required for a design/compliance conclusion</th></tr></thead>
                  <tbody>
                    <tr><th scope="row">Zoning / use</th><td>Area-only AR-5 screen passes: 5.59 ac vs. 5.00 ac, +0.59 ac.</td><td>Current ordinance, exact use classifications, legal-lot basis, setbacks, height, coverage, parking, and written interpretations.</td></tr>
                    <tr><th scope="row">Buildings / program</th><td>Room, use, area, occupants, hours, and operating schedule; compact test-fit alternatives after constraints are loaded.</td><td>Surveyed buildable envelope, code/occupancy analysis, accessible entrances, fire/life-safety, and architectural/structural design.</td></tr>
                    <tr><th scope="row">Bedrooms / rent scenario</th><td>Record 62 bedrooms: 57 intended rentals, two owner bedrooms, three unallocated extras. Use the selected $4,800 per rentable room-month all-in bundle; shared occupancy does not multiply room revenue. Keep room, bedspace, and person counts separate.</td><td>Room-sharing limits, contract and amenity/service roster, first phase, paying demand, lean OPEX/capex, use classification, permitted occupancy, and fire/water/wastewater basis. The legacy workbook's $4,800 × 57-bed calculation is not the current room-month model.</td></tr>
                    <tr><th scope="row">ATBI / human-data governance</th><td>Record both component/process signals and human activity data; the CPU team is intended to participate and others are intended to opt-in. Map ordinary activity → worker collection → pooling → solutions. Treat “everything is collected” as unbounded until data types, purposes, participants, sensors/fields, core-team voluntariness/withdrawal, security, retention/deletion, and model reuse are specified.</td><td>Reconcile the blanket-collection premise with AGS V0.2’s owner-directed minimization, preference for attestations over continuous monitoring, and anti-surveillance principles. Define the actual physical process and protocol; determine applicable privacy, research/human-subjects, clinical, and employment requirements; obtain independent review as applicable. No human-data collection is established or authorized by this concept record.</td></tr>
                    <tr><th scope="row">Macro demonstrator / components</th><td>Prepare a digital/paper registry using the owner's fluid aspect/application/unit vocabulary, unique pin-to-socket map, container/traceability schema, visible safety-evidence concept, and functional-weight criteria, scale, assignment method, and validation tests.</td><td>Define component functions/materials, container compatibility, process hazards, applicable standards, functional-weight rules and validation tests, and qualified safety review before physical build or miniaturization. No compliance or technical feasibility is established.</td></tr>
                    <tr><th scope="row">Walkways</th><td>Continuous, low-disturbance accessible-route concept between arrival, primary entry, common areas, and medical function.</td><td>Surveyed grades/lengths, adopted accessibility criteria, landings/handrails, drainage, and fire/EMS route coordination.</td></tr>
                    <tr><th scope="row">Well / water / wastewater</th><td>Demand schedule, source-protection questions, and separate domestic vs. lab/clinical waste flows.</td><td>Well records/yield/quality/rights, code separation distances, soils/percolation, wastewater approval/reserve, and licensed design.</td></tr>
                    <tr><th scope="row">Civil / stewardship</th><td>18% disturbance, 210 CY, and five-tree targets as measurable checks; drainage and access issue list.</td><td>Boundary/topographic survey, tree inventory, geotechnical/soils, stormwater criteria, and checked takeoffs.</td></tr>
                    <tr><th scope="row">Power / HVAC / network</th><td>Separate IT and building-load worksheets; retain 20–50 kW as a capability target, not service size.</td><td>Equipment schedules, utility data, cooling/ventilation loads, heat rejection, carrier route, and MEP design.</td></tr>
                    <tr><th scope="row">Lighting / life safety</th><td>Zone II low-glare concept and medical/fire/EMS scope questions.</td><td>Lighting ordinance/photometrics, clinical/licensure scope, adopted fire/building codes, and agency criteria.</td></tr>
                  </tbody>
                </table></div>
              </details>

              <details class="fo-disclosure">
                <summary><span>Engineered-connections register</span><small>12 interfaces · required digital inputs</small><span class="fo-disclosure-mark" aria-hidden="true">+</span></summary>
                <div class="fo-table-scroll"><table class="fo-review-table">
                  <caption>All rows are open work items, not designed or approved connections.</caption>
                  <thead><tr><th scope="col">ID</th><th scope="col">Interface</th><th scope="col">From → to</th><th scope="col">Status</th><th scope="col">Input to unlock next review</th></tr></thead>
                  <tbody>${connectionReviewRows.map(row => `<tr><th scope="row">${row.id}</th><td>${row.scope}</td><td>${row.endpoints}</td><td><span class="fo-open-status">OPEN</span><br>Input required</td><td>${row.next}</td></tr>`).join("")}</tbody>
                </table></div>
              </details>

              <details class="fo-disclosure">
                <summary><span>Code + zoning role review</span><small>Digital discipline screen · no official determination</small><span class="fo-disclosure-mark" aria-hidden="true">+</span></summary>
                <div class="fo-table-scroll"><table class="fo-review-table fo-role-table">
                  <caption>Screening roles are analytical lenses, not named or credentialed professionals.</caption>
                  <thead><tr><th scope="col">Review lens</th><th scope="col">What can be said now</th><th scope="col">Evidence needed before a determination</th></tr></thead>
                  <tbody>
                    <tr><th scope="row">Planning / zoning</th><td>County screenshot displays Unincorporated Coconino County, AR-5 (5-acre minimum), overlay N/A, and Lighting Zone II; not live-verified and no use allowance determined.</td><td>Current official parcel record and ordinance; overlays/restrictions; written use matrix and agency interpretations.</td></tr>
                    <tr><th scope="row">Architecture / building code</th><td>Not classified: no code editions, plans, use/area/occupant schedule, or occupancy analysis.</td><td>Adopted code basis; plans; occupancy, mixed-use, egress, accessibility, and life-safety review.</td></tr>
                    <tr><th scope="row">Civil / site</th><td>GIS polygon and ten elevation samples are not survey control or a design surface.</td><td>Boundary/topographic survey, tree inventory, soils/drainage basis, site plan, measured grading.</td></tr>
                    <tr><th scope="row">Structural / geotechnical</th><td>Bermed wing and optional tunnel have no soils, groundwater, or structural basis.</td><td>Geotechnical investigation and documented design criteria; keep tunnel out of baseline.</td></tr>
                    <tr><th scope="row">MEP / compute / network</th><td>20–50 kW is a capability target—not service size; loads, source, routes, and equipment are unknown.</td><td>Utility and equipment data; IT/facility loads; water/wastewater feasibility; HVAC, carrier, and security requirements.</td></tr>
                    <tr><th scope="row">Fire / EMS / health</th><td>Medical, food-service, fire-flow, and emergency-access scopes/criteria are not established.</td><td>Operating/service scope; life-safety basis; access/response criteria; health and licensure determinations.</td></tr>
                    <tr><th scope="row">Process / materials / safety</th><td>Owner-proposed macro demonstrator with dynamic aspect/application/unit terms, containers, unique matched CPU pins/sockets, and functional weights; materials, functions, processes, hazards, tests, and standards are undefined.</td><td>Define component function/material, build sequence, container compatibility, weighting logic and tests, hazard analysis, applicable safety requirements, visible evidence, and qualified independent review before physical prototyping or miniaturization.</td></tr>
                    <tr><th scope="row">Human data / AI governance</th><td>The owner intends to collect both component/process signals and human activity data; the CPU team participates and others are intended to opt-in. Data fields, purposes, and core-team voluntariness/withdrawal remain unresolved.</td><td>Bound the data inventory and purpose; reconcile with AGS V0.2 minimization/anti-surveillance guidance; define participation, consent/withdrawal, security, retention, reuse, and applicable independent research/clinical review before collection.</td></tr>
                    <tr><th scope="row">Title / legal access</th><td>User-reported road concern is unverified; GIS does not establish rights.</td><td>Current title/legal description, recorded easements, boundary survey, and road/access evidence.</td></tr>
                  </tbody>
                </table></div>
              </details>

              <details class="fo-disclosure">
                <summary><span>Evidence, directives + unresolved items</span><small>Provenance and limits</small><span class="fo-disclosure-mark" aria-hidden="true">+</span></summary>
                <div class="fo-evidence-grid">
                  <article class="fo-card"><div class="fo-evidence-label public">PUBLIC / QUERIED</div><h3>Terrain and aerials</h3><ul><li>USGS 3DEP image service locked to raster 86167; LiDAR-derived 1 m bare-earth source.</li><li>Ten EPQS point samples; range is sampled spread, not parcel-wide extrema or design topography.</li><li>NAIP snapshots: 2013, 2017, 2019, 2021, 2023.</li><li>Arizona Water Maps parcel polygon; assessor/GIS only, not survey-grade.</li></ul></article>
                  <article class="fo-card"><div class="fo-evidence-label directive">USER DIRECTIVE</div><h3>Program and stewardship</h3><ul><li>FRONTIERSHIP master brand; OUTPOST ONE this HQ; SAFETY FIRST is a standard/certification.</li><li>Income-first; 30+ day cohorts; no STR; 20–50 kW sustained frontier capability target.</li><li>18% / 210 CY / five ponderosa are planning guardrails, not measured outputs.</li><li>All program concepts enter engineered connections for digital coordination—not design approval.</li></ul></article>
                  <article class="fo-card"><div class="fo-evidence-label caution">SCREENSHOT EVIDENCE / UNVERIFIED</div><h3>Do not convert to a legal or design claim</h3><ul><li>County parcel screenshots display Unincorporated Coconino County, AR-5 (5-acre minimum), overlay N/A, and Lighting Zone II; no live record/ordinance check was performed.</li><li>The permit panel says “No permits found”; search scope and permit history are not certified.</li><li>AR-5 area-only screen passes: county panel 5.59 ac versus 5.00 ac minimum = +0.59 ac. GIS 5.5895 ac rounds consistently; neither figure is survey area and other standards remain unassessed.</li><li>EPQS date field and 3DEP source acquisition window disagree; exact DEM date unresolved.</li><li>2019 NAIP tile date and USDA date-index date differ by three days.</li><li>Parcel line, fence/track orientation, road/access rights, grades, drainage, medical licensure, and engineering remain unverified.</li><li>Water, wastewater, power, thermal, food-service scope, staffing, and operating loads are not evaluated.</li></ul></article>
                  <article class="fo-card"><div class="fo-evidence-label superseded">EXCLUDED FROM CURRENT TERRAIN EVIDENCE</div><h3>Synthetic terrain package</h3><p>Generated terrain/contours and derived placements are excluded as site evidence. The existing ten-point EPQS interpolation remains the terrain screening input; it is not a survey or design surface.</p><p class="fo-small">The user's road-rights understanding is recorded as a report only; this app does not decide legal status.</p></article>
                </div>
              </details>
              <p class="fo-review-foot">Next digital stage: acquire authoritative land-use/code sources and missing site/system inputs, then run a consistency pass. Local licensed reviewers come after that digital package is assembled. The full role-based pre-review is repository documentation and is not served as a public asset.</p>
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
