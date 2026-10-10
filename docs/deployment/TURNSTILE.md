# Turnstile human verification for public writes

Publishing a report (`POST /api/community/publish`) and filing a moderator
report (`POST /api/community/publications/:id/report`) are the two
irreversible public writes an authenticated account can make. When Turnstile
is configured, both require a fresh Cloudflare challenge token; when it is
not configured, both behave exactly as before. There is no middle state and
no per-user opt-out.

Implementation: `worker/turnstile.mjs` (verify against siteverify),
enforcement in `worker/community-publication.mjs`, widgets in
`js/community.js` (`#turnstile-publish`) and `js/community-public.js`
(`#turnstile-report`).

## Setup (dashboard only — nothing in wrangler)

1. Cloudflare dashboard → Turnstile → Add widget. Name it after the
   deployment (e.g. `harshalos-community`), add the production hostname, and
   choose the Managed widget type — most humans pass without interaction.
2. Copy the **site key** (public) and **secret key**.
3. Workers → `harshalos` → Settings → Variables and Secrets:
   - Variable `TURNSTILE_SITE_KEY` = the site key (plain text variable).
   - Secret `TURNSTILE_SECRET_KEY` = the secret (secret binding, encrypted).
     `TURNSTILE_SECRET` is accepted as a legacy alias; prefer the `_KEY` name.
4. Redeploy (or wait for the next deployment — plain variables need one).

No `wrangler.jsonc` change is required or wanted: like the OIDC settings,
these values stay owner-managed in the dashboard, which is also why
`production-config-test` asserts the committed `vars` key set stays small.

## Behavior contract

- `GET /api/community/status` gains `turnstile: { required, siteKey }`.
  `required` is true exactly when a secret is configured; the secret is never
  disclosed anywhere.
- The account page fetches that status only after a preview is generated, and
  the register page only on the first report click — readers load no
  third-party script, ever.
- The widget script and challenge iframe come from
  `https://challenges.cloudflare.com`. The `/account` + `/audits` CSP admits
  that origin **only when `TURNSTILE_SITE_KEY` is set**; without it the header
  is byte-identical to the locked-down form.
- Verification POSTs `{ secret, response, remoteip }` to the fixed siteverify
  origin with an 8-second deadline, and additionally requires the token's
  hostname to equal `COMMUNITY_ORIGIN`.
- Missing/invalid tokens → `403` with a human-readable message. A Turnstile
  outage → `503` (fail closed, retry) — a configured check must never
  silently disable itself. No secret is ever logged.

## Proving it works

1. With the keys set, `GET /api/community/status` shows `required: true`.
2. Generate a preview on `/account` — the widget appears under the consent
   checkbox; the publish button stays disabled until the challenge completes.
3. Publish; then file a report from `/audits` — same widget, same gate.
4. Remove the secret and redeploy: widgets disappear, publishing works
   unchallenged (the opt-in-off state).

Cloudflare publishes always-pass / always-fail test site keys for staging;
use those on a preview deployment before wiring the production keys.

## Troubleshooting

- `403` on publish with "Human verification …" and no widget visible: the
  secret is set but `TURNSTILE_SITE_KEY` is missing or blank — the page cannot
  render the challenge. Set the variable and redeploy.
- Widget area blank with a console CSP error: the deployment predates the
  conditional carve-out — redeploy.
- `503` on publish/report during a Cloudflare incident: expected fail-closed
  behavior; writes resume when siteverify recovers. Nothing is half-written —
  verification runs before any D1 write.

Tests: `tests/turnstile-test.mjs` (via `npm run test:community`).
