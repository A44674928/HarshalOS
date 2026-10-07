/*
 * Server-side Symbolic Firewall.
 * Narrative, mythic, commercial-metaphor, and symbolic content is accepted only
 * as inert data. The Worker creates the containment seal; browser code cannot
 * manufacture an equivalent authoritative seal or turn the payload into an
 * executable instruction.
 */
const MAX_SYMBOLIC_BYTES = 64 * 1024;
const encoder = new TextEncoder();

const json = (data, status = 200) => Response.json(data, {
  status,
  headers: {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  }
});

function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}

async function readJson(request) {
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) {
    return { error: "Send application/json." };
  }
  const reader = request.body?.getReader();
  if (!reader) return { error: "Missing request body." };
  const parts = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_SYMBOLIC_BYTES) {
      await reader.cancel();
      return { error: "Symbolic payload exceeds the 64 KiB containment limit." };
    }
    parts.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  try {
    return { data: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { error: "Invalid JSON." };
  }
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}

export async function handleSymbolicFirewall(request) {
  try {
    if (request.method !== "POST") {
      return json({ error: "Method not allowed." }, 405);
    }
    if (!sameOrigin(request)) {
      return json({ error: "Same-origin request required." }, 403);
    }

    const parsed = await readJson(request);
    if (parsed.error) return json({ error: parsed.error }, parsed.error.includes("limit") ? 413 : 400);

    const value = parsed.data;
    const text = typeof value?.text === "string" ? value.text.trim() : "";
    if (!text) return json({ error: "Nothing to seal." }, 400);
    if (text.length > MAX_SYMBOLIC_BYTES) return json({ error: "Symbolic payload exceeds the 64 KiB containment limit." }, 413);

    const nonce = crypto.randomUUID();
    const hash = "0x" + await sha256Hex(text);
    const sealedAt = new Date().toISOString();

    return json({
      success: true,
      schema: "hos-symbolic-firewall-seal-v1",
      firewall: {
        classification: "NON-EXECUTABLE",
        executable: false,
        authorityEffect: "NONE",
        sealedAt,
        nonce,
        hash,
        text: text.length > 400 ? text.slice(0, 400) + "…" : text
      }
    });
  } catch {
    return json({ error: "Symbolic Firewall unavailable." }, 503);
  }
}
