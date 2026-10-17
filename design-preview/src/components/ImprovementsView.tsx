import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Compass,
  Droplets,
  Flame,
  Layers,
  ShieldAlert,
  Wind,
} from "lucide-react";
import { PE_IMPROVEMENTS, type ViewId } from "../data/properties";
import { cn } from "../utils/cn";

export default function ImprovementsView({ onNav }: { onNav: (v: ViewId) => void }) {
  const [filterParcel, setFilterParcel] = useState<"all" | "engine" | "hearth">("all");
  const [checkedRevs, setCheckedRevs] = useState<Set<string>>(
    new Set(PE_IMPROVEMENTS.map((i) => i.id)),
  );

  const visible = PE_IMPROVEMENTS.filter(
    (item) => filterParcel === "all" || item.parcel === "both" || item.parcel === filterParcel,
  );

  const toggleRev = (id: string) => {
    setCheckedRevs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const readinessScore = Math.round(48 + (checkedRevs.size / PE_IMPROVEMENTS.length) * 52);

  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-ink/90 px-6 py-4 backdrop-blur-md">
        <button onClick={() => onNav("home")} className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/60">
            <Compass size={16} className="text-gold" />
          </span>
          <span>
            <span className="block font-display text-sm font-bold tracking-[0.18em]">BROADSWORD</span>
            <span className="block font-mono text-[9px] tracking-[0.28em] text-mute uppercase">
              Civil · Land · Stewardship
            </span>
          </span>
        </button>
        <nav className="hidden items-center gap-5 font-mono text-[10px] tracking-[0.2em] uppercase sm:flex">
          <button onClick={() => onNav("engine")} className="text-paper/70 hover:text-gold">
            Engine Room
          </button>
          <button onClick={() => onNav("hearth")} className="text-paper/70 hover:text-gold">
            The Hearth
          </button>
          <button onClick={() => onNav("improvements")} className="text-gold">
            PE Review (REV-A)
          </button>
          <button onClick={() => onNav("compare")} className="text-paper/70 hover:text-gold">
            Compare
          </button>
          <button onClick={() => onNav("standards")} className="text-paper/70 hover:text-gold">
            Standards
          </button>
        </nav>
        <button
          onClick={() => onNav("engine")}
          className="border border-gold/40 px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] text-gold uppercase hover:bg-gold hover:text-ink"
        >
          Open C-101
        </button>
      </header>

      <section className="border-b border-white/10 bg-sheet cad-grid">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 border border-[#ff4d6d]/50 bg-[#ff4d6d]/10 px-3 py-1 font-mono text-[10px] tracking-[0.22em] text-[#ff4d6d] uppercase">
                <AlertTriangle size={12} /> PE Value-Engineering & Redline Review · Revision A
              </div>
              <h1 className="font-display mt-4 text-3xl font-bold md:text-5xl">
                Six Civil & Site Improvements to Make Both Plans Permit-Ready
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-paper/75 md:text-base">
                Your two original C-101 concepts establish strong architectural zoning and 50&apos;-0&quot; building envelopes.
                To elevate them from concept layouts to an engineering-grade Design Development set in Coconino County
                (7,000&apos;+ elevation), we added six Revision-A civil, sanitary, WUI fire, microclimate, and entitlement upgrades directly onto the CAD sheets.
              </p>
            </div>

            <div className="hairline-gold min-w-[270px] bg-panel p-5">
              <div className="font-mono text-[10px] tracking-[0.2em] text-gold uppercase">
                Civil Submittal Readiness
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="font-display text-4xl font-extrabold text-cad-green">{readinessScore}%</span>
                <span className="font-mono text-[11px] text-mute">
                  ({checkedRevs.size}/{PE_IMPROVEMENTS.length} REV-A items active)
                </span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden bg-ink">
                <div
                  className="h-full bg-gradient-to-r from-gold to-cad-green transition-all duration-300"
                  style={{ width: `${readinessScore}%` }}
                />
              </div>
              <p className="mt-2.5 text-[11px] leading-snug text-mute">
                Toggle REV-A items below to evaluate impact on ADEQ wastewater, IFC fire flow, and CUP approval risk.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "All Parcels (6)" },
                { id: "engine", label: "Peaks Vista — Engine Room" },
                { id: "hearth", label: "Flag — The Hearth" },
              ].map((b) => (
                <button
                  key={b.id}
                  onClick={() => setFilterParcel(b.id as "all" | "engine" | "hearth")}
                  className={cn(
                    "border px-3.5 py-1.5 font-mono text-[10px] tracking-[0.18em] uppercase",
                    filterParcel === b.id
                      ? "border-gold bg-gold text-ink font-semibold"
                      : "border-white/15 text-mute hover:border-white/35 hover:text-paper",
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onNav("engine")}
                className="inline-flex items-center gap-2 border border-[#ff4d6d]/60 bg-[#ff4d6d]/15 px-4 py-2 font-mono text-[10px] tracking-[0.18em] text-[#ff4d6d] uppercase hover:bg-[#ff4d6d] hover:text-ink"
              >
                Inspect Engine Room Redlines <ArrowRight size={13} />
              </button>
              <button
                onClick={() => onNav("hearth")}
                className="inline-flex items-center gap-2 border border-gold/50 bg-gold/10 px-4 py-2 font-mono text-[10px] tracking-[0.18em] text-gold uppercase hover:bg-gold hover:text-ink"
              >
                Inspect The Hearth Redlines <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-6 md:grid-cols-2">
          {visible.map((item) => {
            const active = checkedRevs.has(item.id);
            return (
              <article
                key={item.id}
                className={cn(
                  "flex flex-col justify-between border bg-panel p-6 transition",
                  active ? "border-gold/45" : "border-white/10 opacity-65",
                )}
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#ff4d6d] px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.16em] text-ink">
                        {item.revTag}
                      </span>
                      <span className="border border-white/15 px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] text-gold uppercase">
                        {item.discipline}
                      </span>
                      <span className="font-mono text-[10px] tracking-[0.14em] text-mute uppercase">
                        · {item.parcel === "both" ? "Both Parcels" : item.parcel === "engine" ? "Engine Room" : "The Hearth"}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleRev(item.id)}
                      className={cn(
                        "inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[9px] tracking-[0.14em] uppercase",
                        active
                          ? "border-cad-green/50 text-cad-green"
                          : "border-white/15 text-mute",
                      )}
                    >
                      <CheckCircle2 size={11} />
                      {active ? "Included in REV-A" : "Excluded"}
                    </button>
                  </div>

                  <h2 className="font-display mt-3 text-xl font-bold text-paper">{item.title}</h2>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="border border-white/10 bg-ink/60 p-3.5">
                      <div className="font-mono text-[9px] tracking-[0.18em] text-[#ff4d6d] uppercase">
                        Original Sketch Gap
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-mute">{item.originalIssue}</p>
                    </div>
                    <div className="border border-cad-green/30 bg-cad-green/5 p-3.5">
                      <div className="font-mono text-[9px] tracking-[0.18em] text-cad-green uppercase">
                        Engineered REV-A Solution
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-paper/90">{item.engineeredSolution}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 border-t border-white/10 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-mono text-[10px] text-gold">
                      {item.codeReference}
                    </div>
                    <button
                      onClick={() => onNav(item.parcel === "hearth" ? "hearth" : "engine")}
                      className="font-mono text-[10px] tracking-[0.16em] text-paper uppercase hover:text-gold"
                    >
                      View on Sheet C-101 →
                    </button>
                  </div>
                  <div className="mt-1.5 font-mono text-[11px] text-cad-green">
                    ▸ Impact: {item.quantifiedImpact}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Summary Discipline Matrix */}
        <div className="mt-14 border border-white/10 bg-sheet p-6 md:p-8">
          <div className="font-mono text-[10px] tracking-[0.24em] text-gold uppercase">
            Next-Step Deliverables for Arizona PE Sealing
          </div>
          <h3 className="font-display mt-2 text-2xl font-bold">
            Recommended 5-Sheet Permit Package Structure
          </h3>
          <div className="mt-6 grid gap-4 md:grid-cols-5">
            {[
              {
                icon: Layers,
                code: "C-101",
                title: "Master Site & Survey Control",
                desc: "ALTA/NSPS boundary, 466.69' monumentation, 50' AR-5 envelopes, GFA & coverage table.",
              },
              {
                icon: Droplets,
                code: "C-102",
                title: "Grading, Drainage & SWPPP",
                desc: "2' contours, finished floor elevations (FFE), basalt rip-rap interceptor swales, retention volume.",
              },
              {
                icon: ShieldAlert,
                code: "C-103",
                title: "ADEQ On-Site Wastewater",
                desc: "Perc test logs, primary + 100% reserve leach trenches, 100' well isolation, Phase 2 CUP stub.",
              },
              {
                icon: Flame,
                code: "F-101",
                title: "WUI Fire & Apparatus Access",
                desc: "10,000G frost-buried cistern, 4.5\" NST dry hydrant, 20' all-weather drive, 30'/100' fuel zones.",
              },
              {
                icon: Wind,
                code: "L-101 / E-101",
                title: "Dark-Sky, Seeing & Microgrid",
                desc: "BUG B0-L0-U0 luminaire schedule, SW wind/thermal plume buffer, 25kW/20kW PV + 80kWh BESS.",
              },
            ].map((s) => (
              <div key={s.code} className="border border-white/10 bg-panel p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-gold">{s.code}</span>
                  <s.icon size={15} className="text-gold" />
                </div>
                <div className="mt-2 font-display text-sm font-semibold">{s.title}</div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-mute">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}


