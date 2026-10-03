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

## Parking staging ("on ice") and thawing it

Parking stops staging from being reachable or redeployed while keeping every
resource in place, so a later thaw needs no rebuild. Nothing here touches
production, and none of it is a substitute for the launch gates above.

Repo-side facts that already limit the blast radius:

- `COMMUNITY_ENABLED=false` in `wrangler.staging.jsonc` is an explicit value, so a
  redeploy of the current config can never open staging sign-in. Dashboard text
  variables cannot override it while that line is present.
- `workers_dev` and `preview_urls` are both `false`, so `staging.empty.domains` is
  the only reachable surface.
- Workers Builds for `harshalos-staging` follows the single Git branch recorded in
  its build settings (the staging checkpoint used `arena/01a0fef9-harshalos`).
  Sessions that work on a different branch do not trigger staging builds. Confirm
  the configured branch instead of assuming it.

To freeze, in the Cloudflare dashboard:

1. **Stop automatic deploys.** Workers & Pages → `harshalos-staging` → Settings →
   Builds → Git Repositories → **Disconnect** (Cloudflare's documented way to
   disable automatic builds and deployments for a Worker). Reconnecting later is
   the same screen. Alternatively, keep the connection but set the deploy command
   to `npx wrangler versions upload` so builds produce unpromoted versions only.
2. **Make the host unreachable (recommended).** Settings → Domains & Routes →
   remove the `staging.empty.domains` custom domain. With `workers_dev` and preview
   URLs disabled, the Worker then serves nothing at any hostname. Remove any DNS
   record that removal leaves behind; do not touch unrelated records.
3. **Do not delete anything.** Keep the `community_db_staging` D1 database
   (`74f281fe-3ab9-49b1-bff6-4686cb768ca7`), the Worker's variables and secrets,
   and the staging Auth0 application. Deleting does not improve isolation, but it
   destroys migration history and callback configuration. If you want less surface,
   disable the staging Auth0 application and remove its client secret from the
   Worker rather than deleting the resources.
4. Leave the local test fixture (`tests/fixtures/community-d1-local.jsonc`) and any
   `.wrangler/` state alone; they are unrelated to the remote target.

To thaw:

1. Re-add the custom domain (Domains & Routes → add `staging.empty.domains`) and
   wait for DNS/TLS.
2. Confirm the Worker still has `COMMUNITY_ORIGIN` and the staging OIDC variables
   and secrets; they persist unless they were deliberately removed.
3. Reconnect Git builds (or deploy manually with `npm run deploy:staging`) from the
   branch that should own staging from then on.
4. Re-verify read-only with `npm run db:staging:migrations:list`, then repeat the
   verification and migration gates above before enabling anything.

Whether the staging Worker was ever actually deployed by Workers Builds is not
recorded in this repository — check the dashboard before assuming a build ran.
