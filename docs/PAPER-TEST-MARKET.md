# Account-scoped PAPER_TEST market ledger

The HarshalOS market surface is an **account-scoped paper simulation**. Its
canonical shared state lives in the Community D1 database and is served only by
the HarshalOS Worker. The website and paired iPhone, iPad, and macOS app render
the same account-owned declarations, positions, append-only events,
server-issued quote references, valuation state, and Market Orb projection.

It is not a brokerage, exchange, order-management system, payment system,
custody service, wallet, investment recommendation, identity verifier, or
production authority surface.

## Authority and data flow

```text
reviewed provider adapters / scheduled Orb 2 field
                    │
                    ▼
        Worker-owned stored field observations
                    │
             private PAPER_TEST API
          ┌─────────┴─────────┐
          ▼                   ▼
 signed-in HarshalOS      explicitly paired
 browser account          native device Keychain
          │                   │
          └─────── same owner-scoped ledger ───────┘
```

- Provider selection, secrets, polling, freshness, quote availability, paper
  valuation, and normalized Orb/Orb 2 node placement remain server-side.
- Native and browser code receive bounded snapshots and quote references only.
  They do not contain a provider key, raw provider endpoint, Worker secret,
  browser session cookie, or OpenID client secret.
- A client cannot submit a price, provenance, timestamp, valuation, or a
  private universe-core identifier. Opening/closing a position requires a
  fresh server-created immutable quote snapshot.
- The Worker preserves `PAPER_TEST` in every DTO and UI boundary. A held or
  unavailable field produces an explicit held/unavailable result; it never
  silently substitutes a fixture, neutral price, or mark.
- Server responses use `harshal-paper-market-mobile-snapshot-v1` for the
  mobile-safe aggregate snapshot, and `harshal-paper-market-orb-v1` for the
  normalized display placement. The client may cache a last successful
  rendering in memory but must label offline/unavailable state and must not
  create a local substitute valuation.

## Native device pairing

A native app does **not** reuse browser cookies or weaken the browser's
same-origin rules.

1. The native app creates a 15-minute pairing request and receives a manual
   16-character pairing code plus a separate polling capability. Both are held
   in the device Keychain only.
2. The person opens the existing HarshalOS Account page, signs in through the
   normal Community flow, enters the code, reviews the device label, and
   explicitly acknowledges `APPROVE_PAPER_TEST_DEVICE`.
3. The native app polls the separate status capability. Browser approval alone
   does not place a bearer on the device.
4. The native app explicitly redeems the approved pairing once. The Worker
   returns a revocable, scoped `PAPER_TEST` device credential that expires in
   30 days. The app writes it to Keychain before using it and never persists it
   in `LocalStateStore`, CloudKit, a log, a URL, or a public note.
5. The signed-in browser Account page lists and can revoke paired devices.
   Revocation is checked on every native request and immediately fails closed.

The short-lived pairing code and poll token are stored in D1 only as SHA-256
hashes. The credential bearer is likewise stored as a hash. Browser writes
retain the existing exact-origin/session protections; device bearer requests
have no CORS response path and are restricted to the configured Worker origin.

## Private API contract

Routes are under `/api/community/paper-market/v1`. Browser calls use the
existing Community session; paired native calls send `Authorization: Bearer`
with the Keychain-only scoped credential. Write requests require a bounded
`Idempotency-Key`.

| Route | Method | Purpose |
| --- | --- | --- |
| `/device-pairings` | `POST` | Native-only creation of a short-lived pairing request |
| `/device-pairings/approve` | `POST` | Signed-in, exact-origin browser approval of a manual code |
| `/device-pairings/:id` | `GET` | Native polling through the separate pairing capability |
| `/device-pairings/:id/redeem` | `POST` | One-time native redemption after browser approval |
| `/devices` | `GET` | Browser listing of the account's device metadata, never bearer values |
| `/devices/:id/revoke` | `POST` | Browser-only credential revocation |
| `/snapshot` | `GET` | Versioned account ledger + market availability + Market Orb snapshot |
| `/catalog` | `GET` | Reviewed current field nodes and explicit availability/provenance labels |
| `/quotes` | `POST` | Server-issued immutable quote reference for one paper-eligible instrument |
| `/declarations` | `POST` | Append-only owner-scoped paper declaration |
| `/positions` | `POST` | Open a paper position using a declaration and server quote reference |
| `/positions/:id/close` | `POST` | Close using a fresh matching server quote reference |
| `/positions/:id/withdraw` | `POST` | Explicitly withdraw an open paper position |
| `/ledger` | `GET` | Private ledger projection and append-only event history |
| `/orb` | `GET` | Server-normalized Market Orb and private valuation overlay |

The D1 migration is `migrations/community/0017_paper_market.sql`. It is
additive after the deployed `0014` and `0015` history and after
`0016_public_observations.sql`; do not renumber, rewrite, or replay a migration
that a production database has already recorded.

## Quotes, events, and valuation

The quote table stores the server-selected instrument identity, price text,
provider label, source label, interval, explicit freshness, observed/retrieved
time, and expiry. The app never sends those fields. Quote creation, declarations,
and each position transition require a bounded `Idempotency-Key`; a retry with
the same owner/key returns the original immutable receipt rather than adding a
second paper record. Declarations are immutable. Position rows can
only transition once from `OPEN` to `CLOSED` (with a matching immutable exit
quote) or `WITHDRAWN`. D1 triggers append a private event for each declaration
and position state transition, and reject update/delete attempts on retained
quote, declaration, position-history, and event records.

The Market Orb is a display directive. It uses the scheduled field's reviewed
observations, explicit availability, logarithmic radial bands, server-normalized
node sectors/depths, a bounded berth pass, and a private paper-valuation overlay.
It is not a forecast, trade signal, peer rank, permission, or recommendation.

## Crypto Orb boundary

A crypto observation may appear as a **passive, display-only** Orb node when it
comes from the reviewed server field and is available under the source's lawful
terms. It is not a paper-eligible instrument in this implementation. No native
or browser code mines cryptocurrency, does hidden/background mining work,
creates a wallet, holds custody material, issues a token, submits a trade, or
proxies a provider API in a way that bypasses its terms of service.

## Legacy local fixtures

The original `HarshalMarkets` fixture ledger stays in the native app as a
clearly labeled device-only historical/transition surface. It is not uploaded,
merged, or treated as the shared authority. There is intentionally no automatic
migration because a local fixture price cannot be honestly converted into a
server-observed quote reference. A user can review it locally and create a new,
explicit server PAPER_TEST record after pairing.
