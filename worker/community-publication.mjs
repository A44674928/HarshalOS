import { authorizeCommunity, authJson, allowCommunityPublicRead, limitCommunityAction, digest } from './community-auth.mjs';
import { CommunityError } from './community-db.mjs';
import { evaluateSavedInput, canonical, sha256 } from './community-audit.mjs';
import { EVALUATOR_SHA256 } from './community-engine-version.mjs';
import { buildPublicReportNewsML, NEWSML_CONTENT_TYPE } from './community-newsml.mjs';
import { turnstileConfigured, turnstileStatus, verifyTurnstile } from './turnstile.mjs';
async function requireTurnstile(request, env, data, dependencies = {}) {
  if (!turnstileConfigured(env)) return;
  const ip = String(request.headers.get('CF-Connecting-IP') || '').split(',')[0].trim();
  const check = await verifyTurnstile({ env, token: data?.turnstileToken, ip, fetcher: dependencies.fetch || null });
  if (check.ok) return;
  throw new CommunityError(check.retryable ? 503 : 403, check.message);
}
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const validId = value => typeof value === 'string' && new RegExp('^' + UUID + '$').test(value);
const publicMatch = new RegExp(`^/api/community/publications/(${UUID})(?:/(history|withdraw|report|newsml))?$`);
const moderationMatch = new RegExp(`^/api/community/moderation/(${UUID})$`);
const fields = 'id, series_id, version, state, title, author, phase, report_hash, created_at, changed_at';
function dto(row) {
  return { id: row.id, seriesId: row.series_id, version: row.version, state: row.state,
    reportHash: row.report_hash, publishedAt: row.created_at, changedAt: row.changed_at,
    ...(row.state === 'published' ? { title: row.title, author: row.author, phase: row.phase, reviewStatus: 'UNREVIEWED',
      ...(row.report_json ? { report: JSON.parse(row.report_json) } : {}) } : {}) };
}
async function body(request, keys, max = 4096) {
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new CommunityError(415, 'Send application/json.');
  const reader = request.body?.getReader(); if (!reader) throw new CommunityError(400, 'Missing JSON body.');
  let size = 0, text = ''; const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > max) { await reader.cancel(); throw new CommunityError(413, 'Request too large.'); }
    text += decoder.decode(value, { stream: true });
  }
  let data; try { data = JSON.parse(text + decoder.decode()); } catch { throw new CommunityError(400, 'Invalid JSON.'); }
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some(k => !keys.includes(k))) throw new CommunityError(400, 'Unexpected request fields.');
  return data;
}
function cursor(url) {
  const value = url.searchParams.get('after');
  if (value !== null && (!/^[1-9][0-9]{0,15}$/.test(value) || !Number.isSafeInteger(Number(value)))) throw new CommunityError(400, 'Invalid page cursor.');
  return value ? Number(value) : Number.MAX_SAFE_INTEGER;
}
async function moderatorAvailable(env) {
  const subjects = (env.OIDC_ADMIN_SUBJECTS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!subjects.length || subjects.length > 20) throw new CommunityError(503, 'Configure a moderator before publishing.');
  const row = await env.COMMUNITY_DB.prepare(`SELECT id FROM community_users WHERE oidc_issuer=? AND blocked=0 AND oidc_subject IN (${subjects.map(() => '?').join(',')}) LIMIT 1`).bind(env.OIDC_ISSUER, ...subjects).first();
  if (!row) throw new CommunityError(503, 'A configured moderator must sign in before publication is available.');
  return subjects;
}
export async function handlePublication(request, env, dependencies = {}) {
  try {
    const url = new URL(request.url), path = url.pathname, method = request.method;
    const match = publicMatch.exec(path), moderation = moderationMatch.exec(path);
    const anonymous = method === 'GET' && (path === '/api/community/status' || path === '/api/community/publications' || path === '/api/community/public-log' || (match && (!match[2] || match[2] === 'history' || match[2] === 'newsml')));
    let user;
    if (anonymous) await allowCommunityPublicRead(request, env);
    else user = await authorizeCommunity(request, env, { write: method !== 'GET' });
    const db = env.COMMUNITY_DB, now = Date.now();
    const schema = await db.prepare("SELECT version FROM community_schema WHERE component='publication'").first();
    if (schema?.version !== 1) throw new CommunityError(503, 'Publication migration is required.');
    if (path === '/api/community/status' && method === 'GET') return authJson({ enabled: true, stage: 'publication', reviewStatus: 'UNREVIEWED', turnstile: turnstileStatus(env) });
    if (path === '/api/community/publications' && method === 'GET') {
      const { results } = await db.prepare(`SELECT seq, ${fields} FROM community_publications WHERE state='published' AND seq<? ORDER BY seq DESC LIMIT 26`).bind(cursor(url)).all();
      return authJson({ publications: results.slice(0,25).map(dto), nextCursor: results.length > 25 ? String(results[24].seq) : null });
    }
    if (path === '/api/community/public-log' && method === 'GET') {
      const { results } = await db.prepare('SELECT seq,publication_id AS publicationId,kind,created_at AS createdAt FROM community_public_events WHERE seq<? ORDER BY seq DESC LIMIT 51').bind(cursor(url)).all();
      return authJson({ events: results.slice(0,50), nextCursor: results.length > 50 ? String(results[49].seq) : null });
    }
    if (path === '/api/community/my-publications' && method === 'GET') {
      const { results } = await db.prepare(`SELECT seq, ${fields} FROM community_publications WHERE owner_id=? AND seq<? ORDER BY seq DESC LIMIT 26`).bind(user.id, cursor(url)).all();
      return authJson({ publications: results.slice(0,25).map(dto), nextCursor: results.length > 25 ? String(results[24].seq) : null });
    }
    if (path === '/api/community/public-preview' && method === 'POST') {
      const data = await body(request, ['runId','input','author'], 98304);
      if (!validId(data.runId) || typeof data.author !== 'string' || !data.author.trim() || data.author.length > 80) throw new CommunityError(400, 'Select a run and a public author label of 1–80 characters.');
      const run = await db.prepare(`SELECT r.id,r.draft_id,r.revision FROM community_runs r JOIN community_drafts d ON d.id=r.draft_id
        JOIN community_users u ON u.id=r.owner_id WHERE r.id=? AND r.owner_id=? AND r.revision=d.revision AND r.evaluator_hash=? AND u.blocked=0`).bind(data.runId, user.id, EVALUATOR_SHA256).first();
      if (!run) throw new CommunityError(409, 'Run the current saved revision with the current evaluator before previewing.');
      await limitCommunityAction(env, user.id, 'public-preview', 30);
      await db.prepare('DELETE FROM community_previews WHERE token_hash IN (SELECT token_hash FROM community_previews WHERE expires_at<=? ORDER BY expires_at LIMIT 100)').bind(now).run();
      if (!data.input || typeof data.input !== 'object' || Array.isArray(data.input)) throw new CommunityError(422, 'Public input must be an object.');
      if (new TextEncoder().encode(JSON.stringify(data.input)).length > 65536) throw new CommunityError(413, 'Public input exceeds 64 KiB.');
      const evaluated = await evaluateSavedInput(data.input);
      const { rawInputHash, ...content } = evaluated.report;
      const report = { ...content, schema: 'ground0-public-v1', author: data.author.trim(), publicInputHash: await sha256(content.input) };
      const json = canonical(report), hash = await sha256(report);
      if (new TextEncoder().encode(json).length > 196608) throw new CommunityError(413, 'Public report too large.');
      await db.prepare('INSERT INTO community_public_series(id,draft_id) VALUES (?,?) ON CONFLICT(draft_id) DO NOTHING').bind(crypto.randomUUID(), run.draft_id).run();
      const token = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/, '');
      const expiresAt = now + 900000;
      const preview = await db.prepare(`INSERT INTO community_previews(token_hash,owner_id,draft_id,run_id,revision,series_id,report_json,report_hash,expires_at)
        SELECT ?,d.owner_id,d.id,?,d.revision,s.id,?,?,? FROM community_drafts d JOIN community_public_series s ON s.draft_id=d.id
        JOIN community_users u ON u.id=d.owner_id WHERE d.id=? AND d.owner_id=? AND d.revision=? AND u.blocked=0 RETURNING token_hash`)
        .bind(await digest(token), run.id, json, hash, expiresAt, run.draft_id, user.id, run.revision).first();
      if (!preview) throw new CommunityError(409, 'Draft changed while previewing. Reload and run it again.');
      return authJson({ token, expiresAt, reportHash: hash, report });
    }
    if (path === '/api/community/publish' && method === 'POST') {
      const data = await body(request, ['token','acknowledgement','turnstileToken']);
      if (data.acknowledgement !== 'PUBLISH_PUBLIC_UNREVIEWED' || typeof data.token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(data.token)) throw new CommunityError(400, 'Explicit publication acknowledgement and preview token are required.');
      await requireTurnstile(request, env, data, dependencies);
      const tokenHash = await digest(data.token);
      const previous = await db.prepare('SELECT * FROM community_publications WHERE preview_hash=? AND owner_id=?').bind(tokenHash,user.id).first();
      if (previous) return authJson({ publication: dto(previous), reused: true });
      const moderators = await moderatorAvailable(env);
      await limitCommunityAction(env, user.id, 'publish', 10);
      const publishedAt = Date.now();
      const row = await db.prepare(`INSERT INTO community_publications
        (id,owner_id,draft_id,run_id,revision,series_id,version,preview_hash,state,title,author,phase,report_json,report_hash,created_at,changed_at)
        SELECT ?,p.owner_id,p.draft_id,p.run_id,p.revision,p.series_id,
          (SELECT COALESCE(MAX(version),0)+1 FROM community_publications WHERE series_id=p.series_id),p.token_hash,'published',
          json_extract(p.report_json,'$.input.name'),json_extract(p.report_json,'$.author'),json_extract(p.report_json,'$.result.phase'),p.report_json,p.report_hash,?,?
        FROM community_previews p JOIN community_drafts d ON d.id=p.draft_id JOIN community_users u ON u.id=p.owner_id
        JOIN community_runs r ON r.id=p.run_id
        WHERE p.token_hash=? AND p.owner_id=? AND p.expires_at>? AND p.revision=d.revision AND u.blocked=0 AND r.evaluator_hash=?
        AND EXISTS (SELECT 1 FROM community_users m WHERE m.blocked=0 AND m.oidc_issuer=? AND m.oidc_subject IN (SELECT value FROM json_each(?)))
        ON CONFLICT DO NOTHING RETURNING *`).bind(crypto.randomUUID(), publishedAt, publishedAt, tokenHash, user.id, publishedAt, EVALUATOR_SHA256, env.OIDC_ISSUER, JSON.stringify(moderators)).first();
      if (row) return authJson({ publication: dto(row), reused: false }, 201);
      const raced = await db.prepare('SELECT * FROM community_publications WHERE preview_hash=? AND owner_id=?').bind(tokenHash,user.id).first();
      if (raced) return authJson({ publication: dto(raced), reused: true });
      throw new CommunityError(409, 'Preview expired, draft changed, account unavailable, or this revision was already published. Create a fresh correction and preview.');
    }
    if (match) {
      const [, id, action] = match;
      if (method === 'GET' && action === 'newsml') {
        const row = await db.prepare(`SELECT p.id,p.series_id,p.version,p.state,p.title,p.author,p.phase,p.report_json,p.report_hash,p.created_at,
          (SELECT MIN(first_version.created_at) FROM community_publications first_version WHERE first_version.series_id=p.series_id) AS series_created_at
          FROM community_publications p WHERE p.id=? AND p.state='published'`).bind(id).first();
        if (!row) throw new CommunityError(404, 'Active publication not found.');
        let report;
        try { report = JSON.parse(row.report_json); } catch { throw new CommunityError(503, 'Public report export is unavailable.'); }
        if (!report || typeof report !== 'object' || Array.isArray(report)
          || report.schema !== 'ground0-public-v1' || report.reviewStatus !== 'UNREVIEWED'
          || report.platformCertification !== 'NONE' || report.author !== row.author
          || report.input?.name !== row.title || report.result?.phase !== row.phase
          || await sha256(report) !== row.report_hash) {
          throw new CommunityError(503, 'Public report export integrity check failed.');
        }
        const xml = buildPublicReportNewsML(row, url.origin);
        return new Response(xml, { headers: {
          'Content-Type': NEWSML_CONTENT_TYPE,
          'Content-Disposition': `attachment; filename="ground0-${row.id}-v${row.version}.xml"`,
          'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer',
          'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'none'; sandbox"
        } });
      }
      if (method === 'GET' && !action) {
        const row = await db.prepare('SELECT * FROM community_publications WHERE id=?').bind(id).first();
        if (!row) throw new CommunityError(404, 'Publication not found.');
        return authJson({ publication: dto(row) });
      }
      if (method === 'GET' && action === 'history') {
        const row = await db.prepare('SELECT series_id FROM community_publications WHERE id=?').bind(id).first();
        if (!row) throw new CommunityError(404, 'Publication not found.');
        const { results } = await db.prepare(`SELECT ${fields} FROM community_publications WHERE series_id=? AND version<? ORDER BY version DESC LIMIT 26`).bind(row.series_id,cursor(url)).all();
        return authJson({ publications: results.slice(0,25).map(dto), nextCursor: results.length > 25 ? String(results[24].version) : null });
      }
      if (method === 'POST' && action === 'withdraw') {
        await body(request, []);
        const row = await db.prepare('SELECT id FROM community_publications WHERE id=? AND owner_id=?').bind(id,user.id).first();
        if (!row) throw new CommunityError(404, 'Publication not found.');
        await db.prepare("UPDATE community_publications SET state='withdrawn',title=NULL,author=NULL,phase=NULL,report_json=NULL,changed_at=? WHERE id=? AND owner_id=? AND state='published'").bind(now,id,user.id).run();
        return authJson({ publication: dto(await db.prepare('SELECT * FROM community_publications WHERE id=?').bind(id).first()) });
      }
      if (method === 'POST' && action === 'report') {
        const data = await body(request, ['details','turnstileToken'], 16384);
        if (typeof data.details !== 'string' || !data.details.trim() || data.details.length > 2000) throw new CommunityError(400, 'Report details must contain 1–2000 characters.');
        await requireTurnstile(request, env, data, dependencies);
        await limitCommunityAction(env,user.id,'report',20);
        const exists = await db.prepare("SELECT id FROM community_publications WHERE id=? AND state='published'").bind(id).first();
        if (!exists) throw new CommunityError(404, 'Active publication not found.');
        await db.prepare('INSERT INTO community_reports(id,publication_id,reporter_id,details,created_at) VALUES (?,?,?,?,?) ON CONFLICT(publication_id,reporter_id) DO NOTHING').bind(crypto.randomUUID(),id,user.id,data.details.trim(),now).run();
        return authJson({ reported: true });
      }
    }
    if (path === '/api/community/moderation' || moderation) {
      if (!user.moderator) throw new CommunityError(403, 'Moderator access required.');
      if (path === '/api/community/moderation' && method === 'GET') {
        const { results } = await db.prepare("SELECT id,publication_id AS publicationId,details,created_at AS createdAt FROM community_reports WHERE state='open' ORDER BY created_at LIMIT 100").all();
        return authJson({ reports: results });
      }
      if (moderation && method === 'POST') {
        const data = await body(request, ['action','note'], 16384);
        if (!['dismiss','hide','hide-and-block'].includes(data.action) || typeof data.note !== 'string' || data.note.length > 2000) throw new CommunityError(400, 'Invalid moderation action or note.');
        const report = await db.prepare('SELECT r.*,p.owner_id FROM community_reports r JOIN community_publications p ON p.id=r.publication_id WHERE r.id=?').bind(moderation[1]).first();
        if (!report) throw new CommunityError(404, 'Report not found.');
        if (report.state !== 'open') return authJson({ resolved: true });
        const resolution = crypto.randomUUID();
        const guard = 'EXISTS (SELECT 1 FROM community_reports WHERE id=? AND resolution_id=?)';
        const statements = [db.prepare(`UPDATE community_reports SET state='resolved',resolution_id=? WHERE id=? AND state='open'
          AND EXISTS (SELECT 1 FROM community_users WHERE id=? AND blocked=0)`).bind(resolution,report.id,user.id)];
        // D1 batch is transactional. The resolution claim prevents concurrent staff
        // actions from overwriting each other's decisions or creating duplicate logs.
        if (data.action !== 'dismiss') statements.push(db.prepare(`UPDATE community_publications SET state='hidden',title=NULL,author=NULL,phase=NULL,report_json=NULL,changed_at=? WHERE ${data.action === 'hide-and-block' ? 'owner_id' : 'id'}=? AND state='published' AND ${guard}`).bind(now,data.action === 'hide-and-block' ? report.owner_id : report.publication_id,report.id,resolution));
        if (data.action === 'hide-and-block') {
          statements.push(db.prepare(`UPDATE community_users SET blocked=1 WHERE id=? AND ${guard}`).bind(report.owner_id,report.id,resolution));
          statements.push(db.prepare(`DELETE FROM community_sessions WHERE user_id=? AND ${guard}`).bind(report.owner_id,report.id,resolution));
        }
        statements.push(db.prepare(`INSERT INTO community_moderation_actions(id,moderator_id,report_id,action,note,created_at) SELECT ?,?,?,?,?,? WHERE ${guard}`).bind(resolution,user.id,report.id,data.action,data.note,now,report.id,resolution));
        await db.batch(statements);
        const resolved = await db.prepare('SELECT state FROM community_reports WHERE id=?').bind(report.id).first();
        if (resolved.state !== 'resolved') throw new CommunityError(409, 'Moderator account changed; no action was taken.');
        return authJson({ resolved: true });
      }
    }
    throw new CommunityError(405, 'Method or publication route not supported.');
  } catch (error) {
    return authJson({ error: error instanceof CommunityError ? error.message : 'Publication service unavailable. No private database details are exposed.' }, error instanceof CommunityError ? error.status : 503);
  }
}
