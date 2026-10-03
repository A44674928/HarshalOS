import { handleCommunityAuth } from './community-auth.mjs';
// Auth is opt-in. Draft/publication HTTP access remains closed.
export function handleCommunity(request, env) {
  const path = new URL(request.url).pathname;
  if (env.COMMUNITY_ENABLED === 'true' && env.COMMUNITY_DB && (path === '/api/community/me' || path.startsWith('/api/community/auth/'))) return handleCommunityAuth(request, env);
  const code = env.COMMUNITY_ENABLED !== 'true' ? 'COMMUNITY_DISABLED'
    : !env.COMMUNITY_DB ? 'COMMUNITY_DATABASE_NOT_BOUND' : 'COMMUNITY_IMPLEMENTATION_INCOMPLETE';
  return Response.json({ ready: false, stage: 'authentication', code,
    error: 'Community draft editing and public audit publication are not available yet.' }, {
    status: 503, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}
