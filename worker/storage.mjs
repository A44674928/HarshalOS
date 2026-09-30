export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const MAX_BYTES = 4 * 1024 * 1024;
export function validateSnapshot(value) {
  if (!value || !Array.isArray(value.audits) || !Array.isArray(value.evidence) ||
      value.audits.length > 2000 || value.evidence.length > 5000) {
    throw new ApiError(400, 'Expected bounded audits and evidence arrays.');
  }
  for (const [items, audit] of [[value.audits, true], [value.evidence, false]]) {
    const ids = new Set();
    for (const item of items) {
      if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.id !== 'string' ||
          !item.id || item.id.length > 200 || ids.has(item.id) ||
          (audit && (typeof item.name !== 'string' || !['NAB', 'CWO', 'GSRB', 'AMBIGUOUS', 'INCOHERENT'].includes(item.phase)))) {
        throw new ApiError(400, 'Invalid or duplicate record.');
      }
      ids.add(item.id);
    }
  }
  return { audits: value.audits, evidence: value.evidence };
}
export async function validateLedger(rows) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 10000) throw new ApiError(400, 'Invalid ledger size.');
  let prev = '0'.repeat(64);
  const encoder = new TextEncoder();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.id !== i + 1 || typeof row.ts !== 'string' || !Number.isFinite(Date.parse(row.ts)) ||
        !['info', 'warning', 'breach', 'collapse', 'permit'].includes(row.severity) ||
        typeof row.event !== 'string' || row.event.length > 20000 || row.prevHash !== prev ||
        !['NAB', 'CWO', 'GSRB'].includes(row.declaredPhase)) throw new ApiError(400, 'Invalid ledger sequence.');
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode([row.id, row.ts, row.severity, row.event, prev, 'HARSHAL'].join('|')));
    const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    if (row.hash !== hash) throw new ApiError(400, 'Ledger hash mismatch.');
    prev = hash;
  }
  // Do not retain arbitrary fields supplied by the client.
  return rows.map(({ id, ts, severity, event, declaredPhase, prevHash, hash }) => ({ id, ts, severity, event, declaredPhase, prevHash, hash }));
}
export function assertPrefix(oldRows, rows) {
  if (rows.length < oldRows.length || oldRows.some((r, i) => JSON.stringify(r) !== JSON.stringify(rows[i]))) {
    throw new ApiError(409, 'An archived ledger prefix cannot be changed or removed.');
  }
}
