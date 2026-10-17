import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Compass,
  Layers as LayersIcon,
  Minus,
  Plus,
  Printer,
  RotateCcw,
  Ruler,
  Stamp,
} from "lucide-react";
import type { LayerId, SiteProperty } from "../data/properties";
import { LAYERS, PE_IMPROVEMENTS, PRESETS } from "../data/properties";
import { img } from "../assets/media";
import EngineRoomPlan from "./EngineRoomPlan";
import HearthPlan from "./HearthPlan";
import type { MeasurePoint } from "./planPrimitives";
import { cn } from "../utils/cn";

const FEATURES: Record<string, { name: string; notes: string; image?: string; tag: string }> = {
  lodge: {
    name: "Alpine Manor Lodge",
    tag: "4,500 SF GFA · Layer 2",
    notes: "Principal dwelling. Timber and basalt. Aligned to the 138.8° Humphreys view ray. 28' height, well under the 35' AR-5 cap.",
    image: img.alpineLodge,
  },
  spa: {
    name: "Nordic Wellness Spa",
    tag: "1,250 SF · Layer 2",
    notes: "Accessory wellness pavilion with mineral tubs and geothermal loop. Dark-sky shielded. Counted in lot coverage.",
    image: img.nordicSpa,
  },
  adu: {
    name: "Caretaker Carriage ADU",
    tag: "800 SF · Layer 1 Seed",
    notes: "By-right accessory dwelling. Phase-1 occupancy while the lodge is in construction. Shares the service court with the gym/shop.",
    image: img.guestAdu,
  },
  shop: {
    name: "Gym / Workshop",
    tag: "1,500 SF · Layer 1 Seed",
    notes: "Carriage-house workshop and conditioning gym. First-phase support building on the west service court.",
    image: img.barn,
  },
  barn: {
    name: "Barn",
    tag: "Agricultural structure",
    notes: "Engine Room: 3,200 SF five-stall barn and tack. The Hearth: 3,000 SF / four-stall equestrian barn and workshop.",
    image: img.barn,
  },
  greenhouse: {
    name: "Geothermal Greenhouse",
    tag: "1,750 SF · Layer 3",
    notes: "Year-round production house, ground-loop tempered. Starts for the 1.5-acre heirloom orchard.",
    image: img.greenhouse,
  },
  observatory: {
    name: "Ash-Dome Observatory",
    tag: "10' dome · Layer 4",
    notes: "Isolated pier, 10' ash dome. Dark-sky program. Not occupied floor area. Flagstaff IDA lighting required on all approaches.",
    image: img.observatory,
  },
  farmhouse: {
    name: "Principal Farmhouse",
    tag: "4,000 SF GFA · PFR",
    notes: "By-right principal dwelling. 12' × 48' stargazing deck to true north. Covered porch to the south entry court. 26' height.",
    image: img.farmhouse,
  },
  guest: {
    name: "Guest House / ADU",
    tag: "750 SF · By-right",
    notes: "Detached accessory dwelling. Independent of the CUP hospitality overlay.",
    image: img.guestAdu,
  },
  bathhouse: {
    name: "Retreat Bathhouse",
    tag: "480 SF · CUP",
    notes: "Shared bathhouse serving Y1–Y8. Construction gated on Conditional Use Permit for hospitality operations.",
    image: img.nordicSpa,
  },
  plaza: {
    name: "Central Gathering Plaza",
    tag: "Fire pit · CUP overlay",
    notes: "Arrival hearth and fire pit. Geometric center of the yurt crescent. Not counted as GFA.",
    image: img.yurtPlaza,
  },
  yurts: {
    name: "Yurt Pads Y1–Y8",
    tag: "Conditional · CUP",
    notes: "Eight 4-season yurt pitcher pads on a crescent inside the pasture. Hospitality use requires Board of Supervisors CUP.",
    image: img.yurtPlaza,
  },
  pasture: {
    name: "Pasture & Corral",
    tag: "Agricultural",
    notes: "Engine Room: 1.5-acre timber post-and-board corral. The Hearth: 2.8-acre pasture. Both exceed the 1-acre livestock minimum.",
  },
  orchard: {
    name: "Heirloom Orchard",
    tag: "1.5 acre · Layer 3",
    notes: "Apple and cherry grid on the east setback interior. Windbreak on the east property line. Production for the Engine Room CSA.",
    image: img.orchard,
  },
  well: {
    name: "Domestic Well",
    tag: "ADEQ isolation",
    notes: "Engine Room: 500' well. The Hearth: 400' well. Both carry a 100' sanitary isolation radius exceeding typical ADEQ well-to-septic separations.",
  },
  solar: {
    name: "Microgrid",
    tag: "Off-grid capable",
    notes: "Engine Room: 25 kW bifacial PV + 80 kWh BESS + 30 kW generator. The Hearth: 20 kW PV + 80 kWh BESS + 25 kW generator.",
  },
  retention: {
    name: "Retention Basin",
    tag: "Drainage",
    notes: "On-site stormwater retention for the south pasture and arrival court. Sized in final C-102 grading.",
  },
  geo1: { name: "Geodesic Stewardship Zone", tag: "Layer 4", notes: "16–24' geodesic teaching / observation zone. Not a dwelling." },
  geo2: { name: "Geodesic Stewardship Zone", tag: "Layer 4", notes: "16–24' geodesic teaching / observation zone. Not a dwelling." },
  geo3: { name: "Geodesic Stewardship Zone", tag: "Layer 4", notes: "16–24' geodesic teaching / observation zone. Not a dwelling." },
  geo4: { name: "Geodesic Stewardship Zone", tag: "Layer 4", notes: "16–24' geodesic teaching / observation zone. Not a dwelling." },
  geo5: { name: "Geodesic Stewardship Zone", tag: "Layer 4", notes: "16–24' geodesic teaching / observation zone. Not a dwelling." },
  "rev-septic": {
    name: "REV-A1 · 100% Reserve Septic Disposal & Dual Valve",
    tag: "ADEQ A.A.C. R18-9-A312(D)",
    notes: "Protected 100% reserve replacement leach area fenced from livestock compaction + 2-way alternating diversion valve. On The Hearth, separates Phase 1 By-Right (1,500G) from Phase 2 CUP Hospitality (3,000G).",
  },
  "rev-cistern": {
    name: "REV-A2 · 10,000-Gal Buried Fire Cistern & NST Hydrant",
    tag: "IFC Appendix B / NFPA 1142",
    notes: "Frost-protected buried cistern below the 42\" frost line near the entry gate with a 4.5\" NH dry-hydrant draft connection and 20' all-weather fire apparatus access.",
  },
  "rev-swale": {
    name: "REV-A5 · Up-Slope Interceptor Swale & 2' Contours",
    tag: "Coconino Drainage Criteria",
    notes: "Armored basalt rip-rap interceptor swale @ 1.8–2.0% slope diverting 100-yr monsoon sheet flow around foundations and corrals into retention / orchard infiltration.",
  },
  "rev-snow": {
    name: "REV-A6 · High-Country Snow Plow Push Pocket",
    tag: "ASCE 7 Snow Load (60–75 psf)",
    notes: "Dedicated 25'×40' snow-plow storage zone on the down-slope edge of the rotunda / arrival court so winter berms never block gates, garages, or solar arrays.",
  },
};

export default function SitePlanViewer({
  property,
  onBack,
  onSwitch,
}: {
  property: SiteProperty;
  onBack: () => void;
  onSwitch: () => void;
}) {
  const [preset, setPreset] = useState("master");
  const [layers, setLayers] = useState<Set<LayerId>>(new Set(PRESETS[0].layers));
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [tab, setTab] = useState<"data" | "rev-a" | "legend" | "compliance">("rev-a");
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePts, setMeasurePts] = useState<MeasurePoint[]>([]);
  const [sheetTheme, setSheetTheme] = useState<"dark" | "blueprint" | "bond">("dark");

  const parcelImprovements = useMemo(
    () => PE_IMPROVEMENTS.filter((imp) => imp.parcel === "both" || imp.parcel === property.id),
    [property.id],
  );

  const handleMeasureClick = (pt: MeasurePoint) => {
    setMeasurePts((prev) => (prev.length >= 2 ? [pt] : [...prev, pt]));
  };

  const applyPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPreset(id);
    setLayers(new Set(p.layers));
  };

  const toggle = (id: LayerId) => {
    setPreset("custom");
    setLayers((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const feature = selected ? FEATURES[selected] : null;
  const structure = useMemo(
    () => property.structures.find((s) => s.id === selected) || null,
    [property, selected],
  );

  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="font-mono text-[10px] tracking-[0.22em] text-mute uppercase hover:text-gold"
          >
            ← Index
          </button>
          <span className="h-4 w-px bg-white/15" />
          <div>
            <div className="font-display text-sm font-semibold tracking-wide text-paper md:text-base">
              {property.name} — {property.epithet}
            </div>
            <div className="font-mono text-[10px] tracking-[0.18em] text-mute uppercase">
              {property.code} · Sheet {property.sheet} · {property.scale} · {property.date}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              const next = !measureMode;
              setMeasureMode(next);
              if (!next) setMeasurePts([]);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 border px-2.5 py-1.5 font-mono text-[10px] tracking-[0.15em] uppercase",
              measureMode
                ? "border-gold bg-gold text-ink font-semibold"
                : "border-white/15 text-mute hover:border-gold/50 hover:text-paper",
            )}
            title="Click any two points on the parcel to measure distance (ft) and compass bearing"
          >
            <Ruler size={12} />
            {measureMode ? "Measuring (click 2 pts)" : "Measure"}
          </button>
          <button
            onClick={() => {
              applyPreset("redline");
              setTab("rev-a");
            }}
            className={cn(
              "inline-flex items-center gap-1.5 border px-2.5 py-1.5 font-mono text-[10px] tracking-[0.15em] uppercase",
              layers.has("redlines")
                ? "border-[#ff4d6d] bg-[#ff4d6d]/20 text-[#ff4d6d]"
                : "border-white/15 text-mute hover:border-[#ff4d6d]/50 hover:text-paper",
            )}
          >
            <AlertTriangle size={12} />
            PE Redlines (REV A)
          </button>
          <div className="hidden items-center border border-white/10 font-mono text-[9px] uppercase sm:flex">
            {(["dark", "blueprint", "bond"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSheetTheme(t)}
                className={cn(
                  "px-2 py-1.5 tracking-[0.14em]",
                  sheetTheme === t ? "bg-gold/20 text-gold" : "text-mute hover:text-paper",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={() => window.print()}
            className="hidden items-center gap-1 border border-white/15 px-2.5 py-1.5 font-mono text-[10px] tracking-[0.14em] text-mute uppercase hover:border-white/30 hover:text-paper lg:inline-flex"
            title="Print / Plot ARCH-D Check Sheet"
          >
            <Printer size={12} />
            Plot
          </button>
          <button
            onClick={onSwitch}
            className="hidden border border-gold/40 px-3 py-1.5 font-mono text-[10px] tracking-[0.16em] text-gold uppercase hover:bg-gold hover:text-ink md:inline-flex"
          >
            Swap parcel
          </button>
          <div className="hidden items-center gap-1 border border-white/10 md:flex">
            <button className="p-1.5 text-mute hover:text-paper" onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))} aria-label="Zoom out">
              <Minus size={14} />
            </button>
            <span className="font-mono text-[10px] text-mute w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button className="p-1.5 text-mute hover:text-paper" onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))} aria-label="Zoom in">
              <Plus size={14} />
            </button>
            <button className="p-1.5 text-mute hover:text-paper" onClick={() => setZoom(1)} aria-label="Reset zoom">
              <RotateCcw size={13} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-white/10 px-4 py-2 md:px-6">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => applyPreset(p.id)}
            className={cn(
              "shrink-0 border px-3 py-1 font-mono text-[10px] tracking-[0.16em] uppercase",
              preset === p.id ? "border-gold bg-gold/15 text-gold" : "border-white/10 text-mute hover:border-white/25 hover:text-paper",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[240px_1fr_320px]">
        <aside className="border-b border-white/10 p-4 lg:border-r lg:border-b-0">
          <div className="mb-3 flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] text-gold uppercase">
            <LayersIcon size={12} /> Layer control
          </div>
          <ul className="space-y-1">
            {LAYERS.filter((l) => property.id === "engine" || l.id !== "views").map((l) => (
              <li key={l.id}>
                <button
                  onClick={() => toggle(l.id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-2 py-1.5 text-left font-mono text-[11px]",
                    layers.has(l.id) ? "text-paper" : "text-mute/60",
                  )}
                >
                  <span className="inline-block h-[3px] w-5" style={{ background: layers.has(l.id) ? l.color : "#1c2838" }} />
                  {l.label}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-6 border-t border-white/10 pt-4">
            <div className="mb-2 font-mono text-[10px] tracking-[0.22em] text-gold uppercase">Phasing</div>
            <ul className="space-y-3">
              {property.layers.map((l) => (
                <li key={l.id}>
                  <div className="font-mono text-[11px] text-paper">{l.label}</div>
                  <div className="mt-0.5 text-[11px] leading-relaxed text-mute">{l.detail}</div>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="relative min-h-[640px] cad-grid-fine overflow-hidden bg-sheet">
          <div
            className="flex h-full min-h-[640px] items-center justify-center p-3 transition-transform duration-300"
            style={{ transform: `scale(${zoom})` }}
          >
            <div
              className="sheet-shadow h-full w-full max-w-[980px] bg-ink transition-all duration-300"
              style={{
                filter:
                  sheetTheme === "bond"
                    ? "invert(0.94) hue-rotate(180deg) contrast(1.08)"
                    : sheetTheme === "blueprint"
                      ? "sepia(0.35) hue-rotate(175deg) saturate(1.7) brightness(1.04)"
                      : undefined,
              }}
            >
              {property.id === "engine" ? (
                <EngineRoomPlan
                  layers={layers}
                  selected={selected}
                  hovered={hovered}
                  onSelect={setSelected}
                  onHover={setHovered}
                  measureMode={measureMode}
                  measurePts={measurePts}
                  onMeasureClick={handleMeasureClick}
                />
              ) : (
                <HearthPlan
                  layers={layers}
                  selected={selected}
                  hovered={hovered}
                  onSelect={setSelected}
                  onHover={setHovered}
                  measureMode={measureMode}
                  measurePts={measurePts}
                  onMeasureClick={handleMeasureClick}
                />
              )}
            </div>
          </div>
          <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap items-center gap-2">
            <span className="border border-white/10 bg-ink/85 px-2 py-1 font-mono text-[10px] tracking-[0.16em] text-mute uppercase backdrop-blur">
              {measureMode
                ? "Measure mode active: click Point A then Point B on parcel"
                : "Click a structure or REV-A cloud · Toggle layers · Not for construction"}
            </span>
            {measurePts.length > 0 && (
              <button
                onClick={() => setMeasurePts([])}
                className="pointer-events-auto border border-gold/50 bg-ink/90 px-2 py-1 font-mono text-[10px] tracking-[0.14em] text-gold uppercase"
              >
                Clear measurement
              </button>
            )}
          </div>
        </div>

        <aside className="border-t border-white/10 lg:border-t-0 lg:border-l">
          <div className="flex border-b border-white/10">
            {(["rev-a", "data", "legend", "compliance"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 py-2.5 font-mono text-[10px] tracking-[0.15em] uppercase",
                  tab === t ? "border-b-2 border-gold text-gold" : "text-mute hover:text-paper",
                )}
              >
                {t === "rev-a" ? "REV-A PE" : t}
              </button>
            ))}
          </div>

          <div className="max-h-[720px] overflow-y-auto p-4">
            {tab === "rev-a" && (
              <div className="space-y-3">
                <div className="border border-[#ff4d6d]/35 bg-[#ff4d6d]/10 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-[#ff4d6d] uppercase">
                      PE Design Review · Revision A
                    </span>
                    <button
                      onClick={() => {
                        if (!layers.has("redlines")) toggle("redlines");
                        if (!layers.has("topo")) toggle("topo");
                        if (!layers.has("fire")) toggle("fire");
                      }}
                      className="border border-[#ff4d6d]/50 px-2 py-0.5 font-mono text-[9px] tracking-[0.14em] text-[#ff4d6d] uppercase hover:bg-[#ff4d6d] hover:text-ink"
                    >
                      Show all on sheet
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-paper/85">
                    Click any Revision-A engineering improvement below to highlight its location on Sheet C-101 and turn on its civil layer.
                  </p>
                </div>

                {parcelImprovements.map((imp) => {
                  const active = selected === imp.focusFeatureId;
                  return (
                    <div
                      key={imp.id}
                      onClick={() => {
                        setSelected(imp.focusFeatureId);
                        setLayers((prev) => new Set([...prev, "redlines", "topo", "fire", "septic"]));
                      }}
                      className={cn(
                        "cursor-pointer border p-3 transition",
                        active
                          ? "border-[#ff4d6d] bg-panel"
                          : "border-white/10 bg-panel/40 hover:border-gold/40",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="bg-[#ff4d6d] px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.14em] text-ink">
                          {imp.revTag}
                        </span>
                        <span className="font-mono text-[9px] tracking-[0.14em] text-gold uppercase">
                          {imp.discipline}
                        </span>
                      </div>
                      <div className="mt-1.5 font-display text-xs font-semibold text-paper">
                        {imp.title}
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-mute">
                        {imp.engineeredSolution}
                      </p>
                      <div className="mt-2 border-t border-white/5 pt-1.5 font-mono text-[9px] text-cad-green">
                        ▸ {imp.quantifiedImpact}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {tab === "data" && (
              <div className="space-y-3">
                <Row k="Project" v={`${property.name} — ${property.epithet}`} />
                <Row k="Portfolio" v={property.portfolioRole} />
                <Row k="Character" v={property.designCharacter} />
                <Row k="Coordinates" v={property.locationDms} />
                <Row k="Elevation" v={property.elevation} />
                <Row k="Zoning" v={property.zoning} />
                <Row k="Lot" v={`${property.lotAcres.toFixed(4)} ac · ${property.lotSf.toLocaleString()} SF`} />
                <Row k="Sides" v={`${property.lotSide.toFixed(2)}' × ${property.lotSide.toFixed(2)}'`} />
                <Row k="GFA / coverage" v={`${property.gfa.toLocaleString()} SF · ${property.coveragePct}%  (max ${property.coverageMax}%)`} />
                <Row k="Setbacks" v={`${property.setbackDesign}'-0" all sides (design)`} />
                <Row k="Access" v={property.access} />
                <Row k="Water" v={property.water} />
                <Row k="Waste" v={property.septic} />
                <Row k="Energy" v={property.energy} />
                <Row k="Dark sky" v={property.darkSky} />
                <Row k="View" v={property.viewCorridor} />
                <div className="pt-3">
                  <div className="mb-2 font-mono text-[10px] tracking-[0.18em] text-gold uppercase">Permitted (by-right)</div>
                  <ul className="space-y-1">
                    {property.permitted.map((p) => (
                      <li key={p} className="text-[11px] leading-snug text-paper/80">
                        <span className="mr-1.5 text-cad-green">▸</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-3">
                  <div className="mb-2 font-mono text-[10px] tracking-[0.18em] text-cad-purple uppercase">Conditional / CUP</div>
                  <ul className="space-y-1">
                    {property.conditional.map((p) => (
                      <li key={p} className="text-[11px] leading-snug text-paper/80">
                        <span className="mr-1.5 text-cad-purple">▸</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {tab === "legend" && (
              <ul className="space-y-2">
                {property.legend.map((item) => (
                  <li key={item.id} className="flex items-start gap-3">
                    <span
                      className="mt-2 inline-block h-[3px] w-8 shrink-0"
                      style={{
                        background: item.color,
                        opacity: item.style === "dashed" ? 0.85 : 1,
                        borderTop: item.style === "dashed" ? `2px dashed ${item.color}` : undefined,
                        backgroundColor: item.style === "dashed" ? "transparent" : item.color,
                      }}
                    />
                    <span className="font-mono text-[11px] leading-snug text-paper">{item.label}</span>
                  </li>
                ))}
              </ul>
            )}

            {tab === "compliance" && (
              <ul className="space-y-2">
                {property.compliance.map((c) => (
                  <li key={c.label} className="border-b border-white/5 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] tracking-[0.14em] text-mute uppercase">{c.label}</span>
                      <StatusPill status={c.status} />
                    </div>
                    <div className="mt-0.5 text-[12px] text-paper">{c.value}</div>
                  </li>
                ))}
              </ul>
            )}

            {(feature || structure) && (
              <div className="mt-6 border border-gold/30 bg-panel p-3">
                {(structure?.image || feature?.image) && (
                  <img
                    src={structure?.image || feature?.image}
                    alt=""
                    className="mb-3 h-28 w-full object-cover"
                  />
                )}
                <div className="font-mono text-[10px] tracking-[0.18em] text-gold uppercase">
                  {structure?.program || feature?.tag}
                </div>
                <div className="mt-1 font-display text-base font-semibold">{structure?.name || feature?.name}</div>
                {structure && (
                  <div className="mt-1 font-mono text-[11px] text-mute">
                    {structure.gfa > 0 ? `${structure.gfa.toLocaleString()} SF GFA` : "Non-GFA element"}
                  </div>
                )}
                <p className="mt-2 text-[12px] leading-relaxed text-mute">{structure?.notes || feature?.notes}</p>
                <button
                  onClick={() => setSelected(null)}
                  className="mt-3 font-mono text-[10px] tracking-[0.16em] text-gold uppercase hover:underline"
                >
                  Clear selection
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      <TitleBlock property={property} />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[92px_1fr] gap-2 border-b border-white/5 pb-2">
      <div className="font-mono text-[10px] tracking-[0.12em] text-mute uppercase">{k}</div>
      <div className="text-[12px] leading-snug text-paper">{v}</div>
    </div>
  );
}

function StatusPill({ status }: { status: "ok" | "note" | "cup" }) {
  const map = {
    ok: "border-cad-green/40 text-cad-green",
    note: "border-gold/40 text-gold",
    cup: "border-cad-purple/40 text-cad-purple",
  };
  const label = { ok: "OK", note: "NOTE", cup: "CUP" };
  return (
    <span className={cn("border px-1.5 py-0.5 font-mono text-[9px] tracking-[0.16em]", map[status])}>{label[status]}</span>
  );
}

function TitleBlock({ property }: { property: SiteProperty }) {
  return (
    <div className="grid grid-cols-1 border-t border-white/15 md:grid-cols-[1fr_280px_140px]">
      <div className="px-5 py-4">
        <div className="font-display text-lg font-semibold tracking-wide md:text-xl">
          {property.name} — {property.epithet}
          <span className="ml-2 font-mono text-sm text-mute">({property.code})</span>
        </div>
        <div className="mt-1 font-mono text-[11px] tracking-[0.14em] text-mute uppercase">
          5.0000 acre master site plan · {property.orientation} · AR-5
        </div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10px] text-mute">
          <span>LOC {property.locationDms}</span>
          <span>DATE {property.date}</span>
          <span>SCALE {property.scale}</span>
          <span>{property.status}</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-white/10 px-5 py-4 md:border-t-0 md:border-l">
        <div>
          <div className="font-mono text-[10px] tracking-[0.2em] text-mute uppercase">Sheet number</div>
          <div className="font-display text-3xl font-bold tracking-widest text-paper">{property.sheet}</div>
        </div>
        <Compass className="text-mute" size={22} />
      </div>
      <div className="flex items-center justify-center border-t border-white/10 py-4 md:border-t-0 md:border-l">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/30">
          <div className="flex h-16 w-16 flex-col items-center justify-center rounded-full border border-gold/50 text-center">
            <Stamp size={12} className="text-gold" />
            <div className="mt-0.5 font-mono text-[7px] leading-tight tracking-wider text-gold">
              BROADSWORD
              <br />
              PLANNING
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


