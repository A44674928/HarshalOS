# AI Frontier Lab — Incorporation Plan for APN 30055004

**Live/work flagship: modern cabin + frontier-scale AI compute on one self-contained parcel.**
Scope decided 2026-10-17: (1) physical lab (Shop 1,500 SF → hardened, Phase A 20 kW → Phase B 50 kW), (2) legal entity, (3) business plan + pro forma integration.

**Reconciliation status (2026-10-17):** retain this as a historical, high-capex alternative—not the current baseline. Current direction is one lean, repeatable whole-build plan, a 20–50 kW sustained capability target with BYO rented compute/demo closet, and a $4,800 per rentable room-month all-in resident-bundle working price (shared occupancy does not multiply the rate). The exact amenity roster, contract, market demand, lean capex/OPEX, and capital ask remain TBD; discretionary project-spend budget is $0. The owned GPU, hardened lab, PV/BESS/generator, Starlink, entity, staffing, and revenue assumptions below are not verified site facts, funded commitments, or approved design. The owner reports an AT&T line and no nearby power lines to their knowledge; utility and wastewater status remain unverified. See `../terrain_preliminary/OUTPOST_ONE_UNIFIED_PLAN.md`.

---

## 1. Why this parcel is unusually good for it

| Site attribute | Lab value |
|---|---|
| Islanded microgrid, 25→75 kW PV + BESS + 60 kW N+1 gen | Sovereign power — no grid interconnection queue, no utility rate spikes; compute runs on solar first, gen bridges |
| 6 mi remote, 7,887′, ponderosa | Cheap heat rejection (free cooling ~70% of hours), low ambient, secure/rural, no neighbors to complain about dry coolers |
| Existing Starlink + gen = occupancy SLA | Evals/inference/agent workloads are latency-tolerant; checkpoints sync over 225–400 Mbps |
| Single-parcel isolation | Lab never becomes a cross-parcel dependency — it's an *optional* income layer on the same property |
| Income-first phasing | Lab shell rough-in rides along with the Shop in Phase 1; compute scales only when revenue does |

## 2. Entity structure (the actual "incorporation")

```
Owner (you)
   ├── Property LLC  (AZ LLC)  ─── owns land + all fixed improvements (Lodge, ADU, barn, LAB SHELL, microgrid)
   │        ▲
   │        │  10-year License & Services Agreement (arm's-length, documented for lender)
   │        │  — space license $/mo + metered power above residential baseline + cooling
   │        └── Kendrick Frontier Lab LLC (AZ LLC) ─── owns movable compute (GPU nodes, CDU, switches)
   │                    └── DBA optional: "HarshalOS Frontier Lab"
   └── (same member on both — related-party pricing documented, not informal)
```

**Why two LLCs, not one:**
1. **Asset isolation** — GPU equipment (≈$250–400k, 2× 8-GPU nodes) is a depreciating movable asset; it must never sit on the property LLC's balance sheet or as collateral for the construction loan.
2. **Debt isolation** — construction loan covenants (property LLC) stay clean; lab equipment financed separately (equipment loan / vendor financing / cash).
3. **Risk isolation** — liability from hosted workloads (data, uptime, customer code) stays in the lab LLC; the land is unreachable in a lab LLC judgment (single-member Charging Order protection in AZ).
4. **Lender-visible income** — the License & Services Agreement makes lab revenue real *third-party-style* income on the property pro forma, not a footnote.

**Formation checklist:**
- [ ] File AZ Articles of Organization — Property LLC (if not yet formed) + Lab LLC (azsos.gov, $50/each)
- [ ] EINs for both (IRS, instant online)
- [ ] Operating agreements: Property LLC (single-member), Lab LLC (single-member)
- [ ] **License & Services Agreement** signed between the two: 10-yr term, base rent for 1,500 SF bay, metered power @ cost, cooling @ cost, termination-for-convenience 180 days (keeps lender comfortable)
- [ ] Registered agent (can be you), AZ annual report ($0–$25/yr/LLC)
- [ ] Insurance: property policy + scheduled equipment floater (compute) + general liability/E&O for hosted workloads
- [ ] Bank: separate accounts — never commingle
- [ ] CPA: transfer-pricing memo (seat rate + power rate ≈ market); Lab LLC Sch C, Property LLC Sch E

**Tax note:** related-party rates must be defensible as market (colocation comps: $1,200–2,500/mo per seat for desk+power+cooling+10GbE remote). Use $1,500 — benchmarked, conservative, documented.

## 3. Regulatory path (Coconino AR-5)

| Use | Status |
|---|---|
| Lab as **home occupation** (your own workloads, ≤2 incidental visitors/wk, no signage, no employee traffic) | **By-right under AR-5** — no permit beyond building permit for the shell |
| Shell conversion of existing Shop footprint (1,500 SF, within 18% disturbance envelope) | Accessory structure — building permit, Coconino Bldg & Safety |
| Generator ≥50 gal fuel: IFC 504 storage + secondary containment | Permit via Coconino Fire / community fire district review (already in WUI path) |
| Dry coolers / noise | No county noise ordinance at this distance; design to **55 dBA @ property line** anyway (self-imposed, protects STR quiet) |
| **Triggers CUP** (add to Y5+ optional-CUP list alongside yurts): on-site customers regularly, retail compute sales, employee commuting >home occupation, exterior signage, colocation tenants with their own visitors | Plan says **no** until/unless revenue proves the model — CUP is a *growth option*, not a requirement |

## 4. Technical spec (see `clean-sheet/AI_FRONTIER_LAB_SHEET.png`)

**Phase A (Y2, ≈$240k, property LLC):** shell hardening (12 psf floor, spill curb, Class A metal, WUI), critical panel + UPS bus, liquid-cooling loop (CDU → 2× adiabatic dry coolers, PUE 1.18), gen pair 30→60 kW with ATS <10 s, BESS 80→160 kWh, Starlink Business + bonded LTE, 10 GbE, acoustic treatment to 55 dBA.

**Phase B (Y4, ≈$190k, property LLC, gated on demand):** PV 25→75 kW (barn/lab roofs), BESS →240 kWh, panel/conduit space for 50 kW IT.

**Energy balance (honest math):** 75 kW PV ≈ 100–115 MWh/yr; lab @ 20 kW × PUE 1.18 × 60% duty ≈ 125 MWh/yr → PV covers ~55–65%, gen bridges the rest at $0.35–0.55/kWh delivered — still well under cloud GPU rates, and the elastic schedule (compute follows the sun, chart panel b) keeps the gen off most days.

**Equipment (Lab LLC, NOT property capex):** 2× 8-GPU nodes (~$250–400k class of spend, finance separately), 10 GbE switching, in-row CDU if not in shell scope. Storage/checkpoint replication over Starlink; large training runs = the one honest limitation (state it, schedule off-site or accept bandwidth throttling).

## 5. Economics (added to `APN30055004_ProForma.xlsx`)

| Line | Y2 | Y3 | Y4 | Y5 |
|---|---|---|---|---|
| Lab seats: 2 × $1,500/mo @ 60% avg | $10,800 | $21,600 | $22,032 | $22,472 |
| Eval retreats: 6 × $3,500 @ 85% (Y3+) | $8,925 | $17,850 | $18,207 | $18,571 |
| **Lab GPR** | $19,725 | $39,450 | $40,239 | $41,044 |
| Lab OpEx (fuel, cooling water, maint, ins rider) | −$8,500 | −$11,000 | −$11,220 | −$11,444 |
| **Lab NOI (incremental)** | **$11,225** | **$28,450** | **$29,019** | **$29,600** |
| Combined NOI (property + lab) | $35,780 | $50,464 | **$71,769** | $73,919 |
| Combined cap on $850k all-in ($420k + $430k infra) | 4.2% | 5.9% | **8.4%** | 8.7% |

Rules that keep this honest:
- **Retreat lodging nights bill on the existing lodging lines** — retreat *fees* are lab revenue only; no double-counted nights.
- **Property rows above are untouched** — the $320k construction loan never sees lab capex or lab debt; lab rows are additive and removable.
- **Phase B capex is gated** on signed anchor demand (seat or retreat pipeline). The lab is optional; the property model stands alone at $42.7k NOI.
- GPU equipment capex/depreciation lives on Lab LLC — deliberately absent from this file.

**Risk register additions:** (1) demand: mitigated by gating Phase B + keeping B-model lodging primary; (2) uplink: Starlink+LTE dual-path, workload selection is latency-tolerant; (3) gen-fuel cost spike: elastic scheduling drops gen share first; (4) CUP if colo later: already on optional-CUP roadmap Y5+; (5) equipment insurance: scheduled floater + business interruption.

## 6. What changed in the repo

| File | Change |
|---|---|
| `clean-sheet/CLEAN_SHEET_PLAN.png` | **v2** — Shop → AI FRONTIER LAB (indigo), dry coolers, 60 kW gen, BESS 80→240, PV 25→75, Starlink dish |
| `clean-sheet/AI_FRONTIER_LAB_SHEET.png` | **new** — power single-line, 24-h energy balance, shell spec |
| `clean-sheet/PHASING_INCOME_FIRST.png` | Phase 1 = ADU + lab shell; Phase 2 = Lodge + Lab Phase A; Phase 3 = combined $71.7k NOI |
| `docs/AI_FRONTIER_LAB.md` | this document |
| `docs/APN30055004_ProForma.xlsx` | Assumptions + ProForma_5yr + Sensitivity gain the LAB block |
| `docs/BUSINESS_PLAN_TEMPLATE.md` | new §12 AI FRONTIER LAB |
| `clean-sheet/CLEAN_SHEET_DESIGN_BRIEF.md` | lab addendum |

**Next steps:** (1) AZ LLC filings + EINs; (2) draft License & Services Agreement (CPA reviews rates); (3) shell rough-in in Phase 1 build docs (conduit, panel space, cooling pads — cheap now, expensive later); (4) list 1 pilot seat / 1 pilot retreat before pouring Phase B money; (5) confirm AR-5 home-occupation reading with Coconino planning (write-up ready in §3).
