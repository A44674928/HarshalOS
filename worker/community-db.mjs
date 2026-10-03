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

// Deletion is explicit and permanent. It never touches public history: a draft,
// run or preview that anchors a publication is refused, and published versions
// must be withdrawn (their rows cannot be deleted at all).
async function anchorsPublication(db, column, id, ownerId) {
  const row = await db.prepare(`SELECT 1 AS found FROM community_publications
    WHERE ${column} = ? AND owner_id = ? LIMIT 1`).bind(id, ownerId).first();
  return Boolean(row);
}
export async function deleteDraft(db, ownerId, id, expectedRevision, now = Date.now()) {
  identity(ownerId); timestamp(now);
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) throw new CommunityError(400, 'A positive integer revision is required.');
  // Identical refusal for missing, not-owned or blocked drafts; never confirm another account's data.
  const owned = await db.prepare(`SELECT d.revision FROM community_drafts d JOIN community_users u ON u.id = d.owner_id
    WHERE d.id = ? AND d.owner_id = ? AND u.blocked = 0`).bind(id, ownerId).first();
  if (!owned) throw new CommunityError(409, 'Draft unavailable or changed; reload before deleting.');
  if (await anchorsPublication(db, 'draft_id', id, ownerId)) throw new CommunityError(409, 'This draft anchors a published report. Withdraw the report instead; published versions cannot be deleted.');
  if (owned.revision !== expectedRevision) throw new CommunityError(409, 'Draft changed; reload before deleting.');
  try {
    // Transactional: previews and private runs of this draft only, then the draft itself.
    // The revision recheck inside the DELETE is what makes concurrent saves safe.
    await db.batch([
      db.prepare('DELETE FROM community_previews WHERE draft_id = ? AND owner_id = ?').bind(id, ownerId),
      db.prepare(`DELETE FROM community_public_series WHERE draft_id = ? AND id NOT IN
        (SELECT series_id FROM community_publications) AND draft_id IN
        (SELECT id FROM community_drafts WHERE id = ? AND owner_id = ?)`).bind(id, id, ownerId),
      db.prepare('DELETE FROM community_runs WHERE draft_id = ? AND owner_id = ?').bind(id, ownerId),
      db.prepare(`DELETE FROM community_drafts WHERE id = ? AND owner_id = ? AND revision = ?
        AND EXISTS (SELECT 1 FROM community_users WHERE id = ? AND blocked = 0)`).bind(id, ownerId, expectedRevision, ownerId)
    ]);
  } catch (error) {
    // A publication that committed during the batch is a refusal, not an outage.
    if (await anchorsPublication(db, 'draft_id', id, ownerId).catch(() => false)) throw new CommunityError(409, 'This draft anchors a published report. Withdraw the report instead; published versions cannot be deleted.');
    throw error;
  }
  const remaining = await db.prepare('SELECT id FROM community_drafts WHERE id = ? AND owner_id = ?').bind(id, ownerId).first();
  if (remaining) throw new CommunityError(409, 'Draft changed or is unavailable; reload before deleting.');
  return { deleted: true };
}
export async function deleteRun(db, ownerId, draftId, runId, now = Date.now()) {
  identity(ownerId); timestamp(now);
  const run = await db.prepare(`SELECT r.id FROM community_runs r JOIN community_drafts d ON d.id = r.draft_id
    JOIN community_users u ON u.id = r.owner_id WHERE r.id = ? AND r.draft_id = ? AND r.owner_id = ? AND u.blocked = 0`)
    .bind(runId, draftId, ownerId).first();
  if (!run) throw new CommunityError(404, 'Execution not found.');
  if (await anchorsPublication(db, 'run_id', runId, ownerId)) throw new CommunityError(409, 'This run anchors a published report. Withdraw the report instead; published versions cannot be deleted.');
  try {
    await db.batch([
      // Previews are regenerable candidates; deleting the run discards them explicitly.
      db.prepare('DELETE FROM community_previews WHERE run_id = ? AND owner_id = ?').bind(runId, ownerId),
      db.prepare('DELETE FROM community_runs WHERE id = ? AND draft_id = ? AND owner_id = ?').bind(runId, draftId, ownerId)
    ]);
  } catch (error) {
    if (await anchorsPublication(db, 'run_id', runId, ownerId).catch(() => false)) throw new CommunityError(409, 'This run anchors a published report. Withdraw the report instead; published versions cannot be deleted.');
    throw error;
  }
  const remaining = await db.prepare('SELECT id FROM community_runs WHERE id = ? AND owner_id = ?').bind(runId, ownerId).first();
  if (remaining) throw new CommunityError(409, 'Execution could not be deleted; reload and retry.');
  return { deleted: true };
}

export async function listDrafts(db, ownerId, after = '') {
  identity(ownerId);
  const { results } = await db.prepare(`SELECT d.id, d.title, d.revision, d.updated_at AS updatedAt
    FROM community_drafts d JOIN community_users u ON u.id = d.owner_id
    WHERE d.owner_id = ? AND u.blocked = 0 AND d.id > ? ORDER BY d.id LIMIT 26`).bind(ownerId, after).all();
  return { drafts: results.slice(0, 25), nextCursor: results.length > 25 ? results[24].id : null };
}
