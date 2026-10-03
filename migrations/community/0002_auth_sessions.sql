-- Additive authentication state. No passwords, access tokens or ID tokens stored.
CREATE TABLE community_auth_flows (
  state_hash TEXT PRIMARY KEY NOT NULL,
  browser_hash TEXT NOT NULL,
  nonce_hash TEXT NOT NULL,
  verifier TEXT NOT NULL,
  issuer TEXT NOT NULL,
  client_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX community_auth_flows_expiry ON community_auth_flows(expires_at);
CREATE INDEX community_auth_flows_browser ON community_auth_flows(browser_hash);
CREATE TABLE community_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
  issuer TEXT NOT NULL,
  client_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK (expires_at > created_at)
);
CREATE INDEX community_sessions_expiry ON community_sessions(expires_at);
CREATE INDEX community_sessions_user ON community_sessions(user_id);
CREATE TABLE community_auth_rates (
  bucket TEXT PRIMARY KEY NOT NULL,
  hits INTEGER NOT NULL CHECK (hits >= 1),
  expires_at INTEGER NOT NULL
);
CREATE INDEX community_auth_rates_expiry ON community_auth_rates(expires_at);
INSERT INTO community_schema VALUES ('authentication', 1);
