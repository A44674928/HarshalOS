import { handlePublication } from './community-publication.mjs';
import { handleRuns } from './community-runs.mjs';
import { handleDrafts } from './community-drafts.mjs';
import { handleCommunityAuth } from './community-auth.mjs';
// All community access is opt-in; public data only comes from explicit publication.
export function handleCommunity(request, env, dependencies = {}) {
  const path = new URL(request.url).pathname;
  if (env.COMMUNITY_ENABLED === 'true' && env.COMMUNITY_DB && (path === '/api/community/me' || path.startsWith('/api/community/auth/'))) return handleCommunityAuth(request, env);
  if (/^\/api\/community\/(?:status|publications|public-log|public-preview|publish|my-publications|moderation)(?:\/|$)/.test(path)) return handlePublication(request, env, dependencies);
  if (path === '/api/community/audit-template' || /^\/api\/community\/drafts\/[^/]+\/runs(?:\/.*)?$/.test(path)) return handleRuns(request, env);
  if (path === '/api/community/drafts' || path.startsWith('/api/community/drafts/')) return handleDrafts(request, env);
  const code = env.COMMUNITY_ENABLED !== 'true' ? 'COMMUNITY_DISABLED'
    : !env.COMMUNITY_DB ? 'COMMUNITY_DATABASE_NOT_BOUND' : 'COMMUNITY_IMPLEMENTATION_INCOMPLETE';
  return Response.json({ ready: false, stage: 'publication', code,
    error: 'Community is disabled or this endpoint is unavailable.' }, {
    status: 503, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}
