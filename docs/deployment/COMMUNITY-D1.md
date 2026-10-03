# Community D1 — first rebuilt checkpoint

## Status and boundaries

This checkpoint implements only the **database foundation**. It is not the earlier
unavailable implementation, and earlier test reports do not apply to it.

Implemented:
- Account identity keyed by `(oidc_issuer, oidc_subject)`; no passwords or tokens.
- Owner-scoped private draft creation/read/update, atomic revision-based saves,
  blocked-account checks, 100 drafts/account and 64 KiB input limit.
- Additive migration in `migrations/community/0001_private_drafts.sql`.
- Internal schema probe and tests against the actual SQL.
- `/api/community/*` returns 503 without touching D1, even if enabled prematurely.
  `/api/community/status` is a closed-service status, NOT a live database health check.

Not implemented: Auth0 login/callback/sessions, request authentication and rate
limits, HTTP draft CRUD, Ground-0 semantic validation/server recomputation, public
previews/publication/history/withdrawal/moderation, UI, and community backup/retention
workflows. The repository functions accept a trusted server-derived owner ID; they
must never be called with an owner ID supplied by a request body or query string.

The intended workflow is still managed signup → private drafting → exact public
preview → explicit publication labeled **UNREVIEWED**. Publication is not independent
verification. No public-read SQL view or publication endpoint exists in this stage.

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
SQLite unit tests validate the SQL and simulated competing saves. Wrangler local
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

Expected new application tables: `community_users`, `community_drafts`, and
`community_schema`. Wrangler also tracks migrations in `d1_migrations`. Applying
this migration does not enable login or publish any data. Roll back service access
by keeping community disabled, not by dropping tables.

## Preserve Auth0 setup for stage 2

Keep the existing Regular Web Application and **Client Secret (Post)** setting.
The planned callback is `https://main.empty.domains/api/community/auth/callback`.
It is intentionally unavailable in this checkpoint.

Non-secret configuration needed later: `COMMUNITY_ORIGIN`, `OIDC_ISSUER`,
`OIDC_CLIENT_ID`, and `OIDC_ADMIN_SUBJECTS`. The moderator User ID previously
provided is preserved in Wrangler. Issuer/subject must both match verified claims.
Do not grant a role merely because a client sends a matching subject.

`OIDC_CLIENT_SECRET` and `COMMUNITY_RATE_SECRET` belong only in Cloudflare Secrets,
never Git or chat. Existing provider settings/secrets do not need to be recreated.
Next stage: PKCE/state/nonce, verified ID tokens, hashed server sessions, same-origin
write protection and request limits before exposing draft APIs. Then build exact
preview-bound publication and moderation, followed by separate staging validation.

## Durable checkpoints

Commit and push tested changes only to `arena/01a0fef9-harshalos`. Verify the remote
SHA after pushing; local commits alone are not a remote backup. Do not merge to main
or run deployment/remote-migration commands as part of checkpoint preservation.
