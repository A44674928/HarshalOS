import { authorizeCommunity, authJson, limitCommunityRuns } from './community-auth.mjs';
import { CommunityError, getDraft } from './community-db.mjs';
import { evaluateSavedInput, auditTemplate } from './community-audit.mjs';
import { ENGINE_SHA256, EVALUATOR_SHA256 } from './community-engine-version.mjs';
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const route = new RegExp(`^/api/community/drafts/(${uuid})/runs(?:/(${uuid}))?$`);
const dto = row => ({ id: row.id, draftId: row.draft_id, revision: row.revision, createdAt: row.created_at,
  reportHash: row.report_hash, report: JSON.parse(row.report_json) });
async function revisionBody(request) {
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new CommunityError(415, 'Send application/json.');
  const reader = request.body?.getReader(); if (!reader) throw new CommunityError(400, 'Send the saved revision.');
  let text = '', size = 0; const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 1024) { await reader.cancel(); throw new CommunityError(413, 'Run requests may only contain a revision.'); }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  let data; try { data = JSON.parse(text); } catch { throw new CommunityError(400, 'Invalid JSON.'); }
  if (!data || Object.keys(data).length !== 1 || !Number.isSafeInteger(data.revision) || data.revision < 1) throw new CommunityError(400, 'Send only a positive integer revision; results are computed by the server.');
  return data.revision;
}
export async function handleRuns(request, env) {
  try {
    const user = await authorizeCommunity(request, env, { write: request.method !== 'GET' });
    const url = new URL(request.url);
    if (url.pathname === '/api/community/audit-template') {
      if (request.method !== 'GET') return authJson({ error: 'Method not allowed.' }, 405, { Allow: 'GET' });
      return authJson({ input: auditTemplate(url.searchParams.get('version') || '1.0') });
    }
    const match = route.exec(url.pathname);
    if (!match) throw new CommunityError(404, 'Unknown execution route.');
    const [, draftId, runId] = match;
    const allowed = runId ? ['GET'] : ['GET', 'POST'];
    if (!allowed.includes(request.method)) return authJson({ error: 'Method not allowed.' }, 405, { Allow: allowed.join(', ') });
    const db = env.COMMUNITY_DB;
    const schema = await db.prepare("SELECT version FROM community_schema WHERE component = 'private-runs'").first();
    if (schema?.version !== 1) throw new CommunityError(503, 'Private execution migration is required.');
    const draft = await getDraft(db, user.id, draftId);
    if (request.method === 'GET') {
      if (runId) {
        const row = await db.prepare(`SELECT r.* FROM community_runs r JOIN community_users u ON u.id = r.owner_id
          WHERE r.id = ? AND r.draft_id = ? AND r.owner_id = ? AND u.blocked = 0`).bind(runId, draftId, user.id).first();
        if (!row) throw new CommunityError(404, 'Execution not found.');
        return authJson({ run: dto(row) });
      }
      const after = url.searchParams.get('after');
      if (after !== null && (!/^[1-9][0-9]{0,15}$/.test(after) || !Number.isSafeInteger(Number(after)))) throw new CommunityError(400, 'Invalid execution cursor.');
      const { results } = await db.prepare(`SELECT r.id, r.seq, r.revision, r.created_at AS createdAt, r.phase, r.report_hash AS reportHash
        FROM community_runs r JOIN community_users u ON u.id = r.owner_id
        WHERE r.draft_id = ? AND r.owner_id = ? AND u.blocked = 0 AND r.seq < ? ORDER BY r.seq DESC LIMIT 26`)
        .bind(draftId, user.id, after ? Number(after) : Number.MAX_SAFE_INTEGER).all();
      return authJson({ runs: results.slice(0, 25).map(({ seq, ...row }) => row), nextCursor: results.length > 25 ? String(results[24].seq) : null });
    }
    const revision = await revisionBody(request);
    if (draft.revision !== revision) throw new CommunityError(409, 'The saved draft changed. Reload before running.');
    const existing = () => db.prepare(`SELECT r.* FROM community_runs r JOIN community_drafts d ON d.id = r.draft_id
      JOIN community_users u ON u.id = r.owner_id WHERE r.draft_id = ? AND r.owner_id = ?
      AND r.revision = ? AND r.evaluator_hash = ? AND d.revision = ? AND u.blocked = 0`)
      .bind(draftId, user.id, revision, EVALUATOR_SHA256, revision).first();
    const old = await existing(); if (old) return authJson({ run: dto(old), reused: true });
    await limitCommunityRuns(env, user.id);
    const result = await evaluateSavedInput(draft.input);
    const row = await db.prepare(`INSERT INTO community_runs
      (id, draft_id, owner_id, revision, engine_hash, evaluator_hash, report_hash, phase, report_json, created_at)
      SELECT ?, d.id, d.owner_id, d.revision, ?, ?, ?, ?, ?, ? FROM community_drafts d
      JOIN community_users u ON u.id = d.owner_id WHERE d.id = ? AND d.owner_id = ? AND d.revision = ?
      AND d.input_json = ? AND u.blocked = 0 AND (SELECT COUNT(*) FROM community_runs WHERE owner_id = ?) < 200
      ON CONFLICT(draft_id, revision, evaluator_hash) DO NOTHING RETURNING *`)
      .bind(crypto.randomUUID(), ENGINE_SHA256, EVALUATOR_SHA256, result.reportHash, result.report.result.phase, result.json, Date.now(),
        draftId, user.id, revision, JSON.stringify(draft.input), user.id).first();
    if (row) return authJson({ run: dto(row), reused: false }, 201);
    const raced = await existing(); if (raced) return authJson({ run: dto(raced), reused: true });
    throw new CommunityError(409, 'Draft changed, account unavailable, or the 200-run account limit was reached. No result was saved.');
  } catch (error) {
    return authJson({ error: error instanceof CommunityError ? error.message : 'Private execution unavailable. No public report was created.' }, error instanceof CommunityError ? error.status : 503);
  }
}
