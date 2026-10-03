# Community D1 — first rebuilt checkpoint

## Status and boundaries

This rebuild now includes the database foundation **and OIDC login/session layer**.
It is not deployed or live-provider validated. `COMMUNITY_ENABLED` remains `false`.

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

Not implemented: draft HTTP CRUD, Ground-0 semantic validation/server recomputation,
public previews/publication/history/withdrawal/moderation UI, self-service account
export/deletion, and community backup/retention workflows. The internal draft
functions require a verified server-derived owner ID, never a request-supplied one.
No draft/publication HTTP route is exposed in this checkpoint.

The intended workflow remains managed signup → private drafting → exact public
preview → explicit publication labeled **UNREVIEWED**, not independent verification.

### Authentication endpoints (only after explicit enablement/configuration)

| Method | Route | Behavior |
| --- | --- | --- |
| GET | `/api/community/auth/login` | Redirect to managed provider; no arbitrary return URL |
| GET | `/api/community/auth/callback` | Verify one-use flow and ID token; set session; redirect to `/` |
| GET | `/api/community/me` | Return private account ID and moderator boolean; 401 if signed out |
| POST | `/api/community/auth/logout` | Exact Origin required; revoke this browser session/pending flow |

`/api/community/status` still returns 503, `ready: false`: full community editing
and publication are not ready. It is not a live database health check. The desktop
has no sign-in/account UI yet; these are backend endpoints for the next checkpoint.

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
`community_auth_flows`, `community_sessions`, and `community_auth_rates`. Wrangler also tracks migrations in `d1_migrations`. Applying
this migration does not enable login or publish any data. Roll back service access
by keeping community disabled, not by dropping tables.

## Preserve Auth0 setup for stage 2

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

Next: verify login on a separate staging origin/database/provider application,
then expose authenticated draft APIs and add the account UI. Follow with exact
preview-bound publication, version history, withdrawal, abuse reporting and moderation.
Do not enable production merely because unit tests pass.

## Durable checkpoints

Commit and push tested changes only to `arena/01a0fef9-harshalos`. Verify the remote
SHA after pushing; local commits alone are not a remote backup. Do not merge to main
or run deployment/remote-migration commands as part of checkpoint preservation.
