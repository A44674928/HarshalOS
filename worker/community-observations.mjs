import {
  allowCommunityPublicRead,
  authorizeCommunity,
  authJson,
  digest,
  limitCommunityAction,
  limitCommunityIpAction
} from './community-auth.mjs';
import { sha256 } from './community-audit.mjs';
import { CommunityError } from './community-db.mjs';

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const observationMatch = new RegExp(`^/api/community/observations/(${UUID})(?:/(withdraw|hide))?$`);
const handoffMatch = new RegExp(`^/api/community/observation-handoffs/(${UUID})(?:/(publish))?$`);
const profilePath = '/api/community/observation-profile';
const handoffPath = '/api/community/observation-handoffs';
const claimPath = '/api/community/observation-handoffs/claim';
const schemaComponent = 'public-observations';
const handoffLifetimeMilliseconds = 15 * 60 * 1000;
const codeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const publicFields = 'id, state, author, phase, note_text, content_hash, created_at, changed_at';

function randomToken() {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
    .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function randomClaimCode() {
  let code = '';
  for (let index = 0; index < 16; index += 1) {
    if (index && index % 4 === 0) code += '-';
    code += codeAlphabet[crypto.getRandomValues(new Uint8Array(1))[0] % codeAlphabet.length];
  }
  return code;
}

function validClaimCode(value) {
  return typeof value === 'string' && /^[A-Z2-9]{4}(?:-[A-Z2-9]{4}){3}$/.test(value);
}

function text(value, field, minimum, maximum, { multiline = false } = {}) {
  if (typeof value !== 'string') throw new CommunityError(400, `${field} must be text.`);
  const normalized = value.trim();
  if (normalized.length < minimum || normalized.length > maximum) {
    throw new CommunityError(400, `${field} must contain ${minimum}–${maximum} characters.`);
  }
  if (/\u0000/.test(normalized) || (!multiline && /[\r\n]/.test(normalized))) {
    throw new CommunityError(400, `${field} contains unsupported control characters.`);
  }
  return normalized;
}

function phase(value) {
  if (!['NAB', 'CWO', 'GSRB'].includes(value)) throw new CommunityError(400, 'Choose NAB, CWO, or GSRB.');
  return value;
}

function cursor(url) {
  const value = url.searchParams.get('after');
  if (value !== null && (!/^[1-9][0-9]{0,15}$/.test(value) || !Number.isSafeInteger(Number(value)))) {
    throw new CommunityError(400, 'Invalid page cursor.');
  }
  return value ? Number(value) : Number.MAX_SAFE_INTEGER;
}

function observationPage(rows, count = 25) {
  return {
    observations: rows.slice(0, count).map(publicDTO),
    nextCursor: rows.length > count ? String(rows[count - 1].seq) : null
  };
}

function publicDTO(row) {
  const dto = {
    id: row.id,
    state: row.state,
    contentHash: row.content_hash,
    publishedAt: row.created_at,
    changedAt: row.changed_at
  };
  if (row.state === 'published') {
    dto.author = row.author;
    dto.phase = row.phase;
    dto.text = row.note_text;
    dto.reviewStatus = 'UNREVIEWED';
    dto.schema = 'harshalos-public-observation-v1';
  }
  return dto;
}

function publicationStatusDTO(row) {
  const dto = {
    id: row.id,
    state: row.state,
    publishedAt: row.created_at,
    changedAt: row.changed_at
  };
  // The native capability is a receipt/status channel, never a second note-body
  // delivery path. The public feed remains the only route that returns text.
  if (row.state === 'published') dto.author = row.author;
  return dto;
}

function profileDTO(row) {
  return { pseudonym: row?.pseudonym ?? null, updatedAt: row?.updated_at ?? null };
}

function publisherURL(request) {
  const origin = new URL(request.url).origin;
  return `${origin}/observations`;
}

async function body(request, keys, maximum = 4096) {
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new CommunityError(415, 'Send application/json.');
  }
  const reader = request.body?.getReader();
  if (!reader) throw new CommunityError(400, 'Missing JSON body.');
  const decoder = new TextDecoder();
  let size = 0;
  let source = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximum) {
      await reader.cancel();
      throw new CommunityError(413, 'Request too large.');
    }
    source += decoder.decode(value, { stream: true });
  }
  let value;
  try {
    value = JSON.parse(source + decoder.decode());
  } catch {
    throw new CommunityError(400, 'Invalid JSON.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).some(key => !keys.includes(key))) {
    throw new CommunityError(400, 'Unexpected request fields.');
  }
  return value;
}

async function requireSchema(db) {
  const row = await db.prepare('SELECT version FROM community_schema WHERE component=?').bind(schemaComponent).first();
  if (row?.version !== 1) throw new CommunityError(503, 'Public observation migration is required.');
}

async function cleanupExpiredHandoffs(db, now) {
  // Bound every cleanup statement. Expired payloads are redacted rather than
  // published, while a minimal expired status is retained for the app poller.
  await db.prepare(`UPDATE community_observation_handoffs
    SET state='expired', owner_id=NULL, claim_code_hash=NULL, suggested_pseudonym=NULL,
      phase=NULL, note_text=NULL, note_hash=NULL, claimed_at=NULL
    WHERE id IN (
      SELECT id FROM community_observation_handoffs
      WHERE state IN ('pending', 'claimed') AND expires_at <= ?
      ORDER BY expires_at LIMIT 100
    )`).bind(now).run();
}

async function moderatorAvailable(env) {
  const subjects = (env.OIDC_ADMIN_SUBJECTS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (!subjects.length || subjects.length > 20) throw new CommunityError(503, 'Configure a moderator before publishing.');
  const row = await env.COMMUNITY_DB.prepare(`SELECT id FROM community_users
    WHERE oidc_issuer=? AND blocked=0 AND oidc_subject IN (${subjects.map(() => '?').join(',')}) LIMIT 1`)
    .bind(env.OIDC_ISSUER, ...subjects).first();
  if (!row) throw new CommunityError(503, 'A configured moderator must sign in before publication is available.');
  return subjects;
}

async function createHandoff(request, env) {
  await limitCommunityIpAction(request, env, 'observation-handoff', 12, 900);
  // Allow the bounded 2,000 UTF-16-unit note plus a bounded pseudonym even
  // when UTF-8/JSON escaping expands the request beyond 8 KiB.
  const data = await body(request, ['phase', 'text', 'author'], 12_288);
  const requestedPhase = phase(data.phase);
  const note = text(data.text, 'Observation text', 1, 2000, { multiline: true });
  const author = text(data.author, 'Public pseudonym', 1, 80);
  const now = Date.now();
  await requireSchema(env.COMMUNITY_DB);
  await cleanupExpiredHandoffs(env.COMMUNITY_DB, now);

  // The short manual code is intentionally distinct from the non-display status
  // capability. Neither permits a direct anonymous publication.
  let claimCode;
  let claimCodeHash;
  let inserted;
  for (let attempt = 0; attempt < 4 && !inserted; attempt += 1) {
    claimCode = randomClaimCode();
    claimCodeHash = await digest(claimCode);
    const statusToken = randomToken();
    const statusTokenHash = await digest(statusToken);
    const id = crypto.randomUUID();
    const expiresAt = now + handoffLifetimeMilliseconds;
    const noteHash = await sha256({ schema: 'harshalos-observation-handoff-v1', phase: requestedPhase, text: note, suggestedAuthor: author });
    inserted = await env.COMMUNITY_DB.prepare(`INSERT INTO community_observation_handoffs
      (id, status_token_hash, claim_code_hash, state, suggested_pseudonym, phase, note_text, note_hash, created_at, expires_at)
      VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
      ON CONFLICT DO NOTHING RETURNING id, expires_at`)
      .bind(id, statusTokenHash, claimCodeHash, author, requestedPhase, note, noteHash, now, expiresAt).first();
    if (inserted) {
      return authJson({ handoff: {
        id: inserted.id,
        claimCode,
        statusToken,
        expiresAt: inserted.expires_at,
        publisherURL: publisherURL(request)
      } }, 201);
    }
  }
  throw new CommunityError(503, 'Could not reserve a publication handoff. Retry later.');
}

async function handoffStatus(request, env, id) {
  await limitCommunityIpAction(request, env, 'observation-handoff-status', 60, 900);
  const token = request.headers.get('X-HOS-Observation-Status') || '';
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new CommunityError(401, 'A valid handoff status token is required.');
  const now = Date.now();
  await requireSchema(env.COMMUNITY_DB);
  await cleanupExpiredHandoffs(env.COMMUNITY_DB, now);
  const row = await env.COMMUNITY_DB.prepare(`SELECT h.state,h.expires_at,h.published_observation_id,
      o.id AS observation_id,o.state AS observation_state,o.author,o.created_at,o.changed_at
    FROM community_observation_handoffs h
    LEFT JOIN community_public_observations o ON o.id=h.published_observation_id
    WHERE h.id=? AND h.status_token_hash=?`).bind(id, await digest(token)).first();
  if (!row) throw new CommunityError(404, 'Publication handoff is unavailable.');
  const handoff = { id, state: row.state, expiresAt: row.expires_at };
  if (row.observation_id) {
    handoff.publication = publicationStatusDTO({
      id: row.observation_id,
      state: row.observation_state,
      author: row.author,
      created_at: row.created_at,
      changed_at: row.changed_at
    });
    handoff.publicURL = `${new URL(request.url).origin}/observations?id=${encodeURIComponent(row.observation_id)}`;
  }
  return authJson({ handoff });
}

async function readProfile(request, env, user) {
  await requireSchema(env.COMMUNITY_DB);
  const row = await env.COMMUNITY_DB.prepare('SELECT pseudonym,updated_at FROM community_observation_profiles WHERE owner_id=?').bind(user.id).first();
  return authJson({ profile: profileDTO(row) });
}

async function updateProfile(request, env, user) {
  const data = await body(request, ['pseudonym']);
  const pseudonym = text(data.pseudonym, 'Public pseudonym', 1, 80);
  await requireSchema(env.COMMUNITY_DB);
  await limitCommunityAction(env, user.id, 'observation-profile', 20);
  const now = Date.now();
  const row = await env.COMMUNITY_DB.prepare(`INSERT INTO community_observation_profiles(owner_id,pseudonym,created_at,updated_at)
    VALUES (?,?,?,?)
    ON CONFLICT(owner_id) DO UPDATE SET pseudonym=excluded.pseudonym, updated_at=excluded.updated_at
    RETURNING pseudonym,updated_at`).bind(user.id, pseudonym, now, now).first();
  return authJson({ profile: profileDTO(row) });
}

async function claimHandoff(request, env, user) {
  const data = await body(request, ['claimCode']);
  if (!validClaimCode(data.claimCode)) throw new CommunityError(400, 'Enter the complete one-time claim code.');
  await requireSchema(env.COMMUNITY_DB);
  await limitCommunityAction(env, user.id, 'observation-claim', 20);
  const now = Date.now();
  await cleanupExpiredHandoffs(env.COMMUNITY_DB, now);
  const codeHash = await digest(data.claimCode);
  let row = await env.COMMUNITY_DB.prepare(`UPDATE community_observation_handoffs
    SET owner_id=?, state='claimed', claimed_at=?
    WHERE claim_code_hash=? AND state='pending' AND expires_at>?
    RETURNING id,phase,note_text,suggested_pseudonym,expires_at`)
    .bind(user.id, now, codeHash, now).first();
  if (!row) {
    // The code is one-time for assigning ownership. Retaining only its hash until
    // expiry/publication lets that same owner recover the review screen after a reload.
    row = await env.COMMUNITY_DB.prepare(`SELECT id,phase,note_text,suggested_pseudonym,expires_at
      FROM community_observation_handoffs
      WHERE owner_id=? AND claim_code_hash=? AND state='claimed' AND expires_at>?`)
      .bind(user.id, codeHash, now).first();
  }
  if (!row) throw new CommunityError(409, 'Claim code is expired, unavailable, or belongs to another account.');
  const profile = await env.COMMUNITY_DB.prepare('SELECT pseudonym,updated_at FROM community_observation_profiles WHERE owner_id=?').bind(user.id).first();
  return authJson({ handoff: {
    id: row.id,
    phase: row.phase,
    text: row.note_text,
    suggestedPseudonym: row.suggested_pseudonym,
    expiresAt: row.expires_at,
    profile: profileDTO(profile)
  } });
}

async function publishHandoff(request, env, user, id) {
  const data = await body(request, ['acknowledgement']);
  if (data.acknowledgement !== 'PUBLISH_PUBLIC_OBSERVATION') {
    throw new CommunityError(400, 'Explicit public-observation acknowledgement is required.');
  }
  await requireSchema(env.COMMUNITY_DB);
  const moderators = await moderatorAvailable(env);
  await limitCommunityAction(env, user.id, 'observation-publish', 10);
  const now = Date.now();
  await cleanupExpiredHandoffs(env.COMMUNITY_DB, now);

  const profile = await env.COMMUNITY_DB.prepare('SELECT pseudonym FROM community_observation_profiles WHERE owner_id=?').bind(user.id).first();
  if (!profile) throw new CommunityError(409, 'Set a public profile pseudonym before publishing.');
  const handoff = await env.COMMUNITY_DB.prepare(`SELECT id,phase,note_text,suggested_pseudonym,note_hash,state,expires_at,published_observation_id
    FROM community_observation_handoffs WHERE id=? AND owner_id=?`).bind(id, user.id).first();
  if (!handoff) throw new CommunityError(404, 'Publication handoff not found.');
  if (handoff.state === 'published' && handoff.published_observation_id) {
    const existing = await env.COMMUNITY_DB.prepare(`SELECT ${publicFields} FROM community_public_observations WHERE id=?`).bind(handoff.published_observation_id).first();
    if (existing) return authJson({ observation: publicDTO(existing), reused: true });
  }
  if (handoff.state !== 'claimed' || handoff.expires_at <= now || !handoff.note_text || !handoff.suggested_pseudonym) {
    throw new CommunityError(409, 'Publication handoff expired or is unavailable.');
  }
  const expectedHandoffHash = await sha256({
    schema: 'harshalos-observation-handoff-v1',
    phase: handoff.phase,
    text: handoff.note_text,
    suggestedAuthor: handoff.suggested_pseudonym
  });
  if (expectedHandoffHash !== handoff.note_hash) {
    throw new CommunityError(409, 'Publication handoff integrity check failed. Prepare a new handoff.');
  }

  const idForPublication = crypto.randomUUID();
  const contentHash = await sha256({
    schema: 'harshalos-public-observation-v1',
    reviewStatus: 'UNREVIEWED',
    author: profile.pseudonym,
    phase: handoff.phase,
    text: handoff.note_text
  });
  const inserted = await env.COMMUNITY_DB.prepare(`INSERT INTO community_public_observations
      (id,handoff_id,owner_id,state,author,phase,note_text,content_hash,created_at,changed_at)
      SELECT ?,h.id,h.owner_id,'published',?,h.phase,h.note_text,?,?,?
      FROM community_observation_handoffs h
      JOIN community_users u ON u.id=h.owner_id
      JOIN community_observation_profiles p ON p.owner_id=h.owner_id
      WHERE h.id=? AND h.owner_id=? AND h.state='claimed' AND h.expires_at>? AND h.note_text IS NOT NULL
        AND u.blocked=0 AND p.pseudonym=?
        AND EXISTS (SELECT 1 FROM community_users m
          WHERE m.blocked=0 AND m.oidc_issuer=?
            AND m.oidc_subject IN (SELECT value FROM json_each(?)))
      ON CONFLICT DO NOTHING RETURNING ${publicFields}`)
      .bind(
        idForPublication,
        profile.pseudonym,
        contentHash,
        now,
        now,
        id,
        user.id,
        now,
        profile.pseudonym,
        env.OIDC_ISSUER,
        JSON.stringify(moderators)
      ).first();
  if (!inserted) {
    const existing = await env.COMMUNITY_DB.prepare(`SELECT ${publicFields} FROM community_public_observations
      WHERE handoff_id=? AND owner_id=?`).bind(id, user.id).first();
    if (!existing) throw new CommunityError(409, 'Publication changed or is unavailable. Reload and retry.');
    await env.COMMUNITY_DB.prepare(`UPDATE community_observation_handoffs
      SET state='published', claim_code_hash=NULL, suggested_pseudonym=NULL, phase=NULL, note_text=NULL, note_hash=NULL, published_observation_id=?
      WHERE id=? AND owner_id=? AND state='claimed'`).bind(existing.id, id, user.id).run();
    return authJson({ observation: publicDTO(existing), reused: true });
  }
  await env.COMMUNITY_DB.prepare(`UPDATE community_observation_handoffs
    SET state='published', claim_code_hash=NULL, suggested_pseudonym=NULL, phase=NULL, note_text=NULL, note_hash=NULL, published_observation_id=?
    WHERE id=? AND owner_id=? AND state='claimed'`).bind(inserted.id, id, user.id).run();
  return authJson({ observation: publicDTO(inserted), reused: false }, 201);
}

async function listPublicObservations(request, env) {
  const url = new URL(request.url);
  await allowCommunityPublicRead(request, env);
  await requireSchema(env.COMMUNITY_DB);
  const { results } = await env.COMMUNITY_DB.prepare(`SELECT seq,${publicFields}
    FROM community_public_observations WHERE state='published' AND seq<? ORDER BY seq DESC LIMIT 26`)
    .bind(cursor(url)).all();
  return authJson(observationPage(results));
}

async function readPublicObservation(request, env, id) {
  await allowCommunityPublicRead(request, env);
  await requireSchema(env.COMMUNITY_DB);
  const row = await env.COMMUNITY_DB.prepare(`SELECT ${publicFields} FROM community_public_observations WHERE id=?`).bind(id).first();
  if (!row) throw new CommunityError(404, 'Public observation not found.');
  return authJson({ observation: publicDTO(row) });
}

async function listMyObservations(env, user, request) {
  const url = new URL(request.url);
  await requireSchema(env.COMMUNITY_DB);
  const { results } = await env.COMMUNITY_DB.prepare(`SELECT seq,${publicFields}
    FROM community_public_observations WHERE owner_id=? AND seq<? ORDER BY seq DESC LIMIT 26`)
    .bind(user.id, cursor(url)).all();
  return authJson(observationPage(results));
}

async function withdrawObservation(request, env, user, id) {
  await body(request, []);
  await requireSchema(env.COMMUNITY_DB);
  await limitCommunityAction(env, user.id, 'observation-withdraw', 20);
  const now = Date.now();
  const current = await env.COMMUNITY_DB.prepare(`SELECT ${publicFields} FROM community_public_observations
    WHERE id=? AND owner_id=?`).bind(id, user.id).first();
  if (!current) throw new CommunityError(404, 'Public observation not found.');
  if (current.state === 'published') {
    await env.COMMUNITY_DB.prepare(`UPDATE community_public_observations
      SET state='withdrawn', author=NULL, phase=NULL, note_text=NULL, changed_at=?
      WHERE id=? AND owner_id=? AND state='published'`).bind(now, id, user.id).run();
  }
  const row = await env.COMMUNITY_DB.prepare(`SELECT ${publicFields} FROM community_public_observations WHERE id=?`).bind(id).first();
  return authJson({ observation: publicDTO(row) });
}

async function hideObservation(request, env, user, id) {
  const data = await body(request, ['note'], 4096);
  if (!user.moderator) throw new CommunityError(403, 'Moderator access required.');
  const note = text(data.note, 'Moderation note', 1, 2000, { multiline: true });
  await requireSchema(env.COMMUNITY_DB);
  await limitCommunityAction(env, user.id, 'observation-moderation-hide', 50);
  const current = await env.COMMUNITY_DB.prepare(`SELECT ${publicFields} FROM community_public_observations WHERE id=?`).bind(id).first();
  if (!current) throw new CommunityError(404, 'Public observation not found.');
  if (current.state === 'hidden') return authJson({ observation: publicDTO(current), reused: true });
  if (current.state !== 'published') throw new CommunityError(409, 'Only an active public observation can be hidden.');

  const now = Date.now();
  await env.COMMUNITY_DB.batch([
    env.COMMUNITY_DB.prepare(`UPDATE community_public_observations
      SET state='hidden', author=NULL, phase=NULL, note_text=NULL, changed_at=?
      WHERE id=? AND state='published'`).bind(now, id),
    // `changes()` gates the audit insert on this batch's immediately preceding
    // state transition, so a concurrent withdrawal does not create a phantom hide record.
    env.COMMUNITY_DB.prepare(`INSERT INTO community_public_observation_moderation_actions
      (id,observation_id,moderator_id,action,note,created_at)
      SELECT ?,?,?, 'hide', ?,? WHERE changes()=1`)
      .bind(crypto.randomUUID(), id, user.id, note, now)
  ]);
  const row = await env.COMMUNITY_DB.prepare(`SELECT ${publicFields} FROM community_public_observations WHERE id=?`).bind(id).first();
  if (!row || row.state !== 'hidden') throw new CommunityError(409, 'Observation changed before moderation could complete.');
  return authJson({ observation: publicDTO(row) });
}

export async function handleCommunityObservations(request, env) {
  try {
    const url = new URL(request.url);
    const { pathname: path } = url;
    const { method } = request;
    const observation = observationMatch.exec(path);
    const handoff = handoffMatch.exec(path);

    if (path === handoffPath && method === 'POST') return await createHandoff(request, env);
    if (handoff && method === 'GET' && !handoff[2]) return await handoffStatus(request, env, handoff[1]);
    if (path === '/api/community/observations' && method === 'GET') return await listPublicObservations(request, env);
    if (observation && method === 'GET' && !observation[2]) return await readPublicObservation(request, env, observation[1]);

    const user = await authorizeCommunity(request, env, { write: method !== 'GET' });
    if (path === profilePath && method === 'GET') return await readProfile(request, env, user);
    if (path === profilePath && method === 'PUT') return await updateProfile(request, env, user);
    if (path === claimPath && method === 'POST') return await claimHandoff(request, env, user);
    if (handoff && method === 'POST' && handoff[2] === 'publish') return await publishHandoff(request, env, user, handoff[1]);
    if (path === '/api/community/my-observations' && method === 'GET') return await listMyObservations(env, user, request);
    if (observation && method === 'POST' && observation[2] === 'withdraw') return await withdrawObservation(request, env, user, observation[1]);
    if (observation && method === 'POST' && observation[2] === 'hide') return await hideObservation(request, env, user, observation[1]);

    throw new CommunityError(405, 'Method or public-observation route not supported.');
  } catch (error) {
    return authJson(
      { error: error instanceof CommunityError ? error.message : 'Public observation service unavailable. No private handoff details are exposed.' },
      error instanceof CommunityError ? error.status : 503
    );
  }
}
