# Character Materials & multi-Disc spheroids

**Status:** local, deterministic prototype; Materials Project lookups use the existing read-only Worker route. This model has not been validated as an engineering, manufacturing, or safety method.

## Purpose

The desktop **Material Spheroids** app makes an explicit, reviewable mapping between:

1. a character profile and one HarshalOS Characters Disc;
2. the character's locally annotated PDH context;
3. operator-entered, measurable material requirements; and
4. Materials Project summary records explicitly saved to this browser's local material library.

A profile can receive a local material assignment only when the operator-entered PDH gate is clear and every physical criterion has a reported value inside the operator's bounds. The match is deterministic and explainable; no model, LLM, personality inference, hidden default, or chemical analogy chooses the material.

The free-text **role** and **real-world context** fields are notes only. They preserve the operator's description and provenance, but are not semantically interpreted. To affect the match, a real-world requirement must be entered explicitly as a numeric range or calculated metallic classification.

## PDH use and boundary

The model uses the canonical declared phases `NAB`, `CWO`, and `GSRB`. The optional detected-phase annotation accepts `NAB`, `CWO`, `NAB-Constrained`, `GSRB`, `AMBIGUOUS`, and `INCOHERENT`; the last three diagnostic types are not declared phases.

The PDH input is an **assignment review gate**, not a property weight:

- `MISSING`, `INVALID`, absent declared phase, an ambiguous/incoherent diagnostic, or a supplied detected phase that differs from the declaration blocks local assignment;
- `VALID` plus a declared phase, with no supplied disagreement, clears this *local* review gate;
- the application does not check a Declaration-Hash, signature, Creator-ID, timestamp, evidence, Ground-0 finding, or freshness. `VALID` is operator-reported and can be wrong.

PDH never changes a material's density, modulus, band gap, stability, structure, or physical score. The canonical phase meanings are preserved as governance context—NAB refusal-bound, CWO witness-only, GSRB sovereign-acting—not converted into solid/liquid/gas labels or chemistry. A displayed assignment is a browser-local modeling annotation; it grants no authority and is not a signed PDH or Ground-0 result.

## Physical matching rule

Material data is a fixed field projection from the Materials Project Summary API, via `/api/materials-project/v1/search`. The API key remains a Worker secret. A user must search and save a result; opening Material Spheroids makes no provider request. Records carry the MP ID, reported values, update/retrieval dates, provenance, and license-scope label into local browser storage.

The character author supplies zero or more inclusive bounds:

| Requirement | Materials Project field | Unit |
|---|---|---|
| Density minimum / maximum | `density` | g/cm³ |
| Bulk modulus minimum / maximum | `bulkModulusGpa` | GPa |
| Shear modulus minimum / maximum | `shearModulusGpa` | GPa |
| Band gap minimum / maximum | `bandGap` | eV |
| Energy above hull maximum | `energyAboveHull` | eV/atom |
| Calculated metal / not-metal class | `isMetal` | Boolean classification |

For every supplied bound, the engine records `pass`, `fail`, or `unknown` (the property is absent or unusable). Candidate states are:

- **Match:** at least one criterion exists and every criterion is reported and passes;
- **Incomplete:** no known criterion fails, but one or more required values are missing;
- **Outside bounds:** at least one known value fails a criterion;
- **No ranking:** the character has not supplied any measurable material criterion.

Results sort by state, number of passing criteria, number of known criteria, then MP ID as a deterministic tie-break. There is no hidden stability or phase preference; if energy above hull matters, enter it as an explicit bound. Unknown data is not fabricated, imputed, or counted as a pass. Assignment requires `Match` plus the PDH review gate. A match is not a claim that the material is optimal, experimentally confirmed, manufacturable, compatible with another constituent, or safe for the character's real-world use.

## Building a multi-Disc spheroid

A spheroid preview accepts **two to four distinct Discs**, at most one selected assigned character per Disc. Each character must point to a material record that remains in the local library. The operator enters positive relative share weights `wᵢ`; the view normalizes them as:

```text
φᵢ = wᵢ / Σⱼ wⱼ
Σᵢ φᵢ = 1
```

The SVG renders a spheroid-shaped stack of colored latitude bands—one band per selected Disc. Band color identifies the Disc only; it is not a Materials Project color, predicted appearance, geometry, or microstructure.

When every constituent record reports density, the UI also shows the reference arithmetic:

```text
ρ_reference = Σᵢ φᵢ × ρᵢ
```

This is an **ideal volume-weighted reference**, not a general composite model. It assumes the entered weights describe final constituent volumes and excludes porosity, interfaces, reactions, phase changes, expansion/shrinkage, processing, orientation, geometry, and interactions. It does not predict the composite's elastic moduli, strength, optical response, or chemical formula. If any constituent density is missing, no combined density is shown. The spheroid itself is a schematic composition, not a manufactured object.

## Storage, privacy, and operation

The workspace stores the material library, character profiles, and saved spheroid designs in this browser's `localStorage` under:

- `harshalos.character-materials.library.v1`
- `harshalos.character-materials.characters.v1`
- `harshalos.character-materials.spheroids.v1`

Clearing browser site data removes these records. No cloud sync or server-side profile persistence is implemented. Material search is an explicit same-origin GET to the existing Materials Project Worker route; it sends no credential from the browser. Without the `MATERIALS_PROJECT_API_KEY` Worker secret, search fails closed; see [Materials Project lookup and secret setup](MATERIALS-PROJECT.md).

The existing Materials Project license and scientific cautions still apply. In particular, the Worker requests `BY-C`; GNoME-origin records may carry a separate CC BY-NC license. Review the source record, Materials Project's current citation guidance, and applicable license before reuse or redistribution. Computed records may be incomplete or method-dependent and are not experimental or engineering guarantees.

## Tests

```bash
npm run test:materials-project
npm run test:character-materials
```

The model suite covers PDH gating, range matching, unknown values, local persistence, share normalization, and ideal-density caveats. The UI tests use a stubbed same-origin Materials Project response; they do not make live provider requests. Neither suite establishes material compatibility or validates the calculation as a design method.

## Relevant sources

- [Materials Project integration and data limits](MATERIALS-PROJECT.md)
- [`specs/normative/canonical-model.md`](../../specs/normative/canonical-model.md), including the separation between declared and detected phases
- [`specs/normative/ground-0-v1.0.md`](../../specs/normative/ground-0-v1.0.md), PDH and phase-classification baseline
