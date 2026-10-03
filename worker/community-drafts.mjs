import { authorizeCommunity, authJson } from './community-auth.mjs';
import { CommunityError, createDraft, getDraft, updateDraft, deleteDraft, listDrafts } from './community-db.mjs';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
async function body(request) {
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new CommunityError(415, 'Send application/json.');
  const reader = request.body?.getReader();
  if (!reader) throw new CommunityError(400, 'Missing draft.');
  const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 98304) { await reader.cancel(); throw new CommunityError(413, 'Request exceeds 96 KiB.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let data;
  try { data = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new CommunityError(400, 'Invalid JSON.'); }
  if (!data || Array.isArray(data) || typeof data !== 'object' || Object.keys(data).some(k => !['title', 'input', 'privateNotes', 'revision'].includes(k))) throw new CommunityError(400, 'Send only title, input, privateNotes and revision.');
  return data;
}
export async function handleDrafts(request, env) {
  try {
    const user = await authorizeCommunity(request, env, { write: request.method !== 'GET' });
    const url = new URL(request.url);
    const base = url.pathname === '/api/community/drafts';
    const id = url.pathname.slice('/api/community/drafts/'.length);
    if (!base && !uuid.test(id)) throw new CommunityError(404, 'Draft not found.');
    const allowed = base ? ['GET', 'POST'] : ['GET', 'PUT', 'DELETE'];
    if (!allowed.includes(request.method)) return authJson({ error: 'Method not allowed.' }, 405, { Allow: allowed.join(', ') });
    if (request.method === 'GET') {
      if (!base) return authJson({ draft: await getDraft(env.COMMUNITY_DB, user.id, id) });
      const after = url.searchParams.get('after') || '';
      if (after && !uuid.test(after)) throw new CommunityError(400, 'Invalid draft cursor.');
      return authJson(await listDrafts(env.COMMUNITY_DB, user.id, after));
    }
    if (request.method === 'DELETE') {
      const data = await body(request);
      const keys = Object.keys(data);
      if (keys.length !== 1 || keys[0] !== 'revision' || !Number.isSafeInteger(data.revision) || data.revision < 1) throw new CommunityError(400, 'Send only a positive integer revision to delete.');
      return authJson(await deleteDraft(env.COMMUNITY_DB, user.id, id, data.revision));
    }
    const data = await body(request);
    if (base && data.revision !== undefined) throw new CommunityError(400, 'New drafts cannot specify a revision.');
    const draft = base ? await createDraft(env.COMMUNITY_DB, user.id, data)
      : await updateDraft(env.COMMUNITY_DB, user.id, id, data.revision, data);
    return authJson({ draft }, base ? 201 : 200);
  } catch (error) {
    return authJson({ error: error instanceof CommunityError ? error.message : 'Draft storage unavailable. Keep a local export and retry later.' }, error instanceof CommunityError ? error.status : 503);
  }
}
