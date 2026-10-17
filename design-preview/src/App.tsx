import { useState } from "react";
import {
  ArrowRight,
  Compass,
  Map,
  MoonStar,
  ShieldCheck,
  Trees,
  Waves,
  Zap,
} from "lucide-react";
import type { ViewId } from "./data/properties";
import { CODE_NOTES, ENGINE, HEARTH, PE_IMPROVEMENTS, type SiteProperty } from "./data/properties";
import SitePlanViewer from "./components/SitePlanViewer";
import ImprovementsView from "./components/ImprovementsView";
import { img } from "./assets/media";
import { cn } from "./utils/cn";

const PEAKS =
  "https://images.pexels.com/photos/32207646/pexels-photo-32207646.jpeg?auto=compress&cs=tinysrgb&w=1920";
const ROAD =
  "https://images.pexels.com/photos/32207642/pexels-photo-32207642.jpeg?auto=compress&cs=tinysrgb&w=1600";
const FOREST =
  "https://images.pexels.com/photos/32207644/pexels-photo-32207644.jpeg?auto=compress&cs=tinysrgb&w=1600";
const MILKY =
  "https://images.pexels.com/photos/11768608/pexels-photo-11768608.jpeg?auto=compress&cs=tinysrgb&w=1600";

export default function App() {
  const [view, setView] = useState<ViewId>("home");

  if (view === "engine") {
    return (
      <SitePlanViewer
        property={ENGINE}
        onBack={() => setView("home")}
        onSwitch={() => setView("hearth")}
      />
    );
  }
  if (view === "hearth") {
    return (
      <SitePlanViewer
        property={HEARTH}
        onBack={() => setView("home")}
        onSwitch={() => setView("engine")}
      />
    );
  }
  if (view === "improvements") return <ImprovementsView onNav={setView} />;
  if (view === "compare") return <CompareView onNav={setView} />;
  if (view === "standards") return <StandardsView onNav={setView} />;

  return <Home onNav={setView} />;
}

function Home({ onNav }: { onNav: (v: ViewId) => void }) {
  return (
    <div className="min-h-screen bg-ink text-paper">
      <Header onNav={onNav} />

      <section className="relative min-h-[92vh] overflow-hidden">
        <img src={PEAKS} alt="San Francisco Peaks, Flagstaff" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/55 to-ink" />
        <div className="absolute inset-0 cad-grid opacity-50" />
        <div className="relative mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-end px-6 pb-16 pt-28">
          <div className="anim-fade-up mb-6 flex items-center gap-3 font-mono text-[11px] tracking-[0.28em] text-gold uppercase">
            <span className="h-px w-10 bg-gold" />
            Coconino County, Arizona · AR-5 · Sheet C-101
          </div>
          <h1 className="font-display max-w-4xl text-4xl font-extrabold leading-[0.95] tracking-tight md:text-6xl lg:text-7xl">
            Two five-acre
            <br />
            homesteads.
            <br />
            <span className="text-gold">One civil language.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-paper/75 md:text-lg">
            Professional master site plans for Peaks Vista — The Engine Room and Flag — The Hearth.
            Drawn to AR-5, ADEQ, and Flagstaff dark-sky standards. Prepared for a professional engineer’s design-development set.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <button
              onClick={() => onNav("engine")}
              className="inline-flex items-center gap-2 bg-gold px-5 py-3 font-mono text-[11px] tracking-[0.2em] text-ink uppercase hover:bg-paper"
            >
              Open Engine Room <ArrowRight size={14} />
            </button>
            <button
              onClick={() => onNav("hearth")}
              className="inline-flex items-center gap-2 border border-paper/30 px-5 py-3 font-mono text-[11px] tracking-[0.2em] uppercase hover:border-gold hover:text-gold"
            >
              Open The Hearth <ArrowRight size={14} />
            </button>
            <button
              onClick={() => onNav("improvements")}
              className="inline-flex items-center gap-2 border border-[#ff4d6d]/60 bg-[#ff4d6d]/15 px-5 py-3 font-mono text-[11px] tracking-[0.2em] text-[#ff4d6d] uppercase hover:bg-[#ff4d6d] hover:text-ink"
            >
              PE Review & Improvements (REV-A) <ArrowRight size={14} />
            </button>
            <button
              onClick={() => onNav("compare")}
              className="inline-flex items-center gap-2 px-5 py-3 font-mono text-[11px] tracking-[0.2em] text-mute uppercase hover:text-paper"
            >
              Compare parcels
            </button>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-6 border-t border-white/10 pt-8 md:grid-cols-4">
            {[
              ["10.0000 ac", "Combined program"],
              ["18,296 SF", "Total GFA · 4.2% coverage"],
              ["50'-0\"", "Design setbacks all sides"],
              ["B0-L0-U0", "Dark-sky specification"],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="font-display text-2xl font-semibold text-gold md:text-3xl">{k}</div>
                <div className="mt-1 font-mono text-[10px] tracking-[0.18em] text-mute uppercase">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-sheet">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-white/10 md:grid-cols-4">
          {[
            ["Civil", "C-101 master site · C-102 utilities"],
            ["Zoning", "AR-5 by-right + CUP overlay"],
            ["Water", "Deep well · 100' isolation"],
            ["Power", "PV + BESS + generator microgrid"],
          ].map(([a, b]) => (
            <div key={a} className="bg-sheet px-6 py-5">
              <div className="font-mono text-[10px] tracking-[0.22em] text-gold uppercase">{a}</div>
              <div className="mt-1 text-sm text-paper/80">{b}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <div className="font-mono text-[11px] tracking-[0.28em] text-gold uppercase">Sheet index</div>
            <h2 className="font-display mt-2 text-3xl font-bold md:text-4xl">The Broadsword pyramid</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-mute">
              Two complementary 5.0000-acre parcels. The Engine Room produces. The Hearth gathers. Both sit on square 466.69' lots with a 50' design setback that exceeds every AR-5 minimum.
            </p>
          </div>
          <button
            onClick={() => onNav("compare")}
            className="hidden font-mono text-[11px] tracking-[0.2em] text-gold uppercase md:inline-flex"
          >
            Full matrix →
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ParcelCard property={ENGINE} image={ENGINE.heroImage} onOpen={() => onNav("engine")} accent="engine" />
          <ParcelCard property={HEARTH} image={HEARTH.heroImage} onOpen={() => onNav("hearth")} accent="hearth" />
        </div>

        <figure className="mt-6 overflow-hidden border border-white/10">
          <img src={img.aerial} alt="Aerial massing of a 5-acre high-country homestead" className="h-[340px] w-full object-cover md:h-[420px]" />
          <figcaption className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
            <span className="font-display text-sm font-semibold">Aerial massing — 5.0000 acre AR-5 homestead</span>
            <span className="font-mono text-[10px] tracking-[0.18em] text-mute uppercase">
              Windbreak · rotunda · lodge · orchard · microgrid
            </span>
          </figcaption>
        </figure>
      </section>

      <section className="relative overflow-hidden border-y border-white/10">
        <img src={MILKY} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-ink/70" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-2">
          <div>
            <div className="font-mono text-[11px] tracking-[0.28em] text-gold uppercase">Design intent</div>
            <h2 className="font-display mt-2 text-3xl font-bold">Drawn the way a PE would want to receive it.</h2>
            <p className="mt-4 text-sm leading-relaxed text-paper/75">
              Original sketches carried the program. These sheets rebuild that program as a coordinated civil set: survey pins, dimension strings, setback envelopes, well isolation, septic fields, microgrid arrays, dark-sky notes, and an entitlement overlay that separates by-right work from CUP hospitality.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-paper/75">
              Nothing here is sealed. Everything here is ready to become a sealed set — C-101 through E-101 — without redrawing the idea.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Map, t: "Survey control", d: "466.69' square · four pins · true north" },
              { icon: ShieldCheck, t: "AR-5 envelope", d: "50' design setbacks · 3.09 ac buildable" },
              { icon: Waves, t: "Water / waste", d: "Deep wells · 100' buffers · ADEQ 18-9" },
              { icon: Zap, t: "Microgrid", d: "Bifacial PV · BESS · standby generator" },
              { icon: MoonStar, t: "Dark sky", d: "BUG B0-L0-U0 · 3000K · zero uplight" },
              { icon: Trees, t: "Windbreak", d: "Ponderosa screen on the property line" },
            ].map((x) => (
              <div key={x.t} className="border border-white/10 bg-ink/60 p-4 backdrop-blur">
                <x.icon size={16} className="text-gold" />
                <div className="mt-3 font-display text-sm font-semibold">{x.t}</div>
                <div className="mt-1 text-[12px] leading-snug text-mute">{x.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-sheet/80">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="font-mono text-[11px] tracking-[0.28em] text-[#ff4d6d] uppercase">
                Revision A · PE Value-Engineering & Redline Review
              </div>
              <h2 className="font-display mt-2 text-3xl font-bold md:text-4xl">
                Six Civil & Site Upgrades Added to Both C-101 Plans
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mute">
                Beyond redrawing the original sketches, we audited both 5-acre parcels against ADEQ wastewater rules,
                IFC rural fire apparatus codes, Flagstaff astronomical seeing physics, and high-country snow loads.
              </p>
            </div>
            <button
              onClick={() => onNav("improvements")}
              className="inline-flex items-center gap-2 border border-gold/50 bg-gold/10 px-4 py-2.5 font-mono text-[11px] tracking-[0.18em] text-gold uppercase hover:bg-gold hover:text-ink"
            >
              Open Full PE Review (REV-A) <ArrowRight size={14} />
            </button>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PE_IMPROVEMENTS.map((imp) => (
              <div
                key={imp.id}
                onClick={() => onNav("improvements")}
                className="cursor-pointer border border-white/10 bg-panel p-5 transition hover:border-gold/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="bg-[#ff4d6d] px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.15em] text-ink">
                    {imp.revTag}
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.14em] text-gold uppercase">
                    {imp.discipline}
                  </span>
                </div>
                <h3 className="font-display mt-3 text-base font-bold text-paper">{imp.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-mute">{imp.engineeredSolution}</p>
                <div className="mt-3 border-t border-white/5 pt-2 font-mono text-[10px] text-cad-green">
                  ▸ {imp.quantifiedImpact}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="font-mono text-[11px] tracking-[0.28em] text-gold uppercase">Program galleries</div>
        <h2 className="font-display mt-2 text-3xl font-bold">What the linework becomes.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            [img.alpineLodge, "Alpine Manor Lodge", "Peaks Vista · 4,500 SF"],
            [img.observatory, "Ash-dome observatory", "Layer 4 · dark-sky pier"],
            [img.nordicSpa, "Nordic spa", "1,250 SF mineral pavilion"],
            [img.farmhouse, "Principal farmhouse", "Flag · 4,000 SF + deck"],
            [img.barn, "Equestrian barns", "4- and 5-stall agricultural"],
            [img.yurtPlaza, "Yurt crescent", "CUP hospitality overlay"],
            [img.orchard, "Heirloom orchard", "1.5 ac apple / cherry"],
            [img.greenhouse, "Geothermal greenhouse", "1,750 SF production"],
            [img.guestAdu, "Carriage ADU", "By-right accessory dwelling"],
          ].map(([src, t, d]) => (
            <figure key={t} className="group overflow-hidden border border-white/10">
              <img src={src} alt={t} className="h-52 w-full object-cover transition duration-700 group-hover:scale-105" />
              <figcaption className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="font-display text-sm font-semibold">{t}</div>
                  <div className="font-mono text-[10px] tracking-[0.16em] text-mute uppercase">{d}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="border-t border-white/10 bg-sheet">
        <div className="mx-auto grid max-w-7xl gap-0 md:grid-cols-2">
          <div className="relative min-h-[340px]">
            <img src={ROAD} alt="Access road toward the San Francisco Peaks" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/40 to-transparent" />
          </div>
          <div className="px-8 py-14">
            <div className="font-mono text-[11px] tracking-[0.28em] text-gold uppercase">Vicinity</div>
            <h2 className="font-display mt-2 text-3xl font-bold">High country, two climates of program.</h2>
            <p className="mt-4 text-sm leading-relaxed text-mute">
              Peaks Vista sits near 7,280' AMSL on N. Peaks Vista Way, with a 12-mile bearing to Mt. Humphreys. Flag sits near 6,960' with a north stargazing deck and a south arrival court. Both are AR-5, both are 5.0000 acres, both are off-grid capable, both hold Flagstaff as the world’s first International Dark Sky City.
            </p>
            <button
              onClick={() => onNav("standards")}
              className="mt-8 inline-flex items-center gap-2 border border-gold/40 px-4 py-2 font-mono text-[11px] tracking-[0.18em] text-gold uppercase hover:bg-gold hover:text-ink"
            >
              Open code notes <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>

      <Footer onNav={onNav} />
    </div>
  );
}

function ParcelCard({
  property,
  image,
  onOpen,
  accent,
}: {
  property: SiteProperty;
  image: string;
  onOpen: () => void;
  accent: "engine" | "hearth";
}) {
  return (
    <article className="hairline-gold overflow-hidden bg-panel">
      <div className="relative h-64">
        <img src={image} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-panel via-transparent to-transparent" />
        <div className="absolute top-3 left-3 border border-gold/50 bg-ink/70 px-2 py-1 font-mono text-[10px] tracking-[0.2em] text-gold uppercase backdrop-blur">
          {property.sheet} · {property.code}
        </div>
      </div>
      <div className="p-6">
        <div className="font-mono text-[10px] tracking-[0.22em] text-gold uppercase">{property.portfolioRole}</div>
        <h3 className="font-display mt-1 text-2xl font-bold">
          {property.name} — {property.epithet}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-mute">{property.philosophy}</p>
        <dl className="mt-5 grid grid-cols-2 gap-3 font-mono text-[11px]">
          <Stat k="GFA" v={`${property.gfa.toLocaleString()} SF`} />
          <Stat k="Coverage" v={`${property.coveragePct}%`} />
          <Stat k="Elevation" v={property.elevation.split("·")[0]} />
          <Stat k="Energy" v={accent === "engine" ? "25 kW PV" : "20 kW PV"} />
        </dl>
        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="font-mono text-[9px] tracking-[0.2em] text-gold uppercase">By-right program</div>
          <ul className="mt-2 space-y-1">
            {property.permitted.slice(0, 5).map((p) => (
              <li key={p} className="flex gap-2 text-[11px] text-mute">
                <span className="text-cad-green">▸</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <button
          onClick={onOpen}
          className="mt-6 inline-flex items-center gap-2 bg-gold px-4 py-2.5 font-mono text-[11px] tracking-[0.18em] text-ink uppercase hover:bg-paper"
        >
          Open interactive C-101 <ArrowRight size={14} />
        </button>
      </div>
    </article>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="border border-white/10 px-3 py-2">
      <div className="text-[9px] tracking-[0.16em] text-mute uppercase">{k}</div>
      <div className="mt-0.5 text-paper">{v}</div>
    </div>
  );
}

function CompareView({ onNav }: { onNav: (v: ViewId) => void }) {
  const rows: [string, string, string][] = [
    ["Sheet", "C-101 · PV-03", "C-101 · FL-01"],
    ["Role", ENGINE.portfolioRole, HEARTH.portfolioRole],
    ["Coordinates", ENGINE.locationDms, HEARTH.locationDms],
    ["Elevation", "±7,280' AMSL", "±6,960' AMSL"],
    ["Lot", "5.0000 ac · 466.69' sq.", "5.0000 ac · 466.69' sq."],
    ["Zoning", "AR-5", "AR-5"],
    ["GFA", "10,050 SF", "8,246 SF"],
    ["Coverage", "4.61% of 35% max", "3.79% of 35% max"],
    ["Design setbacks", "50'-0\" all sides", "50'-0\" all sides"],
    ["Principal dwelling", "Alpine Manor Lodge 4,500 SF", "Farmhouse 4,000 SF"],
    ["ADU", "Carriage 800 SF", "Guest house 750 SF"],
    ["Agricultural", "5-stall barn 3,200 SF", "4-stall barn 3,000 SF"],
    ["Pasture", "1.5 acre corral", "2.8 acre pasture"],
    ["Specialty", "1.5 ac orchard + greenhouse", "8 yurt pads (CUP)"],
    ["Well", "500' + 100' buffer", "400' + 100' buffer"],
    ["Septic", "2,000G + 3,000 SF field", "1,500G + leach field"],
    ["Microgrid", "25 kW / 80 kWh / 30 kW", "20 kW / 80 kWh / 25 kW"],
    ["Observation", "10' ash-dome observatory", "12' × 48' stargazing deck"],
    ["View / sky", "138.8° SE Humphreys ray", "North meridian deck"],
    ["Hospitality", "None (production campus)", "CUP overlay required"],
    ["Dark sky", "BUG B0-L0-U0 · 3000K", "IDA pathway lighting"],
  ];

  return (
    <div className="min-h-screen bg-ink">
      <Header onNav={onNav} />
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="font-mono text-[11px] tracking-[0.28em] text-gold uppercase">Comparative matrix</div>
        <h1 className="font-display mt-2 text-4xl font-bold">Engine Room vs. The Hearth</h1>
        <p className="mt-4 max-w-2xl text-sm text-mute">
          Same district, same lot geometry, same dark-sky ethic. Divergent programs: production science versus hospitality observation.
        </p>

        <div className="mt-10 overflow-hidden border border-white/10">
          <div className="grid grid-cols-3 border-b border-white/10 bg-panel font-mono text-[10px] tracking-[0.18em] text-gold uppercase">
            <div className="px-4 py-3">Item</div>
            <button onClick={() => onNav("engine")} className="px-4 py-3 text-left hover:text-paper">
              Peaks Vista
            </button>
            <button onClick={() => onNav("hearth")} className="px-4 py-3 text-left hover:text-paper">
              Flag
            </button>
          </div>
          {rows.map((r, i) => (
            <div key={r[0]} className={cn("grid grid-cols-3 text-sm", i % 2 ? "bg-panel/40" : "bg-transparent")}>
              <div className="border-t border-white/5 px-4 py-3 font-mono text-[11px] tracking-[0.12em] text-mute uppercase">{r[0]}</div>
              <div className="border-t border-white/5 px-4 py-3 text-[13px]">{r[1]}</div>
              <div className="border-t border-white/5 px-4 py-3 text-[13px]">{r[2]}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex gap-3">
          <button onClick={() => onNav("engine")} className="bg-gold px-4 py-2 font-mono text-[11px] tracking-[0.16em] text-ink uppercase">
            Open Engine Room
          </button>
          <button onClick={() => onNav("hearth")} className="border border-white/20 px-4 py-2 font-mono text-[11px] tracking-[0.16em] uppercase">
            Open The Hearth
          </button>
        </div>
      </div>
      <Footer onNav={onNav} />
    </div>
  );
}

function StandardsView({ onNav }: { onNav: (v: ViewId) => void }) {
  return (
    <div className="min-h-screen bg-ink">
      <Header onNav={onNav} />
      <div className="relative overflow-hidden">
        <img src={FOREST} alt="" className="absolute inset-0 h-40 w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/20 to-ink" />
        <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-10">
          <div className="font-mono text-[11px] tracking-[0.28em] text-gold uppercase">Code & professional notes</div>
          <h1 className="font-display mt-2 text-4xl font-bold">AR-5, ADEQ, and dark sky.</h1>
          <p className="mt-4 max-w-2xl text-sm text-mute">
            Reference notes used to professionalize the original C-101 sketches. Confirm against the current Coconino County Zoning Ordinance and ADEQ Aquifer Protection rules at time of submittal.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-5xl space-y-6 px-6 pb-20">
        {CODE_NOTES.map((n) => (
          <article key={n.title} className="border border-white/10 bg-panel p-6">
            <h2 className="font-display text-xl font-semibold text-gold">{n.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-paper/80">{n.body}</p>
          </article>
        ))}
        <div className="border border-cad-red/40 bg-cad-red/5 p-6">
          <div className="font-mono text-[11px] tracking-[0.2em] text-cad-red uppercase">Disclaimer</div>
          <p className="mt-2 text-sm leading-relaxed text-paper/80">
            These documents are master-planning and design-development graphics. They are not construction documents and are not sealed by an Arizona registered professional engineer or land surveyor. Final grading, drainage, septic, structural, and electrical documents shall be prepared and sealed prior to permit. Lot coverage maxima, setbacks, and CUP findings must be confirmed with Coconino County Community Development at the time of application.
          </p>
        </div>
      </div>
      <Footer onNav={onNav} />
    </div>
  );
}

function Header({ onNav }: { onNav: (v: ViewId) => void }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-ink/90 px-6 py-4 backdrop-blur-md">
      <button onClick={() => onNav("home")} className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/60">
          <Compass size={16} className="text-gold" />
        </span>
        <span>
          <span className="block font-display text-sm font-bold tracking-[0.18em]">BROADSWORD</span>
          <span className="block font-mono text-[9px] tracking-[0.28em] text-mute uppercase">Civil · Land · Stewardship</span>
        </span>
      </button>
      <nav className="hidden items-center gap-5 font-mono text-[10px] tracking-[0.2em] uppercase sm:flex">
        <button onClick={() => onNav("engine")} className="text-paper/70 hover:text-gold">
          Engine Room
        </button>
        <button onClick={() => onNav("hearth")} className="text-paper/70 hover:text-gold">
          The Hearth
        </button>
        <button onClick={() => onNav("improvements")} className="text-[#ff4d6d] hover:text-gold">
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
  );
}

function Footer({ onNav }: { onNav: (v: ViewId) => void }) {
  return (
    <footer className="border-t border-white/10 px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row">
        <div>
          <div className="font-display text-lg font-bold tracking-[0.18em]">BROADSWORD</div>
          <div className="mt-1 font-mono text-[11px] text-mute">Civil engineering graphics · Coconino County, AZ</div>
          <div className="mt-3 max-w-sm text-[12px] leading-relaxed text-mute">
            Preliminary master site plans. Not for construction. Prepared as a professional design-development set for subsequent sealing by Arizona-registered engineers and surveyors.
          </div>
        </div>
        <div className="flex gap-12 font-mono text-[11px] tracking-[0.16em] text-mute uppercase">
          <div className="space-y-2">
            <button onClick={() => onNav("engine")} className="block hover:text-gold">C-101 Engine Room</button>
            <button onClick={() => onNav("hearth")} className="block hover:text-gold">C-101 The Hearth</button>
            <button onClick={() => onNav("improvements")} className="block text-[#ff4d6d] hover:text-gold">PE Review (REV-A)</button>
            <button onClick={() => onNav("compare")} className="block hover:text-gold">Comparative matrix</button>
          </div>
          <div className="space-y-2">
            <button onClick={() => onNav("standards")} className="block hover:text-gold">AR-5 notes</button>
            <div>Sheet date 2026</div>
            <div>Scale 1" = 40'-0"</div>
          </div>
        </div>
      </div>
    </footer>
  );
}


