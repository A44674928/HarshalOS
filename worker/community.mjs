// Stage 1 is database-only. Even an accidentally enabled flag cannot expose data.
export function handleCommunity(request, env) {
  const code = env.COMMUNITY_ENABLED !== 'true' ? 'COMMUNITY_DISABLED'
    : !env.COMMUNITY_DB ? 'COMMUNITY_DATABASE_NOT_BOUND' : 'COMMUNITY_IMPLEMENTATION_INCOMPLETE';
  return Response.json({ ready: false, stage: 'database-foundation', code,
    error: 'Community accounts and public audit publication are not available yet.' }, {
    status: 503, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}
