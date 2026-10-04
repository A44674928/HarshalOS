# Community D1 — accounts, private execution and explicit publication

Dedicated staging setup and exact deploy commands: [COMMUNITY-STAGING.md](COMMUNITY-STAGING.md).

## Status and boundaries

This rebuild includes the database foundation, OIDC login/session layer,
private account workspace, private Ground-0 execution, and **explicit public publication**.
It is not yet live-provider validated on production. `COMMUNITY_ENABLED` is now `true` in
`wrangler.jsonc` — the enablement decision — while branch previews stay `false`. The flag
only takes effect on the next production deployment, and nothing below is usable until the
owner-run dashboard variables/secrets, migrations and register seed exist (`§ Ordered
enablement`).

Implemented:
- Issuer-scoped accounts and internal owner-scoped draft storage from checkpoint 1.
- Additive `0002_auth_sessions.sql`: one-use login flows, hashed sessions and
  HMAC-pseudonymized rate buckets. Migration 0001 is unchanged.
- Authorization code + PKCE S256, browser-bound state, nonce, discovery validation,
  JWKS signature verification (RS256/ES256), issuer/audience/azp/exp/iat checks.
- Secure HttpOnly host-only cookies. Flows expire in 10 minutes, sessions in 24 hours.
- Account status, local logout/revocation, blocked-account rejection and current
  issuer-bound moderator checks. No provider email/profile/access/ID tokens stored.
- Origin checks, bounded provider response bodies, timeouts, no followed redirects,
  generic error responses, and D1-backed request limits.
- `/account` UI: sign-in/out, private draft list/editor, explicit save/import/export,
  confirmed private draft/run deletion, revision conflict preservation and reload.
  Dynamic content is rendered as text.
- Authenticated private draft endpoints with session-derived ownership, exact-Origin
  writes, 96 KiB streaming body limit and 60 write attempts/account/UTC day.
  Listing is paginated (25 per page, stable ID order), not a latest-first feed.

Deletion exists only as the explicit owner-initiated draft/run deletion described
below: there is no self-service account deletion, no automatic retention job, and no
recovery of anything deleted. Not implemented: full self-service account
export/deletion, R2 evidence uploads, and automated community backup/retention
workflows. The internal draft functions require a verified server-derived owner ID,
never a request-supplied one.
Community access is enabled in the production configuration and disabled in branch
previews. Migrations 0001–0003 are unchanged; publication adds `0004_publication.sql`.
`0005_tickerbot_call_ledger.sql` is an additive aggregate counter for the Characters and
Good Intelligence Tickerbot routes; `0006_alpha_vantage_daily_call_ledger.sql` is a
separate 25-per-UTC-day request cap for Characters' explicit Alpha Vantage `1mo` mode
(across all supported assets, not daily bars). Neither stores community/user records.
Apply the market-data migrations in order before enabling the corresponding provider route. Migration and seed testing in this rebuild has been local only:
no remote migration, remote seed or production deployment command has been run from the build
environment, which has no Cloudflare credentials.

The intended workflow remains managed signup → private drafting → exact public
preview → explicit publication labeled **UNREVIEWED**, not independent verification.

### Authentication endpoints (only after explicit enablement/configuration)

| Method | Route | Behavior |
| --- | --- | --- |
| GET | `/api/community/auth/login` | Redirect to managed provider; no arbitrary return URL |
| GET | `/api/community/auth/callback` | Verify one-use flow and ID token; set session; redirect to `/account` |
| GET | `/api/community/me` | Return private account ID and moderator boolean; 401 if signed out |
| POST | `/api/community/auth/logout` | Exact Origin required; revoke this browser session/pending flow |

### Private draft endpoints

| Method | Route | Behavior |
| --- | --- | --- |
| GET | `/api/community/drafts?after=UUID` | Account-owned summaries, 25/page and nextCursor |
| POST | `/api/community/drafts` | Create a private draft; 100/account maximum |
| GET | `/api/community/drafts/UUID` | Read an owned draft; 404 for another account |
| PUT | `/api/community/drafts/UUID` | Save with matching `revision`; 409 without overwrite on conflict |
| DELETE | `/api/community/drafts/UUID` | Body **only** `{"revision": N}`; permanently delete the draft and its private runs |

Writes accept `title`, object-valued `input`, `privateNotes`, and (updates only)
`revision`. Extra envelope fields, including client-supplied owner IDs, are rejected.
Saving a generic input object does NOT validate or execute it. Execution is a
separate explicit operation; neither operation publishes anything. Deletion is
described under retention below and is refused whenever a published report anchors
the record.
All routes require active, unblocked sessions; moderator status grants no access
to someone else's drafts. Authentication/IP quotas also apply to draft requests.

The account page is linked from the desktop boot links and Overview page.
`/api/community/status` returns 503 while disabled/unconfigured or missing the
publication migration. When enabled/configured it reports the publication stage
and UNREVIEWED policy; it is not proof of a working live provider or production readiness.
Both canonical and `.html` forms of `/account` and `/audits` are Worker-first and receive no-store, no-referrer,
nosniff and restrictive CSP headers. Framing is blocked when community is enabled;
disabled previews can be embedded. The editor does not persist data in localStorage.
Sign-out and detected session expiry clear displayed private state. Unsaved edits
are not autosaved; export them before signing out or leaving the page. Conflicts
preserve the editor and require a deliberate reload, not a forced overwrite.

Private exports use `harshalos-private-draft-v1` and include private notes. Import
only fills the editor; clicking Save creates a new account-owned draft. Desktop
Ground-0 archives are not supported by this importer yet. Store downloads securely.
Exports are user copies, not automated backups. Network retries of a create request
may create a duplicate: the client does not automatically retry writes.

Logout is local to HarshalOS; it does not end the Auth0 SSO session. Existing local
sessions are not automatically revoked when an account is disabled at Auth0; block
its local account/revoke sessions when necessary. Reauthentication rotates this
browser's session; other devices retain their sessions until expiry/revocation.

Auth requests are limited to 90/minute per edge IP; login + callback together are
limited to 20/15 minutes per IP. IPs are stored only as secret-HMAC window keys.
These are not a global spend cap or DDoS defense; configure Cloudflare edge protection
and Auth0 abuse controls before public signup. Shared-IP users share quotas.
Bounded indexed cleanup on login/callback removes expired flows, sessions and rate
buckets only. No cron is provisioned; dormant expired rows may remain until cleanup.
Database operators can see short-lived PKCE verifiers; protect D1 access/backups.
Never log tokens, cookies, secrets or raw callback queries. Review platform access-log
retention since callback URLs carry short-lived authorization codes.


## Private execution checkpoint

The UI now has **Use Ground-0 1.0 template**, **Run saved revision**, **Saved runs**,
and a private result viewer/export. Template loading is local editor setup, not a
save. Set `input.name`, `version`, and a real `cutoff`, then save first. Exactly five
behavioral answers and four constraint answers are required. Values are boolean or
null (unknown), never coerced from strings. Optional method records are type-checked.
Version 1.0 is the normative baseline; 1.1 remains an unratified draft.

| Method | Route | Behavior |
| --- | --- | --- |
| GET | `/api/community/audit-template?version=1.0` | Signed-in input template; also supports explicit 1.1 |
| POST | `/api/community/drafts/UUID/runs` | Body **only** `{"revision": 1}`; execute the owned saved revision |
| GET | `/api/community/drafts/UUID/runs?after=SEQ` | Owner-only history, newest first, 25/page |
| GET | `/api/community/drafts/UUID/runs/RUN_UUID` | Owner-only immutable run and evaluated snapshot |
| DELETE | `/api/community/drafts/UUID/runs/RUN_UUID` | Body **only** `{}`; permanently delete one saved private run |

Runs require migration 0003; missing migration fails closed. Existing drafts and
login remain usable independently. The POST rejects submitted inputs/results and
reads the draft from D1. After calculation the atomic INSERT rechecks revision,
input snapshot and unblocked ownership. Unique `(draft, revision, evaluator hash)`
makes retries/concurrent runs reuse one record. Saving a correction creates a new
draft revision; existing runs never change. SQL UPDATE triggers prohibit mutation;
these records are **not** tamper-proof against trusted database administrators.

Limits: 20 new execution attempts per account/UTC day (validation failures count),
200 stored runs/account, 192 KiB/report, plus existing IP and write-attempt quotas.
A cached run does not consume the new-execution quota but still consumes a write
attempt. The UI preserves old runs as historical evidence of computation, not as
approved temporal declarations.

### Deletion and retention

Deletion is owner-initiated, explicit and permanent; there is no undo, restore or
recycle bin, and no automatic retention job removes private data. `DELETE
/api/community/drafts/UUID` requires the current `revision` and, in one transactional
batch, removes that draft together with its private runs, its previews and any public
series row that has no publication. `DELETE /api/community/drafts/UUID/runs/RUN_UUID`
removes one saved run and its previews. Both require the exact Origin, are
session-derived and account-scoped, fail closed for blocked, stale, unknown or
another account's records, and consume one write attempt (not an execution attempt).
Deleting releases the 100-draft and 200-run quotas immediately.

Public history is never deleted by these routes. A draft or run that anchors a
published report is refused with 409 — withdraw the report instead — and a
publication or public event cannot be deleted by any endpoint. Deleting an
unexpired preview candidate is allowed because the owner is discarding their own
pending candidate; the preview token stops working. A concurrent publication that
commits during a delete makes the batch fail closed rather than leaving a dangling
reference. Database operators can still read or destroy D1 directly; these routes
are application-level controls, not tamper-proof guarantees.

Deleting a draft that has unsaved editor changes in another tab is not detectable by
the server; the revision check only ensures the deleted revision is the current one.
The UI confirms both deletions and clears any displayed private state that the
deleted record was driving. Editor changes, account changes, and sign-out clear
the currently displayed run; old-revision results are explicitly labeled older.

### What the result means

The Worker imports the same `js/g0-engine.js` used by the browser. Its environment
adapter now supports browser `window` and Worker `globalThis`; classification rules
are unchanged. The evaluator normalizes saved input using the shared normalizer,
retains automation source eligibility and review-required flags, and excludes
irrelevant provider diagnostics/source bodies from the evaluated snapshot. Dedicated
private draft notes are not copied. Author-supplied review flags remain claims,
not proof that an independent review occurred. Unknown/incomplete inputs stay so.
Unsupported versions, invalid cutoffs and malformed answer shapes fail with 422
instead of silently substituting today's date or manufacturing a completed audit.

Each report carries `UNREVIEWED`, `platformCertification: NONE`, specification status,
exact normalized input, raw-input hash, engine/evaluator source hashes, deterministic
rule outputs, and explicit scope. There is **no source fetching, independent evidence
or identity verification, global registry check, cross-run Header-ID conflict check,
or temporal transition evaluation**. The engine is called with an empty prior-record
set deliberately. Its `Complete`, `Confirmed`, confidence and badge outputs describe
rule calculations on claims, not certification by this platform. A valid signature
only verifies against the user-supplied key and origin.

Report SHA-256 hashes canonical JSON (sorted object keys, array order preserved),
including input, result and scope but excluding run ID/timestamp/revision envelope.
The raw-input hash covers the saved input only, not title or separate private notes.
The shared-engine hash covers engine source bytes; the evaluator hash covers engine
bytes + a NUL byte + adapter bytes. Tests pin both fingerprints; update them when
changing either source. These are fingerprints, **not signatures or proof of truth**.
The run export contains evaluated input and can still contain private information.
Do not treat that export as a public-preview artifact or upload it without review.

Tests exercise browser/Worker parity across all 32 vectors in both versions,
signature validation, provenance gates, deterministic hashes, ownership, concurrent
replays, edit/block races, history pagination, limits and UI invalidation. Unit tests
use actual SQLite SQL; UI tests mock fetch; local Wrangler validates migrations.
No full live Auth0 + remote D1 browser flow or production security audit is claimed.


## Explicit public publication

`/audits` is the public register/detail/history/activity page; `/account` includes
public-candidate preparation, My publications/withdrawal, and the moderator queue.
Every report is immediately listed as **UNREVIEWED** after explicit publication.
No moderator approval is needed before listing, but a configured moderator must
have signed in at least once and remain unblocked before a new publication can be
inserted. This availability condition is rechecked in the atomic publication SQL.
Author labels are self-chosen; they are not verified identities or role badges.

Workflow:
1. Load/run the current saved draft revision with the current evaluator.
2. Prepare the public input candidate. The UI initially blanks declaration,
   public-key and trusted-origin fields. Separate private notes, raw source bodies
   and provider diagnostics are not copied. Input claims/quotes/URLs can still
   contain sensitive information: the author must inspect/redact them.
3. Request a preview with `runId`, `input`, and a public `author` label. The server
   recomputes the candidate, which can differ from the private run. The preview's
   exact canonical report includes normalized public input, public-input hash,
   author label, engine fingerprints, result, scope and UNREVIEWED/NONE labels.
   The private raw-input hash and private identifiers are excluded.
4. The browser displays the entire JSON report and its hash. Candidate edits clear
   the displayed preview and consent. The author must explicitly acknowledge public
   availability, copying, and the limits of withdrawal.
5. Publish sends **only** the preview token and acknowledgement
   `PUBLISH_PUBLIC_UNREVIEWED`. The server copies the stored preview, never a
   replacement report from the publish request.

Preview tokens have 256 bits of randomness, are stored hashed, owner-bound and
expire after 15 minutes. Published tokens are idempotent; competing previews of
one draft revision cannot both publish. The INSERT checks current draft revision,
current evaluator and unblocked author. Corrections require a new saved revision,
run and preview. Public series IDs do not expose private draft/run/account IDs.
Report hashes cover the report including author label, not its ID/version/time
metadata envelope. Hashes and logs are not signatures or administrator-proof history.

### Routes

| Access | Method / route | Purpose |
| --- | --- | --- |
| Signed-in author | POST `/api/community/public-preview` | Exact private preview; 30/day |
| Signed-in author | POST `/api/community/publish` | Explicit consent/token only; 10 new attempts/day |
| Public | GET `/api/community/publications` | Active register, newest first, 25/page |
| Public | GET `/api/community/publications/UUID` | Published report or minimal removed tombstone |
| Public | GET `/api/community/publications/UUID/newsml` | Active D1 report as a NewsML-G2 2.35 `newsItem` XML download |
| Public | GET `/api/community/publications/UUID/history` | Series versions, 25/page |
| Public | GET `/api/community/public-log` | Publish/withdraw/hide events, 50/page |
| Signed-in author | GET `/api/community/my-publications` | Owned versions, 25/page |
| Owner only | POST `/api/community/publications/UUID/withdraw` | Empty JSON object; redact public payload |
| Signed in | POST `/api/community/publications/UUID/report` | Private `details`, max 2000 chars; 20/day |
| Moderator only | GET `/api/community/moderation` | 100 oldest unresolved private reports |
| Moderator only | POST `/api/community/moderation/REPORT_UUID` | `action` + private `note` |

The public detail page offers a NewsML-G2 XML download. The Worker reads only an active
`published` D1 row, checks the public report hash, and emits one 2.35 `newsItem`; its
`inlineData` contains the exact public report JSON encoded as base64. The record preserves
`UNREVIEWED`, uses a stable item GUID across D1 correction versions, and does not infer
identity, verification, rights, or an embargo. Withdrawn/hidden records return 404 for this
export. XML generation is JavaScript; the optional `newsmlg2` Python dependency is for local
parsing experiments, not a deployed runtime.

Paged routes return `nextCursor`; pass it as `after`. Reports are deduplicated to
one report per reporter per publication version, including resolved reports.
Withdrawal and hide clear public report/title/author/phase; hash, ID, version,
timestamps and minimal public activity remain. External copies cannot be recalled.
Private drafts, runs, unexpired previews, abuse reports and backups are not erased
by withdrawal. There is no public restore/unhide or silent-edit endpoint.

Moderation supports `dismiss`, `hide`, and `hide-and-block`. Hide-and-block removes
**all active publications by that author**, blocks the local account and revokes
its sessions. Resolution claims and D1 transactional batches prevent concurrent
staff actions or partial failure from producing mixed outcomes. Private moderation
notes/report details are never included in public DTOs or events. No action marks
a report verified/certified. Operator intervention is required for account unblocking;
maintain a recovery administrator and do not rely on a single irreplaceable moderator.

Public reads use a secret-HMAC IP quota of 180/minute with bounded expired-rate-row
cleanup. Authenticated write attempts also share the existing 60/day quota. Preview
requests delete up to 100 expired preview rows; inactive expired rows may remain
until subsequent cleanup. No cron or global spending ceiling is configured.

### Required launch checks (not completed by local tests)

- Separate staging resources, exact HTTPS origins/callbacks, and actual Auth0 sign-in.
- Apply migrations only after verifying the Cloudflare account/database; preserve
  `_cf_KV`, existing owner storage and all other dashboard bindings.
- Verify two-account isolation, expired/replayed sessions, preview edits/expiry,
  stale drafts, publication correction, withdrawal, reporting, hide and hide/block.
- Verify both canonical page routes receive CSP/no-store headers on the deployed host.
- Configure moderator coverage, a privacy/abuse contact and escalation process, a
  retention/deletion policy that covers operator-side purge, account deletion and
  backup expiry, backups/export and restore rehearsal, resource monitoring,
  Cloudflare edge protections, and provider signup abuse controls before public launch.
- Restrict database/operator/log access. Callback queries contain short-lived codes;
  never add application logs containing tokens, cookies, reports or private notes.

Keep `COMMUNITY_ENABLED=false` until these operational checks are approved.
Emergency disable: set the flag false; do not drop tables or delete cloud resources.
Local tests use real SQLite SQL, mocked OIDC HTTP/DOM fetch, and local Wrangler D1;
remote D1 concurrency and full live-browser/provider behavior remain unvalidated.

## Register-issued case studies (Ground-0 audit register)

The 23 register-issued `PDH-R` case studies in `case-studies/` are processed into the
same public D1 tables, so the News app serves them from D1 instead of hardcoded data.
Each case study is re-evaluated by the real Ground-0 engine during the build; the file
refuses to emit anything unless the recomputed base phase and confidence reproduce
`case-studies/pdh-registry.json` and the audit text still matches the register's
`audit_record_sha256` / `issuance_record_sha256`.

```sh
npm run case-studies:build     # rebuild both artifacts (deterministic)
npm run case-studies:check     # fail if the committed artifacts differ
npm run case-studies:build -- --revision 2   # publish a changed audit record as a new version
```

| Artifact | Purpose |
| --- | --- |
| `case-studies/d1/case-studies-d1.json` | Review manifest: per record the engine result, hashes, ids and the exact public report that will be served |
| `case-studies/d1/case-studies-seed.sql` | Seed applied to D1; all statements are `SELECT … WHERE NOT EXISTS` or `ON CONFLICT DO NOTHING` |

Row mapping: one synthetic register account (issuer `urn:harshalos:register`, subject
`ground-0-audit-register`, no sessions, cannot authenticate), one draft and one run per
header, one public series per `header_id`, and one published row per content revision.
`report.result.phase` stays the engine-recomputed base phase; the register-scoped phase,
badge class, constraint record, evidence cutoff, expiry and both record hashes travel in
`report.register`, which the News app displays next to the finding. `PDH_VALID` remains
FALSE and entity attestation is ABSENT for every record. The seed writes only public
rows: no sessions, previews, reports or moderation actions are created, and rows stay
subject to the existing withdrawal/hide rules. Hiding the register account with
hide-and-block would hide the whole register; withdraw or hide individual rows instead.

Apply (owner-run, after the remote migration gate above):

```sh
# local fixture only
npx wrangler d1 execute COMMUNITY_DB --local \
  --config tests/fixtures/community-d1-local.jsonc \
  --persist-to .wrangler/community-foundation-tests \
  --file case-studies/d1/case-studies-seed.sql

# staging
npx wrangler d1 execute COMMUNITY_DB --config wrangler.staging.jsonc --remote \
  --file case-studies/d1/case-studies-seed.sql

# production: only after the migration gate and an explicit decision to publish the register
npx wrangler d1 execute COMMUNITY_DB --remote --file case-studies/d1/case-studies-seed.sql
```

To view the register in the News app locally, the exact-origin gate needs TLS, so a
self-signed certificate is required (all variables here are local overrides; nothing
remote is contacted):

```sh
mkdir -p .wrangler/local-cert && openssl req -x509 -newkey rsa:2048 -nodes -days 3 \
  -subj "/CN=localhost" -keyout .wrangler/local-cert/key.pem -out .wrangler/local-cert/cert.pem
npx wrangler d1 migrations apply COMMUNITY_DB --local
npx wrangler d1 execute COMMUNITY_DB --local --file case-studies/d1/case-studies-seed.sql
npx wrangler dev --local-protocol https --https-cert-path .wrangler/local-cert/cert.pem \
  --https-key-path .wrangler/local-cert/key.pem \
  --var COMMUNITY_ENABLED:true --var COMMUNITY_ORIGIN:https://localhost:8787 \
  --var OIDC_ISSUER:https://issuer.example/ --var OIDC_CLIENT_ID:local \
  --var OIDC_CLIENT_SECRET:local --var COMMUNITY_RATE_SECRET:<32+ character local secret>
```

Open `https://localhost:8787`, accept the self-signed certificate, and launch the News
app. A browser preview on any other origin is refused by design, because public reads
must come from the exact configured origin.

The file is idempotent: re-running unchanged content inserts nothing, and
`community_schema` records one marker row (`case-studies-d1` → applied revision). If the
content changed but the version did not, a guard statement aborts the whole file before
any insert instead of silently replacing a published version — corrections are new
versions (`--revision N+1`). `tests/case-studies-d1-test.mjs` applies the committed seed
to real SQLite, then exercises the public feed, detail, correction and NewsML routes.

## Verified target information

The owner supplied:
- Database name: `community_db`
- Database ID: `ea508a07-e00c-4d41-a657-428937ba8110`
- Worker binding: `COMMUNITY_DB`

The owner's screenshot of the read-only table listing showed only `_cf_KV`.
This is not a live verification by the agent. **Leave that internal table alone.**
The production binding is now recorded in `wrangler.jsonc`, but no remote migration
has been applied by this checkpoint. Keep `COMMUNITY_ENABLED=false`.

Do not create another database, reset a database, delete resources or migrate the
existing owner snapshot store. The existing MongoDB storage/Access guard is unchanged.
R2 evidence handling and R2/Mongo backup integration are not part of this checkpoint.
Before any deployment, reconcile ALL dashboard bindings/variables with Wrangler,
including any existing `STORAGE_BUCKET` binding. A configuration file does not
prove the currently deployed bindings. Never use production D1 for branch previews;
configure a separate preview database before implementing/enabling preview access.

## Local verification

Use Node 22.13+ with `node:sqlite` (experimental warning expected).

```sh
npm ci
npm run test:community
npx wrangler d1 migrations apply COMMUNITY_DB --local \
  --config tests/fixtures/community-d1-local.jsonc \
  --persist-to .wrangler/community-foundation-tests
npx wrangler d1 execute COMMUNITY_DB --local \
  --config tests/fixtures/community-d1-local.jsonc \
  --persist-to .wrangler/community-foundation-tests \
  --command "SELECT component, version FROM community_schema;"
npm run integrity
```

The fixture is LOCAL ONLY: its all-zero database ID is not the production ID.
Never use `--remote` or deploy that fixture. Local state is ignored under `.wrangler/`.
SQLite unit tests validate actual SQL and simulated competing saves; authentication
tests sign real JWTs and mock provider HTTP responses/JWKS. Wrangler local
migration checks validate local D1 compatibility, not remote D1 concurrency or
live identity-provider behavior. Integrity includes a deployment **dry-run only**.

## Remote migration gate — separate approval required

Before applying anything, confirm the Cloudflare account and database ID match
this document and repeat a read-only inspection:

```sql
SELECT name, sql FROM sqlite_schema WHERE type = 'table' ORDER BY name;
```

If there are application tables or migration records, inspect/reconcile them first;
export a backup before changing any populated database. This additive migration
intentionally fails on existing conflicting table names rather than masking an
unknown schema with `IF NOT EXISTS`. Never edit a migration after applying it;
use a new migration for subsequent changes.

Only after explicit approval and target verification, use the real configuration:

```sh
npx wrangler d1 migrations list COMMUNITY_DB --remote
npx wrangler d1 migrations apply COMMUNITY_DB --remote
```

Expected application tables: `community_users`, `community_drafts`, `community_schema`,
`community_auth_flows`, `community_sessions`, `community_auth_rates`, `community_runs`,
`community_public_series`, `community_previews`, `community_publications`,
`community_public_events`, `community_reports`, `community_moderation_actions`, `tickerbot_call_ledger`, and `alpha_vantage_daily_call_ledger`. Wrangler also tracks migrations in `d1_migrations`. Applying
this migration does not enable login or publish any data. Roll back service access
by keeping community disabled, not by dropping tables.

## Ordered enablement on main.empty.domains (owner-run)

`/account` and `/audits` are already deployed by every `main` build, but they are
inert until the ordered steps below are complete: before the dashboard configuration
and migrations exist, every `/api/community/*` route fails closed with 503 and the
register renders its unavailable notice. Enabling the D1-backed pages on production is
a deliberate, ordered decision. Do these steps in order; stop at any failure rather
than retrying with shortcuts.

0. **Status of this sequence.** Step 5 (the flag) is committed in the repository, so
   the sequence now describes what remains before the deployed Worker can serve the
   feature. Steps 1–4 and 6–7 are owner-run: the build environment has no Cloudflare
   credentials and cannot reach the Cloudflare API, so it has applied no remote
   migration, no remote seed and no deployment. Until steps 1–4 are complete the
   enabled Worker fails closed with 503s on every `/api/community/*` route, exactly as
   the regression test in `tests/production-config-test.mjs` asserts.
1. **Dashboard variables on the `harshalos` Worker** (Settings → Variables and
   Secrets, runtime scope). Text: `COMMUNITY_ORIGIN=https://main.empty.domains`,
   `OIDC_ISSUER`, `OIDC_CLIENT_ID`. Secrets: `OIDC_CLIENT_SECRET`,
   `COMMUNITY_RATE_SECRET`. `OIDC_ADMIN_SUBJECTS` is already declared in
   `wrangler.jsonc`; moderators are matched by issuer and subject together.
   `COMMUNITY_ORIGIN` is intentionally absent from `wrangler.jsonc` (owner-managed),
   and `tests/production-config-test.mjs` asserts the file's variable set stays at
   three keys. Do not add issuer/origin values to Git.
2. **Auth0 production application.** Regular Web Application, Client Secret (Post),
   only the `openid` scope, with Application Login URI
   `https://main.empty.domains/api/community/auth/login` and exact callback
   `https://main.empty.domains/api/community/auth/callback`. No wildcards.
3. **Read-only inspection and backup.** Run the inspection in the gate above and
   confirm the only existing table is `_cf_KV`. If any application table or
   migration record exists, stop and reconcile schema and history first, and export
   a backup before changing a populated database:

   ```sh
   npx wrangler d1 export COMMUNITY_DB --remote --output community_db-backup.sql
   ```

4. **Apply migrations 0001–0006 and the register seed** to production D1. Migrations
   never run automatically during a deploy:

   ```sh
   npx wrangler d1 migrations list COMMUNITY_DB --remote
   npx wrangler d1 migrations apply COMMUNITY_DB --remote
   npx wrangler d1 execute COMMUNITY_DB --remote --file case-studies/d1/case-studies-seed.sql
   npx wrangler d1 execute COMMUNITY_DB --remote \
     --command "SELECT (SELECT COUNT(*) FROM community_publications) AS publications, (SELECT COUNT(*) FROM community_public_series) AS series;"
   ```

   Expected from the committed seed: 23 publications, 23 series, one register account.
5. **Flip the flag in the repository — done.** Explicit values in `wrangler.jsonc` win
   over dashboard text variables, so a dashboard `COMMUNITY_ENABLED=true` alone would
   not have enabled anything. `wrangler.jsonc` now says `true`, and
   `tests/production-config-test.mjs` proves the enabled Worker fails closed on every
   route before any D1 query while step 1 is missing, that branch previews still
   override to `false`, and that the file's variable set is unchanged. Step 5 landed as
   its own commit, separate from unrelated work.
6. **Deploy and verify on the live host.** `/api/community/status` returns 200 with
   stage `publication`; `/api/community/me` returns 401 signed out; sign in succeeds
   and `/account` exposes the private workspace. A configured moderator must sign in
   before publication is available at all. Then walk the two-account isolation,
   preview/expiry, publication, withdrawal, report and moderation cases listed in the
   launch checks above, using synthetic content only.
7. **Rollback is the flag, not the schema.** To withdraw the feature, set
   `COMMUNITY_ENABLED=false` and redeploy. Do not drop tables, delete the database or
   remove secrets; published data and history must survive an emergency disable so
   the feature can be re-enabled without data loss.

Until every step above is complete, keep production disabled. Local tests passing is
not evidence that live Auth0, D1 concurrency or the deployed headers behave as
tested locally.

## Preserve Auth0 setup for live staging

Keep the existing Regular Web Application and **Client Secret (Post)** setting.
The planned callback is `https://main.empty.domains/api/community/auth/callback`.
It remains unavailable while the feature is disabled.

Non-secret configuration needed later: `COMMUNITY_ORIGIN`, `OIDC_ISSUER`,
`OIDC_CLIENT_ID`, and `OIDC_ADMIN_SUBJECTS`. The moderator User ID previously
provided is preserved in Wrangler. Issuer/subject must both match verified claims.
Do not grant a role merely because a client sends a matching subject.

`OIDC_CLIENT_SECRET` and `COMMUNITY_RATE_SECRET` belong only in Cloudflare Secrets,
never Git or chat. Existing provider settings/secrets do not need to be recreated.
Provider compatibility: HTTPS issuer and same-origin discovery endpoints; discovery
must advertise code flow, S256 and client_secret_post. ID token signing must be
RS256 or ES256 (not HS256). Only `openid` scope is requested. Set exact callback
allowlists, not wildcards. Existing Access protection for owner `/api/storage/*`
must remain; community callbacks need to be reachable through their own policy.

Next: verify the complete workflow on a separate staging origin/database/provider
application. Do not enable production merely because unit tests pass.

## Durable checkpoints

Commit and push tested changes only to `arena/01a0fef9-harshalos`. Verify the remote
SHA after pushing; local commits alone are not a remote backup. Do not merge to main
or run deployment/remote-migration commands as part of checkpoint preservation.

## Production release and the enablement decision (PR #42, then the flag commit)

The production configuration preserves dashboard-only text variables with
`keep_vars: true` and declares the owner-confirmed `STORAGE_BUCKET` binding to
`main-empty-domains`, alongside the production D1 binding. Explicit `vars` still win:
the commit that flipped `COMMUNITY_ENABLED` to `true` is the enablement decision and is
the only change that turns the feature on. Branch-preview overrides still force
`false`, and no dashboard variable can re-enable previews. Secrets
remain dashboard-managed. Inventory any additional bindings before deployment;
`keep_vars` preserves text/JSON variables, not arbitrary resource bindings.

This binding change does **not** migrate owner storage to R2. The existing storage
API still uses MongoDB and owner-only Access authentication. Keep MongoDB and its
credentials and data intact. Production branch-preview overrides explicitly omit
D1 and R2 and disable community; review dashboard preview policies/secrets as well.

Before merging, require the fresh integrity suite (including `test:production`)
and inspect the intended-target Cloudflare build checks. A main merge may trigger
production deployment; neither `npm run deploy` nor the Wrangler build command
applies database migrations. Production D1 migrations are not required to serve
the disabled feature: regression probes reject community routes before D1 access.

After deployment, verify the active Worker is `harshalos`, community remains
false, D1 is `community_db`, R2 is `main-empty-domains`, and dashboard-only OIDC and
Access variables/secrets remain configured. Verify existing owner storage without
writing or deleting data. `/api/community/me` must remain unavailable (503).

The enablement decision has been taken in the repository (see the ordered enablement
section); the remaining work is the owner-run dashboard configuration, the backup,
migration and seed on production D1, and the live verification. Complete the launch
checks above before publishing, especially callback-log privacy, two-account isolation
and publication/withdrawal/moderation.
The current production observability settings are **not** a sign-off for logging
authentication callback queries. One existing account is not an admission allowlist.
If deployment has an issue, keep community disabled and inspect the active version;
do not drop tables, delete resources, or blindly restore stale bindings.
