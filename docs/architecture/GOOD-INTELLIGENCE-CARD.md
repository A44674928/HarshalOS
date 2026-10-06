# Good Intelligence Card

## Purpose

The **Card** is the semantic container for one reviewed market entity in Good Intelligence.

The Card is not the Orb, not the Race, not the NAB profile, and not the Character. It is the attributable object that connects those layers without allowing one layer to masquerade as another.

```text
CARD
├── Identity
├── Roster Provenance
├── Market Stage
├── Character Driver
├── Observation
├── Financial State
├── Maturity State
├── Composition
├── NAB State
├── Visualization State
└── Accountability
```

## Identity

The Card's internal identity is derived from the reviewed ticker, not from roster position:

`GI-CARD-TMO`

`GI-CARD-SPCX`

Array order, market-cap rank, race rank, and visual position are therefore not identity.

A ticker change is an identity migration and must not silently create a new Card with inherited history. The current implementation intentionally uses the reviewed ticker as the identity key until a stronger issuer identifier is available.

## Character driver

Each Card may carry a **Character driver**. The Character is the named visual/behavioral driver associated with the ticker. It does not become the issuer and it does not acquire market authority, legal agency, or financial decision rights.

```text
Card
 ├── identity.symbol = TMO
 └── driver
      └── kind = character
          ├── characterId
          ├── name
          ├── role
          └── assignment
```

The current Character assignment remains sourced from `CharactersCast` and is therefore a presentation relationship. The Card contract records that relationship explicitly without rewriting the existing cast assignment algorithm.

## Provenance

Roster metadata is preserved as dated provenance. For the current stock field this includes the October 2, 2026 market-cap snapshot, source, sector, and sector rank.

Market-cap metadata determines roster inclusion/order only. It is not a live price, risk score, forecast, authority, or permission.

## Observation boundary

Observed information and derived information are separate.

An Observation identifies, where available:

- observation ID
- timestamp
- provider
- interval
- confirmation state
- held state
- source

Missing information is represented as a state (`NO-DATA`, `UNAVAILABLE`, `HELD`, etc.), never as a fabricated zero or synthetic live observation.

## Derived layers

The Card may reference financial state, maturity/race state, composition, NAB state, and visualization state. The Card contract does not calculate those values. Existing Orb 2, market-context, NAB, OCM, and Character systems remain responsible for their own mathematics and rules.

The intended flow is:

```text
Roster + Character assignment
          ↓
        CARD
          ↓
     Observation
          ↓
   Financial State
          ↓
 Daily + Intraday Composition
          ↓
    Market/Race State
          ↓
       NAB State
          ↓
       OCM State
          ↓
 Character Motion / Orb
```

## Accountability invariants

1. A Card cannot exist without a reviewed ticker.
2. Card identity does not depend on roster array position.
3. A Character is a driver relationship, not the market identity.
4. Missing observations remain missing.
5. Derived values do not overwrite observations.
6. Provider identity remains attached to observations.
7. Market stage remains explicit (`established` or `formation`).
8. The Card is display-only: it grants no authorization and has no agency.
9. The Orb is a representation of Card state, not the source of truth.
10. Financial visualization is not a trading instruction or permission surface.

## Migration strategy

This is the first Card migration pass. It introduces the canonical semantic contract without rewriting Orb 2.

Next passes should adapt existing systems to consume Card objects:

1. roster → Card identity/provenance
2. server observation → Card observation/financial state
3. race/NAB/OCM → Card derived state
4. Orb 2 → Card visualization
5. history/tests → Card identity and provenance

No Orb 2 market mathematics should be duplicated inside the Card layer.
