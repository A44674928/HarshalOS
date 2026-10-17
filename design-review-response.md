# Broadsword C-101 Review — Elevation, Zoning + Budget Upgrades
**Peaks Vista PV-03 THE ENGINE ROOM + Flag FL-01 THE HEARTH | Coconino County AR-5 | 2026-03-03 / 2026-03-31**
**Reviewer:** HarshalOS Design Development Review
**Status:** Master-planning / design-development — *Not for construction, not sealed per Arizona BTR*

---

## Executive Summary (read this first)

What you have is excellent for design-development:
* Two square 5.0000 ac lots, 466.69' × 466.69' (217,800 SF), with a **self-imposed 50'-0" setback** on all sides that more than doubles the AR-5 minima (25' front / 10' interior / 20' rear). This creates a clean 366.69' square / 3.09-ac buildable envelope on both parcels — smart for fire, septic, and dark sky.
* Lot coverage is **4.61% (Engine, 10,050 SF GFA) and 3.79% (Hearth, 8,246 SF GFA)** vs. **35% max** — an order of magnitude of headroom, no variance needed.
* REV-A improvements already fix the biggest permit blockers: **ADEQ 100% reserve septic + dual valve (REV-A1), 10,000-gal buried NFPA 1142 fire cistern + 4.5" NH dry hydrant (REV-A2), 2' schematic contours + interceptor swales + retention (REV-A5), and 25'×40' snow push pockets + 42" frost burial (REV-A6).** The Hearth's two-stage septic phasing (REV-A4) is exactly right to avoid tying your by-right farmhouse/ADU permit to your CUP hospitality timeline.
* Architectural programs are clearly separated: by-right PFR+ADU+barn on both, with **Engine's observatory/science** vs. **Hearth's 8-yurt CUP hospitality overlay** flagged as non-by-right.

**What's still synthetic:** The 2' contours (Engine: 7278'–7286' NW→SE; Hearth: N→S), swale grades, and FFE's are **schematic placeholders**. They illustrate intent brilliantly, but they are not surveyed topography. You cannot size drainage, septic gravity, driveway grade, FFE, or cut/fill from them yet.

**Bottom line:** Incorporate *real* elevation before you lock C-102 grading, well/septic depths, or observatory siting. The good news: this area of Coconino County has superb public LiDAR, so we can do a desk-level satellite/DEM terrain model in hours and then confirm with an ALTA/NSPS field survey before permit.

---

## 1) Elevation — What to do, and how it changes the design

### 1.1 Current state in your file

**`src/components/EngineRoomPlan.tsx` & `HearthPlan.tsx` are schematic:**

```tsx
// EngineRoomPlan.tsx — schematic 2' contours
{ d: `M ${X(0)} ${Y(420)} ...`, el: "7286'" },
{ d: `M ${X(0)} ${Y(330)} ...`, el: "7284'" }, // ... down to 7278'
// + Up-slope interceptor swale @ "2% grade"
// + Basalt rip-rap infiltration bioswale → retention

// HearthPlan.tsx — similar 2' N→S + 30'/100' WUI ellipses + snow pocket
```

And in `properties.ts`:
* **Engine:** `35°29'50.5"N 111°45'02.6"W / 35.29450, -111.45102 / ±7,280' AMSL`
* **Hearth:** `35°24'14.5"N 111°45'16.6"W / 35.40403, -111.75461 / ±6,960' AMSL`

> **Flag for your surveyor:** Those DMS → decimal conversions don't match. 35°29'50.5"N should be ~35.497°, not 35.294° — about a 14-mile difference. The 35.29450, -111.45102 pair puts you roughly **SE of Flagstaff near Walnut Canyon / Cosnino**, while 35.40403, -111.75461 puts the Hearth west of Flagstaff near Bellemont. Your vicinity note ("US 180 / Bellmont Rd · I-40") aligns with the *west* position. **Confirm both parcels' legal APNs + corner lat/longs with your RLS before any DEM clip.** I can run both, but permit will be tied to the survey.

### 1.2 What real elevation unlocks (and why it matters at 6,900–7,300')

| Design system | Why elevation matters here | What we do with it |
|---|---|---|
| **Civil / drainage (C-102)** | Monsoon 100-yr intensity ~2.2"/hr on basalt-derived soils. Flagstaff's 60–75 psf ground snow load + spring melt changes everything. Schematic NW→SE fall can be backwards on-site. | Cut 1' and 2' **existing + proposed contours** from DEM, then calculate **slope % heatmap, aspect, flow accumulation, and watershed** to exactly place interceptor swales, retention volume, and driveway culverts. Size retention to Coconino Drainage Criteria, not schematic. |
| **FFE & cut/fill** | Every inch of cut/fill at this elevation is frost, rock, and haul cost. AR-5 rural character punishes big walls. | Set **FFE relative to a real benchmark** (min 12–18" above crown + 5% slope away for 10' per IBC). Aim for **<2' average cut/fill** by stepping foundations with the contour. Use 3–4' max retaining to avoid engineered walls where possible. Daylight walk-out toward the view. |
| **Septic (ADEQ R18-9)** | Gravity laterals need 1–2% fall to field *and* must stay >100' from well, >50' from drainage, and out of flood/wet areas. Reserve must be truly buildable. | Overlay **well 100' isolation + primary + 100% reserve + drainage + slope >15% exclusion** on real terrain. Verify you can gravity-feed from lodge/ADU/barn *without* a pump — pump = $8–12k + power risk in WUI. Your REV-A1 fenced reserve is correct; real slope will tell us if it needs to slide 20–40'. |
| **Observatory seeing (REV-A3)** | The 10' ash-dome on an isolated pier is seeing-sensitive: thermal plumes, dust, and prevailing **SW 215–240° wind** degrade 0.3–0.5 arcsec if you put the heat source upwind. | Place the dome on **the highest, best-drained micro-knoll** on-site (not necessarily NE corner) and enforce your **120' thermal exclusion arc SW** — move greenhouse exhaust leeward SE (already noted), specify low-albedo native fescue, and add your hedgerow dust filter along the corral. Verify with real **slope + wind exposure** — a 2% lee-slope is worth more than a schematic setback. |
| **Access & fire (F-101)** | IFC D103 requires <10% grade for fire apparatus, 20' all-weather width (you have this), 92' turnaround (you have this), and <150' hose lay. Snow berms kill this in January. | Drape your drives on the DEM, check **centerline grade every 25'**, add centerline culvert at every swale crossing, and keep your **25'×40' push pockets on the true down-slope** of each rotunda so plow berms drain to bioswales, not gates. |
| **Solar / microgrid (E-101)** | At 35°N, optimal fixed tilt ~30–34° south. Your 25kW/20kW bifacial + 80kWh BESS gains +14% albedo in snow, but only if lower edge is above snowpack. | Use **aspect map** to confirm arrays get true south-southeast (your orientation note is perfect) with zero shading from future orchard growth. Keep your **48" lower torque-tube clearance** (REV-A6) and tilt swales *away* from array footings to avoid frost heave. |
| **View corridor** | Engine's **138.8° SE bearing to Mt. Humphreys, 12 miles** is the soul of the plan. A 6' FFE error can erase it behind ponderosa. | Shoot a **DEM viewshed** from lodges' eye height (5' + FFE) along 138.8°, clip tree canopy from NAIP, and adjust lodge porch/deck height accordingly. This is also what sells your ADU-to-lodge phasing story. |

### 1.3 Practical incorporation plan (budget-disciplined)

**Phase 0 — Desk terrain in 1–2 days, no field cost:**
1. Pull **USGS 3DEP 1-m LiDAR DEM** (Flagstaff/Bellemont quadrangles have it — far better than SRTM 30-m) + 1/3 arc-second backup + NAIP aerial.
2. Clip to 466.69' parcel + 200' buffer. Generate: 1' and 2' contours, spot elevations at all four pins, slope %, aspect, hillshade, flow direction/accumulation, 100-yr sheet-flow arrows, and 3 cross-sections (N-S, E-W, diagonal to Humphreys).
3. Export as **DXF contours + GeoTIFF + PDF site overlay** at 1"=40' to match your sheet. Drop directly into `C-101` as a new `topo: surveyed` layer — no redraw of the program.

**Phase 1 — Field verification before C-102/C-103 seal:**
4. **ALTA/NSPS Land Title Survey** by AZ RLS: boundary, monuments, easements, encroachments, and **topographic survey at 1' contour interval** with NAVD88 vertical datum. This is your permit datum.
5. **Geotech + perc test:** Bearing (basalt float vs. cinder), expansive soils, radon (Coconino yes), frost depth confirm 42", percolation for ADEQ Type 4, and seasonal high groundwater.
6. Lock **FFE, driveway profile, septic field, and cistern burial** on surveyed vertical. Update REV-A5 swales from "schematic 2%" to calculated HGL.

**Architectural elevation moves that cost little but pay hugely:**

* **Engine Lodge:** Site it on the real high point, **step the foundation 18–24" with the fall** (N entry high, S porch low). Creates a natural daylight lower level / walk-out toward the 138.8° view without a tall wall. Add a 2' stem-wall batter in local basalt — reads as "manor lodge" and hides the step.
* **Hearth Farmhouse:** Your 12'×48' north stargazing deck wants to be **1 step (7") above FFE and cantilevered north over the fall** — minimal fill, maximum dark-sky horizon. South entry court stays at grade for ADA/arrival.
* **Greenhouse + Orchard:** Put greenhouse **on contour, not across it**, with floor 6–8" below orchard bioswale spill — gravity irrigation from roof cisterns (your ~68k gal/yr Engine capture) with zero pump.
* **Barn/Pasture:** Put pasture on **the flattest <3% slope** on-site (horses + mud + snow) and barn on the slightly higher edge so stall drains never cross the field. Your loafing shed note is right — that shed wants to be on the high side.
* **Drive to Gate:** Keep your rotunda concept, but let the drive **follow the contour for 80%**, then cut only at the gate for sight distance. One basalt headwall culvert at the natural drainage beats three small ones.

> **Want me to produce this?** I can generate a satellite/LiDAR terrain pack for both parcels right now (contours, slope heatmap, 3D drape, viewshed to Humphreys) once you confirm which decimal coordinate is canonical. That pack plugs straight into your `SitePlanViewer.tsx` as a new `topo-surveyed` layer — no redesign.

---

## 2) Missing Zoning / Entitlement Considerations

You already handle the AR-5 headline well (see `CODE_NOTES` in `properties.ts`). Here's what's covered vs. what still needs incorporation:

### What your set already gets right ✅
* AR-5 5.0000-ac minimum, 466.69' square lot math
* 50' design setbacks (> code: 25' front / 10' interior / 15' street-side / 20' rear)
* 35' height cap (lodge 28', farmhouse 26')
* Lot coverage well under 35%
* 1 PFR + 1 ADU by-right, animal keeping at 1-ac min (3 animals +1 per 0.5 ac)
* 100' well isolation, ADEQ wastewater basics, BUG B0-L0-U0 3000K dark-sky spec
* CUP overlay correctly flagged for Hearth yurts/bathhouse/hospitality

### Gaps to incorporate before submittal ⚠️

**High priority — permit-blocking:**

1. **Grading / Drainage Permit threshold** — Coconino County requires a grading permit + Stormwater Pollution Prevention Plan (SWPPP) above ~50 CY or 1,000 SF of disturbance (verify current Engineering Standards). Both parcels will trigger it. Your C-102 needs: existing/proposed 2' contours (surveyed), FFE, cut/fill quantities, drainage report (100-yr), retention volume calc, and NPDES AZPDES if >1 ac disturbed.

2. **Floodplain — FEMA FIRM check** — Even outside a mapped 100-yr floodplain, Coconino requires a drainage report and prohibits septic reserve in flow paths. Your REV-A1 reserve must be certified outside regulatory floodway/floodplain. Simple desk check: AT INSPIRE + County GIS Floodplain Layer.

3. **WUI / Wildfire Ordinance 95-1 & IFC Appendix D** — You show 30'/100' defensible space ellipses (great) but need to add: 5' non-combustible zone at walls/decks, Class A roof, ember-resistant vents (1/8" mesh), tempered glass, exterior firewood separation, and address signage per County. This is what drops ISO insurance class — the 10k-gal cistern alone isn't enough. Your REV-A2 placement below 42" frost is correct; add a **County-approved encroachment for the 4.5" NH dry hydrant** and note turn-around structural section (6" ABC on geotextile).

4. **Access & Sight Distance** — Peaks Vista Way is almost certainly a private road (not County-maintained). You need: road maintenance agreement (RMA), proof of legal access/easement, County Encroachment Permit for each cattle guard, and sight-distance triangles at the County road intersection (AASHTO 335' at 35 mph typical). Your 20' all-weather section needs a **culvert sizing note** at every natural drainage crossing.

5. **Water Adequacy — ADWR & ADEQ** — AR-5 outside an AMA still requires: well registration (ADWR 55), well log to 500'/400', water quality (arsenic/uranium common in Coconino volcanics), and either a County Water Adequacy letter or exemption. With off-grid microgrid, your 10k-gal cistern can double as domestic reserve with backflow prevention — decide now if you want that, because it changes ADEQ cross-connection rules.

6. **Septic — County Environmental Health specifics** — ADEQ R18-9-A312(D) 100% reserve is correctly flagged, but add: distances to well (100' OK), to property line (typically 5–10'), to wash (50–100'), to cut/fill, percolation rates, soil evaluator license #, and **fencing/bollards** to keep the reserve out of traffic *and* grazing (your note is right — move it off the corral if real slope shows flow through it). REV-A4 two-stage is perfect: **Phase 1 = Type 4 General Permit (residential), Phase 2 = Commercial treatment + drip/chamber stub south of bathhouse, not built until CUP.**

7. **Hillside / Scenic Overlay** — If either parcel is in the County's Hillside or Scenic Road overlay (common near US 180), slope >15% triggers extra setbacks, height limits by silhouette, and grading restrictions. Check County GIS Zoning Overlay layer — may explain your synthetic NW→SE assumption.

**Medium priority — entitlement risk:**

8. **CC&Rs / HOA Architectural Review** — "Peaks Vista" sounds like a recorded subdivision, not just a road name. CC&Rs often restrict: height, exterior materials, fence height (often 4' front / 6' rear in AR), livestock numbers *stricter* than County, ADU STR prohibition, and lighting stricter than IDA. Get the **CC&Rs, plat, and any HOA ARB checklist** — your 50' setback may need to be larger per plat.

9. **Dark Sky — Flagstaff IDA Lumens Cap** — B0-L0-U0 / 3000K is the right spec, but Flagstaff Zone 3 (rural) caps total outdoor lumens per acre (~25k lumens/ac typical) and requires **full cutoff, max 2,700K–3,000K, curfew dimming, and a photometric plan** for permit. No floodlights, path markers 12" max you note is good. Observatory nights as "special events" may need a lighting curfew exception — get it in the CUP conditions.

10. **Parking & Traffic for CUP (Hearth)** — Coconino CUP for hospitality will require: parking count (often 1/ yurt + 1/ farmhouse + 1/ ADU + 1/ staff + ADA van space), turn-around for emergency, no on-street parking on Peaks Vista Way, and a traffic study if >100 ADT. Your yurt crescent wants **one ADA yurt pad (Y1 near bathhouse)** and a second egress if County Fire requires it for >12 occupants.

11. **ADU as Short-Term Rental** — Coconino County regulates STRs separately from CUP. If the 750–800 SF ADUs will ever be rented (even to yurt guests), verify STR permit, TOT tax, and well/septic adequacy for transient occupancy. Your "by-right ADU" note is true for residential, not necessarily for nightly rental.

12. **Accessory Structure Nuance** — In AR-5, barns/greenhouses/spas/observatories are typically accessory to the PFR. Confirm: (a) lot coverage interpretation — do covered porches/decks count? County says drives/walks/uncovered parking don't, but covered 12'×48' deck might; (b) can you build the barn/greenhouse *before* the Certificate of Occupancy on the PFR? Some Counties require the PFR first.

13. **Easements & Utilities** — Your microgrid is off-grid capable (25kW/20kW + 80kWh + gen), but if you ever want grid intertie, check **APS/TEP service territory, line extension cost, and PUE easement** along Peaks Vista Way. Same for fiber/Starlink ground plane — note it on E-101 so future trenching doesn't cut your interceptor swale.

14. **Cultural / Biological** — No federal nexus = no Section 106, but Arizona requires **archaeological clearance if you encounter cultural material**, and ponderosa country near Flagstaff is Mexican Spotted Owl / Northern Goshawk habitat. A 5-ac ponderosa survey is cheap insurance for CUP.

15. **Airport Overlay** — Flagstaff Pulliam (FLG) Part 77 surfaces extend farther than people think. Your 28' height is safe, but if observatory + lodge ridge + crane during construction exceeds 35' AMSL+AGL in the overlay, file FAA Form 7460. Quick GIS check.

**Checklist to give your civil/land use attorney:**

- [ ] APN, legal description, recorded plat + CC&Rs, plat notes, easements by title report
- [ ] Coconino County GIS: zoning, overlay, FEMA FIRM, floodplain, WUI, hillside, scenic road
- [ ] ADWR well record / water adequacy pathway
- [ ] County Environmental Health pre-app for septic (soil evaluator on-site)
- [ ] County Engineering pre-app for grading/drainage thresholds + SWPPP needs
- [ ] Fire District (e.g., Ponderosa Fire District) pre-app for 20' all-weather + cistern approval letter for ISO
- [ ] IDA lighting zone determination + lumen budget
- [ ] CUP pre-app conference for Hearth hospitality (ask for parking, traffic, noise, event conditions)
- [ ] ALTA + topo survey scope (1' contours, NAVD88, all utilities, FFE tie to benchmark)

*You already have the "Not for construction — design development" disclaimer in `CODE_NOTES` — keep it on every sheet until sealed by AZ PE/RLS.*

---

## 3) Upgrading the Design WITHOUT Over-Extending Budget

Your **Broadsword Pyramid (Layer 1 Seed → Layer 4 Science)** phasing is already the best budget tool you have. Don't break it. Upgrade *selectively* where dollars buy durability, energy, or view — defer everywhere else.

### Guiding principle: cluster + standardize + defer

* **Cluster utilities:** You already cluster the west service court (ADU+shop) and east orchard — keeps trench length <120' vs. sprawling across 466'. Hold that.
* **Standardize dimensions:** Design to 4' module (plywood/sheathing) and 16"/24" framing. Every non-standard cut at 7,000' in winter is a premium.
* **Defer hospitality:** Engine Room Phase 1 = ADU (800 SF) as owner-occupancy → barn → lodge. Hearth Phase 1 = farmhouse + ADU + equestrian. **Yurts/bathhouse are stubs only** until CUP + cash flow. This saves 6–9 months on your first permit per REV-A4.

### Tier 1 — High impact, low cost ( <$25k each, do now )

1. **Local basalt for everything you sketch as generic stone.** Flagstaff basalt quarry veneer + basalt rip-rap for swales = one material, one delivery, lower haul, and it *looks* like your renderings. Budget: +$8–12k vs. faux stone, but eliminates a second supplier.

2. **Triple-pane windows where it matters.** You don't need triple everywhere at 7,280' — do it on the **north/stargazing and SE Humphreys walls** (high ∆T + wind). Keeps lodge at Passive House-lite without a full envelope redesign. ~$6–9k incremental, pays back in 3–4 winters on propane offset.

3. **Standing-seam metal roof, Class A, cool color.** Non-negotiable in WUI, sheds snow, and qualifies for WUI + insurance discount that shingles don't. Choose 24-ga. with concealed fasteners. ~same as premium shingle when you add a Class A underlying.

4. **Your REV-A6 snow pocket refinement:** Add a **heated mat (self-regulating heat tape in concrete, 40–50W/ft) at the cattle guard + entry gate only** — not the whole drive. Prevents the one winter failure that strands you. ~$3–5k.

5. **Dark-sky upgrade that costs nothing:** Hold your B0-L0-U0 / 3000K spec, but **drop CCT to 2700K on paths + dim to 30% on curfew (10pm–5am)**. Same fixture cost, guarantees IDA Zone 3 compliance, and protects observatory contract with Lowell.

6. **Root cellar under lodge porch.** At 7k' with 42" frost depth, a 8'×10' insulated cellar under the covered porch is ~$4–7k in concrete if you do it with the foundation — versus $18k as a later add. Huge for orchard/greenhouse storage.

7. **Greenhouse automation, not bigger greenhouse.** Your 1,750 SF geothermal loop is right-sized. Add: thermostatic exhaust to **your leeward SE side per REV-A3** (not schematic N), Diva controllers, and rain-driven irrigation from your 68k-gal roof capture — not more glass.

### Tier 2 — Mid-range, phased ($25–75k, worth it but sequence it)

8. **Exposed Douglas fir trusses in lodge great room only.** Not the whole lodge — one "hero" bay on the Humphreys axis. Prefab trusses, local fab, big wow in renderings with one cost hit. ~$28–40k.

9. **48" PV clearance is already value-engineered.** Keep it. Add **single-axis winter tilt adjust (2×/yr manual)** vs. full tracker — ~$4k to gain 8–10% winter, which is when you need it.

10. **Equestrian footing upgrade:** Decomposed granite + GGT textile in barn aisle only, not whole pasture. Horses stay sound, mud stays out of the 1.5-ac (or 2.8-ac) investment. ~$12–18k.

11. **Observatory pier: do it once, do it right.** Isolated pier to bedrock or engineered caisson *independent* of the dome slab — decouple vibration and thermal mass. Your 10' ash-dome wants this anyway. ~$15–25k now vs. $40k retrofit when seeing is bad.

### What NOT to do (budget killers in this climate/zone)

* **Don't add a second story to chase the view.** You already have 138.8° at one story + deck. A second story trips 35' height by topography, adds WUI ladder fuel, and explodes snow/structural cost. Step the *grade*, not the building.
* **Don't pave the full arrival court.** Compacted basalt fines + stabilizer looks right, drains, and plows fine. Concrete or pavers = frost heave + $45k.
* **Don't over-size the well.** 500'/400' with treatment is right. Bigger pump doesn't fix storage — **pressure tank + 2,500-gal cistern** does.
* **Don't build the CUP yurts before the CUP.** Your REV-A4 stub is the budget move. Pour the 8 pads as **compacted aggregate + conduit stubs** (no structures) so County sees "ag pad" not "hospitality," then erect yurts post-CUP.

### Rough phasing that protects cash flow

**Year 0–1 (Seed):** ADU as residence + well/septic primary + power core (PV/BESS) + barn/pasture + drive/gate/cistern. Live on-site, kill rent, supervise build.
**Year 1–2 (Principal):** Lodge/farmhouse + decks + greenhouse + orchard. Lodge FFE locks view.
**Year 2+ (CUP contingent):** Bathhouse + yurt erection + second septic + hospitality parking + event CUP conditions.

This is why your 50' setback + 3.09-ac envelope is so good — you never have to re-trench across the parcel.

---

## 4) Satellite Scans for Elevation — Yes, and here's exactly how

**Short answer: Yes.** I can map elevation across both 5-ac parcels from satellite/public LiDAR today for design development, and then hand you permit-ready files for your AZ RLS/PE to seal. What I *can't* do is replace the field survey that Coconino County and ADEQ require — they need an RLS-stamped ALTA+topo on NAVD88.

### What I can produce

| Source | Resolution | Accuracy (vertical) | Best for | Availability at Flagstaff |
|---|---|---|---|---|
| **USGS 3DEP 1-m LiDAR DEM** (Flagstaff West / Bellemont) | 1 m (3.3') | ~10 cm | Your C-102 base: 1' contours, slope, drainage — permit-level desk study | **Yes — excellent coverage of Coconino** |
| USGS 1/3 arc-sec DEM | ~10 m | ~1–2 m | Backup where LiDAR has gaps, regional context | Yes, seamless |
| SRTM 30 m / ALOS 12.5 m / Copernicus 30 m | 12.5–30 m | ~4–10 m | Regional viewshed to Humphreys (12 mi) only | Yes |

**Deliverables I can generate for both parcels:**

1. **DEM clip** (GeoTIFF, 1-m LiDAR) + hillshade + slope % + aspect (color ramp)
2. **1' and 2' contours** (DXF + SHP + GeoJSON) at 1"=40' to match your sheet
3. **Spot elevations** at all four 466.69' pins + proposed FFE recommendations
4. **3 cross-sections:** N-S, E-W, and 138.8° SE to Humphreys through lodge eye height
5. **Hydrology:** Flow direction, accumulation, 100-yr sheet-flow arrows, natural swale thalwegs vs. your REV-A5 interceptor location — *quantified* grade %
6. **Viewshed analysis:** What you actually see of Humphreys from lodge porch at FFE + 5' eye height, with ponderosa canopy (NAIP 60-cm) masked
7. **3D drape:** Your `EngineRoomPlan.tsx` + `HearthPlan.tsx` footprints extruded on real terrain (GLB/FBX for review, plus a new `SitePlanViewer` toggle layer)

**How it plugs into your code:**

Right now `SitePlanViewer.tsx` has:

```tsx
const LAYERS: LayerId[] = ["grid","boundary","setback","topo",...]
// presets: "C-101 Master", "C-102 Civil", "C-103 Redlines"
```

I add one layer + one preset:

```tsx
{ id: "topo-surveyed", label: "1' LiDAR Contours & DEM Heatmap", color: "#3ec6d8" }
// + new preset "C-102 Surveyed" = topo-surveyed + dims + fire + septic
```

No program redraw — just swap `topo: schematic` for `topo-surveyed` and your redlines update to real grades.

### Limitations you should know

* Satellite/LiDAR is **bare-earth + canopy model**, not a legal boundary. Your 466.69' square must be monumented by RLS.
* Dense ponderosa canopy can add 0.2–0.5' noise even in LiDAR; final FFE needs field shot.
* LiDAR is a snapshot (often 2018–2022 for Flagstaff). Recent grading, beetle kill, or fire changes won't show.
* Permit requires NVDB? Actually NAVD88 + AZ Central State Plane — I'll deliver in that datum so your surveyor doesn't reproject.

### What I need from you to run it

1. **Confirm canonical coordinates** — is the Engine Room at **35.49747, -111.75072** (from DMS) or **35.29450, -111.45102** (from Dec)? Same for the Hearth. Or just send the two APNs/Plat lot numbers — I can geocode the parcel polygon directly and skip the point confusion.
2. **Preference: which parcel first?** I recommend Engine Room — its observatory + view corridor benefit most from terrain.
3. **Output datum:** Do you want contours in **NAVD88 feet (AZ State Plane Central, 0202)** to match your civil, or keep web Mercator for screen review? I'll do both.

Say **"map Engine Room first"** (or send APNs) and I'll drop the LiDAR terrain pack into your `design-preview/public/terrain/` + an updated `SitePlanViewer` build you can open.

---

## Immediate Next Steps I Recommend

**This week:**

- [ ] Send me APNs or confirm Lat/Longs → I generate LiDAR terrain + viewshed
- [ ] Title report + plat + CC&Rs (if subdivision) → I cross-check AR-5 vs. plat setbacks
- [ ] One 1-hour pre-app call each with (a) Coconino County Engineering (grading/drainage) and (b) County Environmental Health (septic) — bring REV-A1/A4 drawings. This is the cheapest permit insurance.

**Before C-102 seal:**

- [ ] ALTA + 1' topo by AZ RLS (ask for 200' off-site buffer for drainage tie-in)
- [ ] Geotech + perc test (same visit, one mobilization)
- [ ] Fire District approval letter for REV-A2 cistern/dry hydrant location

**If you want, I can:**

* Build the terrain layer into your existing interactive viewer (`design-preview/`) and deploy a preview link
* Produce a 2-page County submittal checklist + a budget-tiered upgrade matrix (Tier 1/2/3 with $ ranges) as a PDF to hand your PE
* Generate the 3D massing on real grade so you can feel the lodge step/foundation before you pay for civil

---

*This review is planning-level guidance based on your `professional-engineering-design-refinement.zip` (C-101 Sheets, `properties.ts`, `EngineRoomPlan.tsx` / `HearthPlan.tsx` / `planPrimitives.tsx`, plus public Coconino County Zoning Ordinance Ch. 2, ADEQ A.A.C. R18-9, IFC Appendix B/D, and Flagstaff IDA standards). It is not a sealed engineering report. Confirm all code interpretations with Coconino County Community Development and an Arizona-registered PE/RLS at time of submittal.*

