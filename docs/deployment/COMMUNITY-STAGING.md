# Dedicated community staging Worker

Use the **same repository and session branch**, but a separate Worker/configuration.
This does not replace production's `wrangler.jsonc` or migrate its database.

| Setting | Staging target |
| --- | --- |
| Worker | `harshalos-staging` |
| Configuration | `wrangler.staging.jsonc` |
| Custom domain | `staging.empty.domains` |
| Origin | `https://staging.empty.domains` |
| D1 binding | `COMMUNITY_DB` |
| Database | `community_db_staging` |
| Database ID (provided by owner) | `74f281fe-3ab9-49b1-bff6-4686cb768ca7` |
| Repository | `A44674928/HarshalOS` |
| Branch | `arena/01a0fef9-harshalos` |

The database ID is configured, not remotely inspected by this checkpoint. No
remote migration, Worker deployment or DNS change was executed by the agent.

## Cloudflare Workers Builds settings

Configure the Git integration on **harshalos-staging**, not on `harshalos`:

- Root directory: repository root (`/`).
- Build command: leave blank; Wrangler runs the configured asset-staging build.
  If the dashboard requires a build command, `npm run prepare:assets` is safe.
- Deploy command: **`npm run deploy:staging`**.
- Branch: `arena/01a0fef9-harshalos`.
- Node: 22.13+; use the locked npm dependencies.
- Keep non-production branch/preview deployments off until separately configured.

**Do not use the default `npx wrangler deploy` or `npm run deploy` for this Worker.**
Those select the production configuration. If already connected, pause automatic
builds until the staging-specific deploy command is saved. A build started before
this commit exists may fail because the staging script is not yet available;
retry from the pushed checkpoint only after verifying these settings.

The explicit `--config wrangler.staging.jsonc` selects both the staging Worker name
and staging D1 ID. Deployment never applies migrations automatically. The config
also declares the staging custom domain; an actual deployment may provision/update
that domain's Worker association. Inspect any existing conflicting DNS record or
Worker association before deployment; do not delete an unfamiliar record.

`workers_dev` and preview URLs are disabled: the chosen test origin is the custom
domain. DNS and TLS must be ready before testing sign-in.

## Runtime variables and secrets

In **harshalos-staging → Settings → Variables and Secrets**, set runtime values,
not merely build-time environment variables. If Cloudflare asks for an environment,
choose this Worker's normal **Production** scope: it is the primary deployment of
the *staging Worker*, not the production `harshalos` Worker.

The source configuration already defines:

- `COMMUNITY_ORIGIN=https://staging.empty.domains`
- `COMMUNITY_ENABLED=false`

Add these as runtime **Text** variables for the staging Auth0 application:

- `OIDC_ISSUER`: full exact HTTPS issuer, usually ending in `/`.
- `OIDC_CLIENT_ID`: staging application's Client ID.
- `OIDC_ADMIN_SUBJECTS`: moderator User ID in the issuer used for staging.

Add these as runtime **Secrets** (never Git/chat):

- `OIDC_CLIENT_SECRET`: staging application's client secret.
- `COMMUNITY_RATE_SECRET`: independently generated staging random value.

The config uses `keep_vars: true` to retain dashboard-only staging variables.
Explicit values in the file still win: a deployment resets `COMMUNITY_ENABLED` to
`false` until we intentionally update that configuration after setup review.
Secrets remain dashboard-managed; they are not copied from production. Do not copy
production MongoDB/owner Access credentials, production storage bindings, or live
evidence into this Worker. Worker observability is disabled here to minimize
accidental authentication-query logging; review platform-level logs separately.

Create/use a separate Auth0 **Regular Web Application**, Client Secret (Post),
with the appropriate login connection enabled. Configure:

- Application Login URI: `https://staging.empty.domains/api/community/auth/login`
- Allowed Callback URLs: `https://staging.empty.domains/api/community/auth/callback`

## Verification and migration gates

Safe local checks (no remote deployment/data changes):

```sh
npm ci --include=optional
npm run test:staging
npm run check:deploy:staging
npm run integrity
```

Once authorized to inspect the **staging** target, verify the Cloudflare account,
database name/ID, existing tables and migration history:

```sh
npm run db:staging:inspect
npm run db:staging:migrations:list
```

These commands contact remote staging but are read-only. If application tables
already exist, stop and reconcile their schema/history; back up existing populated
data before approving changes. Leave Cloudflare's `_cf_KV` alone.

Only after target inspection and explicit migration/deployment approval:

```sh
npm run db:staging:migrate
npm run deploy:staging
```

Migration applies the four existing additive migrations to staging only. Neither
command changes production through this configuration. Automatic Workers Builds
may deploy after a push if enabled, so finish the correct build-target setup first.

Keep community disabled for the initial deploy. Check `/account` and `/audits`
load with their security headers; `/api/community/me` should return disabled 503.
After migrations, runtime credentials, domain/callback and access policies are
verified, explicitly enable staging in its config and redeploy. Test with synthetic
content only: staging reports become publicly reachable when enabled. Production
must remain disabled until the end-to-end and operational launch gates in
[COMMUNITY-D1.md](COMMUNITY-D1.md) pass.
