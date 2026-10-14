# Private MongoDB storage for HarshalOS

## What is implemented

The new **Cloud Storage** desktop app uses authenticated same-origin `/api/storage/*` routes on a Cloudflare Worker. MongoDB credentials never go to the browser. The API verifies the Access JWT signature, issuer, audience, expiry, and owner email before opening a database connection. Writes also require a same-origin `Origin` header. Missing configuration fails closed.

This first version uses **explicit snapshots and ledger archives, not automatic background sync**:

- Save local Ground-0 audits/evidence to a private cloud snapshot; restore on another browser.
- Revision-checked, atomic snapshot replacement prevents silent cloud overwrites. An existing cloud copy must first be restored in a new page session before it can be updated. Downloading alone does not adopt its revision. There is no automatic merge.
- Archive the current kernel ledger session, list up to 100 recent sessions, and download them. Re-archiving extends a session only when its existing prefix is unchanged. Retries of the same rows are idempotent.
- Each upload is limited to 4 MiB; snapshots allow 2,000 audits/5,000 evidence items and ledger sessions 10,000 rows. These are deliberately conservative first-version limits. Large collections need a future per-record API, not raised limits alone.
- Only stored audits/evidence are selected, not interface preferences or live Human Key state. Retrieved documents and any text manually entered into records **are** uploaded. Do not put secrets inside record text.
- Local work remains available when the cloud is unavailable. Archive before closing/reloading: the kernel ledger remains in memory until explicitly archived. A timeout can mean the server saved data but the response was lost; download/check before retrying.
- Restore requires confirmation, creates a local recovery copy, and reloads the page. Close Ground-0, export local data, and archive the ledger first. Restore does not merge unsaved drafts. An existing recovery copy blocks another restore until exported and removed from browser storage (`hos-cloud-restore-recovery`). Other open tabs must reload before writing after a storage change.

MongoDB does **not** make client claims trustworthy or administrator edits impossible. The API validates the existing SHA-256 chain, not event truth. The original kernel hash does not cover `declaredPhase`; archived prefixes are nevertheless compared in full. No claim of independent witnessing or WORM storage is made. Authentication grants storage access only, not kernel authority or formal badge certification.

## 1. Prepare Atlas

1. Create an Atlas database user distinct from your Atlas website login. Grant `readWrite` on **harshalos only**, not admin access across all databases.
2. In Network Access, add `0.0.0.0/0`, as chosen for this initial Worker deployment. This permits network connections from anywhere; database authentication and TLS remain required. Use a strong, unique password and rotate it if exposed. A fixed-egress backend is needed if you later require a narrow IP allowlist.
3. Open the cluster's **Connect → Drivers → Node.js** screen and copy its connection string.
4. Substitute the database username/password privately; percent-encode reserved characters in each credential component. Do not encode the entire URI or paste the URI into chat, source files, screenshots, or shell command arguments.

The selected database is `harshalos` via `MONGODB_DATABASE`. Collections `snapshots` and `ledger_sessions` are created on first save. Their built-in unique `_id` indexes provide owner/session identity and duplicate protection. Snapshot writes use a revision predicate. Each API request owns and closes its driver connection (one pooled connection); cross-request Worker sockets are not reused. Test actual Worker/Atlas connectivity after deployment; a successful bundle is not a live connection test.

## 2. Configure Cloudflare Access before exposing the site

Use a custom hostname under a domain in your Cloudflare account. The checked-in Worker disables both `workers.dev` and version preview URLs intentionally.

1. In Cloudflare Zero Trust, add a **Self-hosted Access application** for the **entire hostname**, for example `os.example.com`. Protecting the whole hostname ensures browser sign-in happens before `/api` fetches. The shell can remain public in a later, separately reviewed configuration.
2. Add an **Allow** policy with **Include → Emails → only your email address**. Do not add Everyone, Bypass, or a broad email-domain policy. Enable an identity provider or email one-time PIN as appropriate.
3. Copy the application's **Application Audience (AUD) tag**.
4. Note your Zero Trust team domain, e.g. `your-team.cloudflareaccess.com` (hostname only, without `https://`).
5. In `wrangler.jsonc`, add your hostname as a custom-domain route:
   ```json
   "routes": [{ "pattern": "os.example.com", "custom_domain": true }]
   ```
   Replace the example. This requires the hostname's zone in your Cloudflare account. Do not deploy this configuration over an unrelated existing Worker without reviewing its routes first.

## 3. Install and deploy

```bash
npm ci
npx wrangler login
npm run check:deploy
npm run deploy
```

The `deploy` script stages `index.html`, `about.html`, `css/`, `js/`, `assets/`, the versioned `specs/normative/` and `specs/draft/` Markdown, the selected `docs/harshal-systems/01-core-book.md` at `book/01-core-book.md`, and the complete 39-file Markdown library under `book-library/harshal-systems/` with its generated catalog, all within ignored `.site-assets/`; neither the full repository nor backend source is an asset directory. Do not point the asset directory back at the checkout root. Secrets and private business papers must never be assets. `npm run dev` stages a fresh copy too; rerun staging after browser-code changes when using local Wrangler.

The initial deployment has no secrets and rejects cloud requests. Add these via the Worker's **Settings → Variables and Secrets**, or the interactive commands below. Each command prompts for its value, keeping values out of command history:

```bash
npx wrangler secret put MONGODB_URI
npx wrangler secret put ACCESS_TEAM_DOMAIN
npx wrangler secret put ACCESS_AUD
npx wrangler secret put OWNER_EMAIL
```

| Name | Private value |
| --- | --- |
| `MONGODB_URI` | Completed Atlas connection string |
| `ACCESS_TEAM_DOMAIN` | `your-team.cloudflareaccess.com` |
| `ACCESS_AUD` | Access application's audience tag |
| `OWNER_EMAIL` | Exact email permitted by your Access policy |

`MONGODB_DATABASE=harshalos` is a non-secret variable already in the config. No database credentials or Cloudflare credentials are required in chat. Local `.dev.vars` files are ignored, but local API requests still require a valid Access JWT; there is intentionally **no development auth bypass**. `node serve.js` remains a static-only preview and has no cloud API.

## 4. Verify the deployed system

1. Open your hostname in a private browser window. Confirm Access demands sign-in; another email must be denied.
2. Open **Cloud Storage → Check connection**. It should show your owner email. A status check saves nothing.
3. Export a local backup. Save a small test audit/evidence snapshot. Check Atlas for the `snapshots` record.
4. On another signed-in browser, download/review, then restore the cloud snapshot. Confirm record counts and content. Restore reloads the shell.
5. Save different changes in the two browsers; a stale revision must get a conflict instead of overwriting. Download both copies before resolving differences manually.
6. Archive the current ledger, add an event, archive again, list/download the session and verify both rows. Archives do not restore live authority or get inserted into the active kernel ledger.
7. Confirm `/.git/config`, `/.dev.vars`, `/worker/index.mjs`, `/package.json`, and `/Business%20Plan/` return 404 on the deployed hostname after sign-in.

No live Atlas connection, Access policy, or production deployment has been verified by the repository tests. A dry-run currently emits a `whatwg-url` compatibility shim warning; perform the real connection check before relying on storage. If Worker/driver compatibility fails, keep local exports and investigate the pinned driver/runtime combination rather than weakening TLS or authentication.

## Tests and operational limits

```bash
npm run test:cloud
npm run test:engine
npm run test:app
npm run check:deploy
```

Cloud tests use an in-memory database double, real JWT signing/verification keys, and the same route handlers. They cover missing/invalid authentication, owner checks, expiry/audience/issuer checks, body limits, same-origin writes, atomic revision conflicts, redacted errors, ledger hashes, immutable prefixes, and duplicate retries. They are not a substitute for Atlas or browser end-to-end tests.

Keep JSON exports outside the repository and monitor Atlas storage/connection usage and Worker requests. Archives accumulate; no delete endpoint or retention job is provided. Snapshot history is not retained by MongoDB automatically by this code. This free-tier prototype is not a disaster-recovery system. Back up before destructive restores or administrative changes.
