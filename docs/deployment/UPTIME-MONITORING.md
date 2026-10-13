# External monitoring: UptimeRobot on the free tier

Cloudflare tells you when the Worker errors; it does not tell you when the
site stops answering from the outside. UptimeRobot's free plan (50 monitors,
5-minute checks, email alerts) covers that gap with no code and no card.

## Monitors to create (dashboard, ~10 minutes)

Create an UptimeRobot account, add an alert contact (email), then add these
HTTP(s) monitors at the 5-minute interval:

1. `HarshalOS home` → `https://<production-host>/` — expect status 200.
   Catches DNS, TLS, and total-outage failures.
2. `HarshalOS Orb 2 field` → `https://<production-host>/api/good-intelligence/v1/orb2/field`
   — expect status 200. Catches Worker-level faults on the API path (a
   poisoned deploy that still serves static assets fails here first).
3. `HarshalOS community status` → `https://<production-host>/api/community/status`
   — expect status 200. Catches D1/Worker faults on the community path.

Set each monitor's alert contact, then prove the path: pause Cloudflare
proxying is overkill — instead, temporarily set monitor 1 to a bogus path
(e.g. `/__uptime-test-404__`), confirm the DOWN alert arrives, then fix it
and confirm recovery.

## Known limitation: 200 is not a fresh beat

These monitors prove the site answers; they do not prove the Orb 2 beat is
advancing — a frozen beat still serves `200` from the precomputed document,
whose `status.lastTickAt` is only as new as the last tick. Two mitigations,
cheapest first:

- When an alert fires (or weekly), open monitor 2's URL and compare
  `status.lastTickAt` against the current time. The field document also
  carries `X-Orb2-Field` on every response (`snapshot; interval=…; built=…;
  source=…`, or `cache; …` on a Cache API hit), so `built` shows how stale the
  served document is even when the beat itself is healthy.
- The age that matters depends on who owns the beats. With the Worker's own
  tick it is about a minute; when the beats run off-Cloudflare
  (`docs/deployment/ORB2-BEAT-RUNNER.md`, every five minutes) treat ~15
  minutes as stuck, and note that a paused GitHub Actions schedule is a
  plausible cause that the Worker's metrics will not show.

Thresholds: more than ~5 minutes old with the Worker tick enabled, or more
than ~15 minutes with the runner enabled, means the beat is stuck — see
`docs/deployment/ORB2-CRON-PLAN.md`.
- Phase 2 (optional, small code change): add an UptimeRobot **Heartbeat**
  monitor and `fetch()` its URL from `scheduled()` inside
  `context.waitUntil`, with the heartbeat URL stored as a Worker secret.
  Heartbeat monitors alert on *missing* pings, which is exactly "the beat
  stopped". Not implemented yet — say the word and it is a ~15-line change
  plus a secret.

## Cost and limits

Free plan: 50 monitors (3 used), 5-minute granularity, 1 alert contact of
each type on the lowest tier. No card required. Monitor URLs are public
endpoints — nothing authenticated or secret is exposed to the checker.
