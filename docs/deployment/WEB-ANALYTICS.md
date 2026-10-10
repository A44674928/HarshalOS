# Web Analytics (Cloudflare, privacy-first)

Cloudflare Web Analytics measures page views and visits without cookies and
without fingerprinting — no consent banner is needed for it. It is a
dashboard toggle plus one script tag; there is nothing to self-host.

## Setup

1. Cloudflare dashboard → the production zone → Analytics & Logs → Web
   Analytics → Enable, and copy the beacon token.
2. Add the beacon to each served page (`index.html`, `account.html`,
   `audits.html`, and any other entry points), just before `</body>`:

```html
<script defer src="https://static.cloudflareinsights.com/beacon.min.js"
  data-cf-beacon='{"token": "PASTE_TOKEN_HERE"}'></script>
```

3. Adjust the Content Security Policy. The `/account` and `/audits` responses
   carry a locked-down CSP from `worker/index.mjs`; the beacon needs two
   additions on that header before it can load or report:
   - `script-src 'self'` → `script-src 'self' https://static.cloudflareinsights.com`
   - `connect-src 'self'` → `connect-src 'self' https://cloudflareinsights.com`
   
   Other pages served through the Worker's static assets inherit the zone's
   default policy (none set by this repository), so they need no change.

4. Deploy, browse the site, and confirm requests to
   `static.cloudflareinsights.com` in the browser devtools network panel.
   Metrics appear in the dashboard within a few minutes.

## Notes

- The beacon is deliberately **not** installed by this change: the token is
  zone-specific and the CSP edit weakens a security header, so both happen
  explicitly at enablement time, not speculatively.
- Beacon traffic is excluded from Turnstile, caching rules, and API rate
  limits — it talks to Cloudflare's analytics endpoint, not this Worker.
- If the site later adds a consent manager for other tools, Web Analytics can
  stay always-on: it sets no cookies and stores no personal data.
