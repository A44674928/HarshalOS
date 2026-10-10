/*
 * HarshalOS — Cloudflare Turnstile human verification for public writes.
 *
 * Publishing a report and filing a moderator report are the two irreversible
 * public writes an authenticated account can make, and both already carry
 * per-day quotas. Turnstile adds a human check in front of them: the account
 * and register pages render a challenge widget, and this module verifies the
 * resulting token with Cloudflare before the write proceeds.
 *
 * Fail-open vs fail-closed, deliberately split:
 *   · Not configured (no TURNSTILE_SECRET_KEY) → the write proceeds exactly as
 *     before. Verification is an operator opt-in, and an operator who has not
 *     opted in gets today's behavior, not a broken publish button.
 *   · Configured → missing, invalid, or wrong-hostname tokens are refused, and
 *     a Turnstile outage fails closed (503, retry) rather than silently
 *     disabling the check it was configured to enforce.
 *
 * The secret is never logged, never returned, and only ever POSTed to the
 * fixed siteverify origin. The site key is public by design and is served to
 * browsers through /api/community/status.
 */

export const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const TURNSTILE_SECRET_NAMES = Object.freeze(["TURNSTILE_SECRET_KEY", "TURNSTILE_SECRET"]);
export const TURNSTILE_SITE_KEY_NAME = "TURNSTILE_SITE_KEY";
const TURNSTILE_TIMEOUT_MS = 8_000;

export function turnstileSecret(env) {
  if (!env || typeof env !== "object") return "";
  for (const name of TURNSTILE_SECRET_NAMES) {
    const value = env[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function turnstileSiteKey(env) {
  const value = env && typeof env === "object" ? env[TURNSTILE_SITE_KEY_NAME] : "";
  return typeof value === "string" ? value.trim().slice(0, 128) : "";
}

export function turnstileConfigured(env) {
  return turnstileSecret(env) !== "";
}

/* What /api/community/status discloses: whether a token will be required, and
   the public site key the widget needs. The secret is never included. */
export function turnstileStatus(env) {
  const required = turnstileConfigured(env);
  return { required, siteKey: required ? turnstileSiteKey(env) : "" };
}

function expectedHostname(env) {
  try {
    const url = new URL(String(env.COMMUNITY_ORIGIN || ""));
    if (url.protocol !== "https:") return "";
    return url.hostname.toLowerCase();
  } catch {
    return "";
  }
}

/*
 * Verify one widget token. Returns { ok: true } or { ok: false, code,
 * message, retryable }. `fetcher` is injectable for tests; production passes
 * nothing and uses the Worker's fetch.
 */
export async function verifyTurnstile({ env = {}, token = "", ip = "", fetcher = null, timeoutMs = TURNSTILE_TIMEOUT_MS } = {}) {
  const secret = turnstileSecret(env);
  if (!secret) {
    return { ok: false, code: "turnstile-misconfigured", retryable: false, message: "Human verification is not configured on this deployment." };
  }
  if (typeof token !== "string" || !token.trim() || token.length > 2048) {
    return { ok: false, code: "turnstile-missing", retryable: false, message: "Complete the human verification challenge and retry." };
  }
  const call = fetcher || globalThis.fetch;
  if (typeof call !== "function") {
    return { ok: false, code: "turnstile-unreachable", retryable: true, message: "Human verification is temporarily unavailable. Retry shortly." };
  }
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  let timeout = null;
  /* A real deadline, not just an abort signal: a hung upstream must reject. */
  const deadline = new Promise((_, reject) => {
    timeout = setTimeout(() => {
      try { controller?.abort(); } catch { /* aborted is the point */ }
      reject(new Error("turnstile verification timed out"));
    }, Math.max(1, timeoutMs));
  });
  try {
    const form = new URLSearchParams();
    form.set("secret", secret);
    form.set("response", token.trim());
    if (ip) form.set("remoteip", String(ip).slice(0, 64));
    const response = await Promise.race([
      call(TURNSTILE_VERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: form.toString(),
        redirect: "manual",
        ...(controller ? { signal: controller.signal } : {})
      }),
      deadline
    ]);
    let data = null;
    try { data = await response.json(); } catch { data = null; }
    if (!response || !response.ok || !data || data.success !== true) {
      return { ok: false, code: "turnstile-invalid", retryable: false, message: "Human verification failed. Retry the challenge." };
    }
    /* A token minted for another hostname is not this deployment's proof. */
    const expected = expectedHostname(env);
    if (expected && String(data.hostname || "").toLowerCase() !== expected) {
      return { ok: false, code: "turnstile-invalid", retryable: false, message: "Human verification failed. Retry the challenge." };
    }
    return { ok: true };
  } catch {
    return { ok: false, code: "turnstile-unreachable", retryable: true, message: "Human verification is temporarily unavailable. Retry shortly." };
  } finally {
    if (timeout !== null) clearTimeout(timeout);
  }
}
