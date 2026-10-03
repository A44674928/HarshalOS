// Internal functions only: ownerId MUST come from a verified server session,
// never request input. Private HTTP routes enforce the session guard first.
export class CommunityError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export async function checkCommunitySchema(db) {
  try {
    const row = await db.prepare("SELECT version FROM community_schema WHERE component = 'private-drafts'").first();
    if (row?.version !== 1) throw new Error('Unsupported schema');
    await db.prepare('SELECT id, oidc_issuer, oidc_subject, blocked, created_at FROM community_users LIMIT 1').first();
    await db.prepare('SELECT id, owner_id, revision, title, input_json, private_notes, created_at, updated_at FROM community_drafts LIMIT 1').first();
    return { component: 'private-drafts', version: 1 };
  } catch {
    throw new CommunityError(503, 'Community database is unavailable or its schema is not supported.');
  }
}
function validate(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CommunityError(400, 'Draft must be an object.');
  const { title, input, privateNotes = '' } = value;
  if (typeof title !== 'string' || !title.trim() || title.length > 200) throw new CommunityError(400, 'Title must contain 1–200 characters.');
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new CommunityError(400, 'Input must be an object.');
  if (typeof privateNotes !== 'string' || privateNotes.length > 4000) throw new CommunityError(400, 'Private notes must be at most 4000 characters.');
  let json;
  try { json = JSON.stringify(input); } catch { throw new CommunityError(400, 'Input must be JSON serializable.'); }
  if (!json || !json.startsWith('{')) throw new CommunityError(400, 'Input must serialize as an object.');
  if (new TextEncoder().encode(json).byteLength > 65536) throw new CommunityError(413, 'Input exceeds 64 KiB.');
  // Envelope validation only; Ground-0 semantics/recomputation come later.
  return { title: title.trim(), json, privateNotes };
}
function identity(ownerId) {
  if (typeof ownerId !== 'string' || !ownerId || ownerId.length > 128) throw new CommunityError(401, 'A verified account is required.');
}
function timestamp(now) {
  if (!Number.isSafeInteger(now) || now < 0) throw new CommunityError(400, 'Invalid timestamp.');
}
function dto(row) {
  return { id: row.id, revision: row.revision, title: row.title, input: JSON.parse(row.input_json),
    privateNotes: row.private_notes, createdAt: row.created_at, updatedAt: row.updated_at };
}
export async function createDraft(db, ownerId, value, now = Date.now()) {
  identity(ownerId); timestamp(now);
  const data = validate(value);
  const row = await db.prepare(`INSERT INTO community_drafts
    (id, owner_id, title, input_json, private_notes, created_at, updated_at)
    SELECT ?, id, ?, ?, ?, ?, ? FROM community_users
    WHERE id = ? AND blocked = 0
      AND (SELECT COUNT(*) FROM community_drafts WHERE owner_id = ?) < 100
    RETURNING *`).bind(crypto.randomUUID(), data.title, data.json, data.privateNotes, now, now, ownerId, ownerId).first();
  if (!row) throw new CommunityError(403, 'Account unavailable or private draft limit reached.');
  return dto(row);
}
export async function getDraft(db, ownerId, id) {
  identity(ownerId);
  const row = await db.prepare(`SELECT d.* FROM community_drafts d
    JOIN community_users u ON u.id = d.owner_id
    WHERE d.id = ? AND d.owner_id = ? AND u.blocked = 0`).bind(id, ownerId).first();
  if (!row) throw new CommunityError(404, 'Draft not found.');
  return dto(row);
}
export async function updateDraft(db, ownerId, id, expectedRevision, value, now = Date.now()) {
  identity(ownerId); timestamp(now);
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) throw new CommunityError(400, 'A positive integer revision is required.');
  const data = validate(value);
  const row = await db.prepare(`UPDATE community_drafts
    SET title = ?, input_json = ?, private_notes = ?, updated_at = MAX(updated_at, ?), revision = revision + 1
    WHERE id = ? AND owner_id = ? AND revision = ?
      AND EXISTS (SELECT 1 FROM community_users WHERE id = ? AND blocked = 0)
    RETURNING *`).bind(data.title, data.json, data.privateNotes, now, id, ownerId, expectedRevision, ownerId).first();
  // Identical response for missing, blocked, stale, or another user's draft.
  if (!row) throw new CommunityError(409, 'Draft unavailable or changed; reload before saving.');
  return dto(row);
}

export async function listDrafts(db, ownerId, after = '') {
  identity(ownerId);
  const { results } = await db.prepare(`SELECT d.id, d.title, d.revision, d.updated_at AS updatedAt
    FROM community_drafts d JOIN community_users u ON u.id = d.owner_id
    WHERE d.owner_id = ? AND u.blocked = 0 AND d.id > ? ORDER BY d.id LIMIT 26`).bind(ownerId, after).all();
  return { drafts: results.slice(0, 25), nextCursor: results.length > 25 ? results[24].id : null };
}
