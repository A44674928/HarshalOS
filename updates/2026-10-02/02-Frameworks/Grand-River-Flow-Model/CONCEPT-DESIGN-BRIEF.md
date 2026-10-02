# Grand River Foundation & Mistveil City — concept design brief

**Status:** working inspirational brief; not an engineering specification

**Provenance:** setting and goals are `FICTION` (`NARRATIVE_SANDBOX`); sourced facts are `CANONICAL_SOURCE`; calculations and simulations are `DERIVATIVE_BUILD`.

**Purpose:** give the novel, visual design, software architecture, and early scale-model work one coherent north star without pretending that a real site, water allocation, or buildable design has been established.

> The architecture (Book I) is the library. The novel (Book II) is the work in active production. This brief supplies a design language and model boundary; it does not replace the numeric authority in [`CANONICAL-NUMBERS.md`](./CANONICAL-NUMBERS.md), authorize a project, or establish feasibility, consent, or construction.

## 1. North-star goal

Imagine a **modular river-and-energy corridor**, a **civic capital city**, and a **distributed compute/control architecture** developing together over many decades. The fictional system connects an aqueduct, reservoirs, staged hydro works, a multi-source energy portfolio, research and manufacturing districts, and Mistveil City. It should be legible both as a civilization-scale story setting and as a collection of smaller software or hardware models that can be tested independently.

Working program goals:

- **Energy:** an aspirational **1-terawatt aggregate, multi-source installed-capacity target** for the whole portfolio—not a claim that the dam or Colorado River alone supplies 1 TW. This is a provisional reading of “1-TW producer”; whether the target means nameplate capacity or average/firm output, and how generation sources are allocated, remain open.
- **Water and dam system:** a modular series, not one continuous monolithic wall. The first fictional operating dam-and-city module is targeted around **2046**. Twenty-year windows describe assumed construction and supply-chain phases, not a physical cap. No final completion date is assigned.
- **City:** Mistveil targets about **80 million residents by 2100**. Keep the legacy **40-million regional service-population** figure separate; it is not the city census and must not be added to it.
- **Aqueduct:** treat source, conveyance, storage, treatment, delivery, returns, and losses as a connected water balance. A flow number is not a water right or guaranteed supply.
- **Computing:** model each physical or narrative subsystem as a modular, addressable component so the architecture can support simulations, dashboards, training environments, and carefully scoped scale-model prototypes.

These are fictional program goals, not findings that the water, land, energy, schedule, or population can be delivered.

## 2. Height, head, and reservoir language

Avoid the phrase **“1,200–2,500+ foot dam height and reservoir height.”** It merges different measurements and could be mistaken for a proposed single wall.

Use this wording for concept exploration instead:

> **Early-phase system-scale head aspiration:** **1,200–2,500 ft of cumulative gross head** across distinct, staged hydraulic drops during the first 40–60 years from the 2026 planning baseline (roughly 2066–2086). **Long-range fictional aggregate target:** **4,000 ft**, with no final completion date assigned. Neither figure is a single-dam height, surveyed elevation, or validated usable head. Individual dam heights, reservoir pool elevations and depths, storage geometry, and net turbine head remain site- and engineer-defined.

Keep the quantities separate:

| Quantity | What it means | Current concept treatment |
|---|---|---|
| **Individual structure height** | Foundation to crest for one dam | Unassigned; site-specific geology and structural design govern it. |
| **Reservoir level / depth / storage** | Water-surface elevation, local depth, and stored volume | Separate variables. The existing **73 km³** is a fictional volume placeholder, not a depth or surveyed basin geometry. |
| **Gross hydraulic head** | Elevation difference available between defined water surfaces | A concept envelope only; count each distinct drop once. |
| **Net turbine head** | Gross head less conveyance, intake, and other hydraulic losses | Not known until a specific hydraulic layout is analyzed. |
| **Aggregate cascade head** | Sum of distinct stage drops along a defined route | May be discussed as a system aspiration; never multiply the same elevation drop by the number of dams. |

The early-phase `1,200–2,500 ft` range and the long-range `4,000-ft` target are cumulative system-head aspirations, not individual wall heights or reservoir depths. The 4,000-ft value is not a dated completion promise; the concept does not assign a final completion year. None of these figures validates a site or establishes that the corresponding head is physically or legally available.

For intuition only, idealized hydro output follows `P = ρ g Q H_net η`: it depends on actual flow, usable head, and conversion efficiency. A geometric pattern cannot create flow, head, water rights, or energy. Pumping, storage, and later turbine recovery must be accounted separately; storage is not a primary energy source.

## 3. Dam and “inside-out” spheroid lattice concept

The Mac Pro comparison is useful as **form and airflow inspiration**, not as a proven dam technology. Apple describes the Mac Pro enclosure lattice as a way to maximize airflow; it is not an active pressure-reduction device.[1]

An “inside-out” translation could be explored as a **cellular, ribbed, spheroid-inspired dry-side architecture**: rounded cavities and intersecting ribs might organize galleries, access, services, equipment bays, or a secondary structural shell. This is a visual/structural hypothesis to test—not a claim that the lattice relieves reservoir pressure.

Keep the hydraulic distinction explicit:

- A continuous, water-retaining pressure face still carries the reservoir’s hydrostatic load. A cellular core may change material use, stiffness, load paths, or dead weight, but does not make the upstream pressure vanish; every benefit and stability tradeoff needs analysis.
- Through-openings that equalize upstream and downstream pressure also let water bypass the intended storage and turbine route. Uncontrolled jets, seepage, erosion, debris, and loss of head are potential hazards, not free flow capacity.
- Engineered foundation drainage and galleries can manage **uplift pressure and seepage** under defined conditions. They are not equivalent to perforating the reservoir face or cancelling its hydrostatic pressure.[2]
- Controlled flow belongs in designed intakes, gates, pressure-rated conduits, turbines, and energy-dissipation works. A lattice-inspired screen, diffuser, or downstream form could be investigated with CFD and physical hydraulic models, but its performance must not be presumed.

**Concept rule:** keep the primary pressure boundary continuous unless a future qualified design deliberately routes water through controlled, protected hydraulic machinery. Use the spheroid motif first for dry-side structure, access, ventilation, shading, plant architecture, and story imagery.

## 4. Aqueduct and water-system vision

Show the aqueduct as a **network with distinct jobs**, not one magical channel:

1. **Source and intake:** identified water sources, environmental flow limits, quality monitoring, and explicit allocation assumptions.
2. **Conveyance:** trunk pipelines or channels, pumping where needed, surge control, inspection access, and redundancy appropriate to the fictional scenario.
3. **Treatment:** pretreatment, desalination only where relevant, brine or residuals handling, and separate treatment from transport.
4. **Storage:** operating reservoirs and balancing basins with stated pool levels, storage volumes, and drawdown rules.
5. **Generation and recovery:** turbines only where a real hydraulic drop is available; measure pump input and turbine output separately.
6. **Distribution and return:** civic, industrial, agricultural, ecological, and regional branches, with consumption, reuse, losses, and return flows declared.

Every branch should obey a water balance:

```text
inflow = delivered/consumed + outflow + evaporation + seepage/losses + change in storage
```

The existing **29.75 km³/year** transfer and **73 km³** reservoir entries remain fictional planning scenarios. Do not present them as a source allocation, operating plan, surveyed geometry, or proof of a sustainable supply. See [`CANONICAL-NUMBERS.md`](./CANONICAL-NUMBERS.md) and [`recalculate.py`](./recalculate.py) for their current arithmetic and limitations.

## 5. Mistveil capital and architectural language

Mistveil is the story’s **civic capital and research city**, not merely a plant enclosure. Keep its nine-level vocabulary—Heart, Core, Depths, Foundation, Threshold, Horizon, Overlook, Summit, Pinnacle—and the 80-million 2100 population aspiration from the numeric card. Those names do not assign real elevations or prove that the population can be housed or serviced.

Suggested visual language for concept art and prose:

- **Canyon-modern and terraced:** buildings step with imagined topography rather than reading as one uninterrupted slab. Bridges, shaded galleries, courtyards, and transit spines make the vertical city understandable at human scale.
- **Spheroid lattice as a civic motif:** use perforated or interlocking rounded geometry for shade screens, ventilation façades, covered walks, transit halls, and generator-building skins. Treat each use as architectural inspiration unless a separate structural analysis validates it.
- **Visible civic institutions:** a Capitol forum, public assembly spaces, library and research districts, water/energy interpretation halls, and plazas make the city’s governance and infrastructure legible in the story.
- **A legible infrastructure spine:** distinguish water, power, mobility, compute, and life-safety routes in plans and visualizations. Do not hide a fictional system’s resource flows inside decorative claims.
- **Respectful setting:** real-world Grand Canyon landscapes, Tribal nations, cultural sites, ecosystems, and existing communities are not blank design space. The concept cannot imply consultation, consent, or endorsement that has not occurred.

Use visual drama to communicate scale and interdependence, while labeling unbuilt features as fiction. Architectural references to regional forms should be developed with appropriate cultural context rather than copied or presented as community-approved.

## 6. One-terawatt portfolio framing

Treat 1 TW as an **aspirational portfolio target**, provisionally meaning aggregate installed nameplate capacity. Keep each source explicit—hydro, nuclear/SMR, solar, wind, geothermal, or other candidates—and mark its capacity, duty factor, firm contribution, storage, and grid interface separately. This list is a portfolio-design space, not an approved mix.

The existing illustrative river-flow and SMR calculations are only small, conditional entries in that portfolio; they do not establish a 1-TW supply plan. Do not count storage discharge as new primary generation, count one river flow twice, or add a capacity figure to an average-output figure. If the intended goal is 1 TW delivered continuously, the nameplate requirement and firming portfolio must be stated separately.

For a scenario-level buildout view, see [`PROJECT-SCALE-UP-SHEET.md`](./PROJECT-SCALE-UP-SHEET.md), with editable assumptions in [`project_scaleup_inputs.json`](./project_scaleup_inputs.json) and calculations in [`project_scaleup.py`](./project_scaleup.py). The sheet keeps 80M city residents separate from the legacy ~40M regional-service figure, distinguishes renewable generation from low-carbon SMRs and hydrogen storage, and labels its example phase ramp as an unapproved scenario rather than canonical milestones.

## 7. Software, hardware, and scale-model value

The project can be useful as a **systems-architecture exercise** even if none of the megastructure is buildable. Reuse the architecture to organize bounded models:

- **Addressing:** assign stable module and endpoint identifiers using the project’s ℤ₃₆₀ / `0–359` convention where it fits; keep identifiers distinct from surveyed coordinates.
- **Time:** use UTS for project-level simulation/event labels while retaining standard UTC/engineering timestamps at external interfaces.
- **Digital twin:** represent each dam stage, penstock, turbine, basin, city district, generator, and sensor as a typed module with units, boundaries, interfaces, and provenance.
- **Simulation:** keep hydraulic, geotechnical, structural, power-system, water-balance, and urban-service models separate and connect them through explicit interfaces. Record assumptions, uncertainty, model version, and validation status.
- **Prototype hardware:** the modular description could inform small processor/simulation nodes, FPGA or embedded demonstrations, sensor test rigs, visualization systems, and laboratory-scale hydraulic models. These are possible derivative projects, not demonstrated prototypes or certified equipment.
- **Safety boundary:** simulation and demos are read-only with respect to real infrastructure. Any future operational controls would require a separate, professionally engineered and safety-certified system, independent security review, and authorized operators.

The useful deliverable may be the **reusable model architecture**—data schemas, node maps, simulation interfaces, and dashboards—rather than any physical megaproject.

## 8. Design gates and open decisions

A disciplined progression for the fictional package and any derivative modeling is:

1. **Concept:** goals, visual vocabulary, story logic, and labeled assumptions.
2. **Requirements:** define the service, resource, environmental, safety, equity, and interface requirements before choosing dimensions.
3. **Evidence:** gather canonical sources and site-specific observations; distinguish them from derivative estimates and fiction.
4. **Model:** build independently checkable water, energy, structural, and city-service models with sensitivity ranges.
5. **Prototype:** test selected components at safe scale; compare measurements against model predictions.
6. **Real-world pathway, if ever pursued:** qualified professional investigation, Tribal and community engagement, environmental review, permits, independent safety review, and lawful authorization. No repository concept substitutes for these steps.

**Decisions to reconcile before calling this the single canon:**

- How to distribute the early-phase `1,200–2,500 ft` cumulative-head aspiration across the first 40–60 years without implying a single wall, repeated use of the same head, or a guaranteed completion date; keep the `4,000-ft` long-range aggregate target distinct.
- Whether 1 TW means installed capacity (the provisional reading here) or 1 TW average/firm delivery.
- The source-by-source generation mix, operating assumptions, storage role, and demand boundary.
- A real or fictional source, route, reservoir geometry, ecological flow, and allocation for each water case.
- Which architecture motifs are narrative-only and which should receive a computational or physical scale-model study.

## 9. Reference boundary

- [Apple Newsroom — 2019 Mac Pro thermal architecture](https://www.apple.com/newsroom/2019/06/apple-unveils-powerful-all-new-mac-pro-and-groundbreaking-pro-display-xdr/): source for the enclosure lattice as an airflow/thermal design, not a dam-pressure claim.
- [USACE EM 1110-2-2200 — Concrete Dam Engineering Manual](https://www.publications.usace.army.mil/portals/76/publications/engineermanuals/em_1110-2-2200.pdf): uplift and stability are treated as engineered loads affected by boundary conditions, foundation permeability, and drainage.
- [USACE EM 1110-2-2300 — Embankment Dam Engineering Manual](https://www.publications.usace.army.mil/portals/76/publications/engineermanuals/em_1110-2-2300.pdf): foundation, abutment, seepage, and stability considerations.
- [U.S. Bureau of Reclamation — Hydroelectric Power](https://www.usbr.gov/power/edu/pamphlet.pdf): generation depends on flow and head, with losses and conversion efficiency.

These references support limited factual context only; they do not validate the fictional concept, materials, geometry, energy target, or site.