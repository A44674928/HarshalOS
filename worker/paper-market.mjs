import {
  authorizeCommunity,
  authJson,
  digest,
  limitCommunityAction,
  limitCommunityIpAction
} from './community-auth.mjs';
import { CommunityError } from './community-db.mjs';
import { readOrb2FieldSnapshot } from './orb2-field.mjs';

// The paper market is an account-scoped simulation ledger. It is deliberately
// not a trading, brokerage, custody, wallet, payment, mining, or provider-proxy
// surface. Provider access remains inside the scheduled Orb 2 server field.
export const PAPER_MARKET_BASE_PATH = '/api/community/paper-market/v1';
export const PAPER_MARKET_SCHEMA = 'harshal-paper-market-mobile-snapshot-v1';
export const PAPER_MARKET_MODE = 'PAPER_TEST';

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const UUID_RE = new RegExp(`^${UUID}$`, 'i');
const pairingPath = new RegExp(`^${PAPER_MARKET_BASE_PATH}/device-pairings/(${UUID})$`, 'i');
const redeemPath = new RegExp(`^${PAPER_MARKET_BASE_PATH}/device-pairings/(${UUID})/redeem$`, 'i');
const revokeDevicePath = new RegExp(`^${PAPER_MARKET_BASE_PATH}/devices/(${UUID})/revoke$`, 'i');
const closePositionPath = new RegExp(`^${PAPER_MARKET_BASE_PATH}/positions/(${UUID})/close$`, 'i');
const withdrawPositionPath = new RegExp(`^${PAPER_MARKET_BASE_PATH}/positions/(${UUID})/withdraw$`, 'i');

const pairingLifetimeMilliseconds = 15 * 60 * 1000;
const deviceTokenLifetimeMilliseconds = 30 * 24 * 60 * 60 * 1000;
const quoteLifetimeMilliseconds = 5 * 60 * 1000;
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
const idempotencyPattern = /^[A-Za-z0-9._~-]{16,128}$/;
const pairingCodePattern = /^[A-Z2-9]{4}(?:-[A-Z2-9]{4}){3}$/;
const phases = new Set(['NAB', 'CWO', 'GSRB']);
const directions = new Set(['HIGHER', 'LOWER', 'NEUTRAL']);
const sides = new Set(['LONG', 'SHORT']);
const assetClassByDisc = Object.freeze({
  stocks: 'EQUITY',
  indices: 'INDEX',
  fx: 'FOREIGN_EXCHANGE',
  commodities: 'COMMODITY',
  crypto: 'DIGITAL_ASSET'
});
const paperAssetClasses = new Set(['EQUITY', 'INDEX', 'FOREIGN_EXCHANGE', 'COMMODITY']);
const codeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const encoder = new TextEncoder();

function randomToken() {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
    .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function randomCode() {
  let code = '';
  for (let index = 0; index < 16; index += 1) {
    if (index && index % 4 === 0) code += '-';
    code += codeAlphabet[crypto.getRandomValues(new Uint8Array(1))[0] % codeAlphabet.length];
  }
  return code;
}

function nowMilliseconds(dependencies = {}) {
  const candidate = typeof dependencies.now === 'function' ? dependencies.now() : dependencies.now;
  return Number.isSafeInteger(candidate) && candidate >= 0 ? candidate : Date.now();
}

function boundedText(value, field, minimum, maximum, { multiline = false } = {}) {
  if (typeof value !== 'string') throw new CommunityError(400, `${field} must be text.`);
  const normalized = value.trim();
  if (normalized.length < minimum || normalized.length > maximum || /\u0000/.test(normalized)
    || (!multiline && /[\r\n]/.test(normalized))) {
    throw new CommunityError(400, `${field} must contain ${minimum}–${maximum} supported characters.`);
  }
  return normalized;
}

function boundedOptionalText(value, maximum) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/[\u0000\r\n]/g, '').slice(0, maximum);
}

function safeInteger(value, field, minimum, maximum) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new CommunityError(400, `${field} is invalid.`);
  }
  return value;
}

function decimalText(value, field) {
  if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]{0,17})(?:\.[0-9]{1,12})?$/.test(value)) {
    throw new CommunityError(400, `${field} must be a positive decimal with at most 12 fractional places.`);
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 1e15) {
    throw new CommunityError(400, `${field} is outside the supported PAPER_TEST range.`);
  }
  return value;
}

function formattedDecimal(value) {
  if (!Number.isFinite(value) || value <= 0 || value > 1e15) return null;
  return value.toFixed(12).replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
}

function requiredIdempotencyKey(request) {
  const value = request.headers.get('Idempotency-Key') || '';
  if (!idempotencyPattern.test(value)) {
    throw new CommunityError(400, 'Provide an Idempotency-Key of 16–128 URL-safe characters for every PAPER_TEST write.');
  }
  return value;
}

async function jsonBody(request, keys, maximum = 8192) {
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new CommunityError(415, 'Send application/json.');
  }
  const reader = request.body?.getReader();
  if (!reader) throw new CommunityError(400, 'Missing JSON body.');
  const decoder = new TextDecoder();
  let source = '';
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maximum) {
      await reader.cancel();
      throw new CommunityError(413, 'PAPER_TEST request body is too large.');
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
    throw new CommunityError(400, 'Unexpected PAPER_TEST request fields.');
  }
  return value;
}

function exactConfiguredOrigin(request, env) {
  if (env.COMMUNITY_ENABLED !== 'true') throw new CommunityError(503, 'Community is disabled.');
  if (!env.COMMUNITY_DB || typeof env.COMMUNITY_DB.prepare !== 'function'
    || typeof env.COMMUNITY_RATE_SECRET !== 'string' || env.COMMUNITY_RATE_SECRET.length < 32) {
    throw new CommunityError(503, 'Community authentication is not configured.');
  }
  let origin;
  try { origin = new URL(env.COMMUNITY_ORIGIN); } catch { throw new CommunityError(503, 'Invalid Community origin configuration.'); }
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash
    || env.COMMUNITY_ORIGIN !== origin.origin || new URL(request.url).origin !== origin.origin) {
    throw new CommunityError(403, 'Community origin mismatch.');
  }
  return origin.origin;
}

async function requirePaperSchema(db) {
  try {
    const schema = await db.prepare("SELECT version FROM community_schema WHERE component='paper-market'").first();
    if (schema?.version !== 1) throw new CommunityError(503, 'PAPER_TEST market migration is required.');
  } catch (error) {
    if (error instanceof CommunityError) throw error;
    throw new CommunityError(503, 'PAPER_TEST market database is unavailable.');
  }
}

async function authorizeDevice(request, env, now) {
  exactConfiguredOrigin(request, env);
  await requirePaperSchema(env.COMMUNITY_DB);
  const authorization = request.headers.get('Authorization') || '';
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization);
  if (!match) throw new CommunityError(401, 'A scoped PAPER_TEST device credential is required.');
  const row = await env.COMMUNITY_DB.prepare(`SELECT t.id, t.owner_id, t.scope, t.expires_at, t.revoked_at
    FROM paper_market_device_tokens t JOIN community_users u ON u.id=t.owner_id
    WHERE t.token_hash=? AND t.expires_at>? AND t.revoked_at IS NULL AND t.scope='PAPER_TEST' AND u.blocked=0`)
    .bind(await digest(match[1]), now).first();
  if (!row) throw new CommunityError(401, 'PAPER_TEST device credential is expired, revoked, or unavailable.');
  await env.COMMUNITY_DB.prepare('UPDATE paper_market_device_tokens SET last_used_at=MAX(COALESCE(last_used_at, 0), ?) WHERE id=? AND revoked_at IS NULL')
    .bind(now, row.id).run();
  return { type: 'device', ownerID: row.owner_id, deviceID: row.id, scope: row.scope };
}

async function authorizeActor(request, env, { write = false, now }) {
  const authorization = request.headers.get('Authorization');
  if (authorization !== null) {
    const actor = await authorizeDevice(request, env, now);
    await limitCommunityAction(env, actor.ownerID, write ? 'paper-device-write' : 'paper-device-read', write ? 500 : 5000);
    return actor;
  }
  const user = await authorizeCommunity(request, env, { write, now: Math.floor(now / 1000) });
  await requirePaperSchema(env.COMMUNITY_DB);
  await limitCommunityAction(env, user.id, write ? 'paper-browser-write' : 'paper-browser-read', write ? 500 : 5000);
  return { type: 'browser', ownerID: user.id };
}

async function authorizeBrowser(request, env, { write = false, now }) {
  if (request.headers.get('Authorization') !== null) throw new CommunityError(403, 'This action requires the signed-in HarshalOS browser session.');
  const user = await authorizeCommunity(request, env, { write, now: Math.floor(now / 1000) });
  await requirePaperSchema(env.COMMUNITY_DB);
  await limitCommunityAction(env, user.id, write ? 'paper-browser-write' : 'paper-browser-read', write ? 500 : 5000);
  return { type: 'browser', ownerID: user.id };
}

async function cleanupPairings(db, now) {
  // Expired pairing capabilities are redacted in bounded batches. Device tokens
  // are never silently refreshed; their expiry is checked at authorization time.
  await db.prepare(`UPDATE paper_market_device_pairings
    SET state='expired', pairing_code_hash=NULL, poll_token_hash=NULL
    WHERE id IN (
      SELECT id FROM paper_market_device_pairings
      WHERE state IN ('pending', 'approved') AND expires_at<=?
      ORDER BY expires_at LIMIT 100
    )`).bind(now).run();
}

function pairingDTO(row, { includeRedeem = false, now = Date.now() } = {}) {
  return {
    id: row.id,
    state: row.state,
    deviceLabel: row.device_label,
    expiresAt: row.expires_at,
    canRedeem: includeRedeem && row.state === 'approved' && row.expires_at > now
  };
}

function quoteDTO(row) {
  return {
    id: row.id,
    instrumentID: row.instrument_id,
    symbol: row.symbol,
    displayName: row.display_name,
    assetClass: row.asset_class,
    venue: row.venue,
    quoteCurrency: row.quote_currency,
    price: row.price_text,
    availability: row.availability,
    provenance: {
      provider: row.provider,
      sourceLabel: row.source_label,
      interval: row.interval,
      freshness: row.freshness,
      observedAt: row.observed_at,
      retrievedAt: row.retrieved_at
    },
    expiresAt: row.expires_at
  };
}

function declarationDTO(row) {
  return {
    id: row.id,
    phase: row.phase,
    instrumentID: row.instrument_id,
    direction: row.direction,
    thesis: row.thesis,
    targetAt: row.target_at,
    createdAt: row.created_at
  };
}

function positionDTO(row) {
  const dto = {
    id: row.id,
    declarationID: row.declaration_id,
    phase: row.phase,
    instrumentID: row.instrument_id,
    side: row.side,
    quantity: row.quantity_text,
    state: row.state,
    openedAt: row.opened_at,
    closedAt: row.closed_at ?? null,
    entryQuote: quoteDTO({
      id: row.entry_snapshot_id,
      instrument_id: row.instrument_id,
      symbol: row.entry_symbol,
      display_name: row.entry_display_name,
      asset_class: row.entry_asset_class,
      venue: row.entry_venue,
      quote_currency: row.entry_quote_currency,
      price_text: row.entry_price_text,
      availability: 'AVAILABLE',
      provider: row.entry_provider,
      source_label: row.entry_source_label,
      interval: row.entry_interval,
      freshness: row.entry_freshness,
      observed_at: row.entry_observed_at,
      retrieved_at: row.entry_retrieved_at,
      expires_at: row.entry_expires_at
    })
  };
  if (row.exit_snapshot_id) {
    dto.exitQuote = quoteDTO({
      id: row.exit_snapshot_id,
      instrument_id: row.instrument_id,
      symbol: row.exit_symbol,
      display_name: row.exit_display_name,
      asset_class: row.exit_asset_class,
      venue: row.exit_venue,
      quote_currency: row.exit_quote_currency,
      price_text: row.exit_price_text,
      availability: 'AVAILABLE',
      provider: row.exit_provider,
      source_label: row.exit_source_label,
      interval: row.exit_interval,
      freshness: row.exit_freshness,
      observed_at: row.exit_observed_at,
      retrieved_at: row.exit_retrieved_at,
      expires_at: row.exit_expires_at
    });
  }
  return dto;
}

const positionSelect = `SELECT p.*,
  e.symbol AS entry_symbol, e.display_name AS entry_display_name, e.asset_class AS entry_asset_class,
  e.venue AS entry_venue, e.quote_currency AS entry_quote_currency, e.price_text AS entry_price_text,
  e.provider AS entry_provider, e.source_label AS entry_source_label, e.interval AS entry_interval, e.freshness AS entry_freshness,
  e.observed_at AS entry_observed_at, e.retrieved_at AS entry_retrieved_at, e.expires_at AS entry_expires_at,
  x.symbol AS exit_symbol, x.display_name AS exit_display_name, x.asset_class AS exit_asset_class,
  x.venue AS exit_venue, x.quote_currency AS exit_quote_currency, x.price_text AS exit_price_text,
  x.provider AS exit_provider, x.source_label AS exit_source_label, x.interval AS exit_interval, x.freshness AS exit_freshness,
  x.observed_at AS exit_observed_at, x.retrieved_at AS exit_retrieved_at, x.expires_at AS exit_expires_at
  FROM paper_market_positions p
  JOIN paper_market_quote_snapshots e ON e.id=p.entry_snapshot_id
  LEFT JOIN paper_market_quote_snapshots x ON x.id=p.exit_snapshot_id`;

async function readPositions(db, ownerID) {
  // Mobile-safe snapshots are bounded. The retained append-only D1 history is
  // not discarded; a future explicitly paginated history route can expose older
  // records without making an ordinary native snapshot unbounded.
  const { results } = await db.prepare(`${positionSelect} WHERE p.owner_id=? ORDER BY p.opened_at DESC, p.id DESC LIMIT 500`).bind(ownerID).all();
  return results.map(positionDTO);
}

async function readPosition(db, ownerID, id) {
  return db.prepare(`${positionSelect} WHERE p.owner_id=? AND p.id=?`).bind(ownerID, id).first();
}

async function readLedger(db, ownerID) {
  const [declarations, positions, events] = await Promise.all([
    db.prepare('SELECT * FROM paper_market_declarations WHERE owner_id=? ORDER BY created_at DESC, id DESC LIMIT 250').bind(ownerID).all(),
    readPositions(db, ownerID),
    db.prepare(`SELECT seq, id, kind, declaration_id, position_id, quote_snapshot_id, detail, created_at
      FROM paper_market_events WHERE owner_id=? ORDER BY seq DESC LIMIT 500`).bind(ownerID).all()
  ]);
  return {
    declarations: declarations.results.map(declarationDTO),
    positions,
    events: events.results.map(row => ({
      sequence: row.seq,
      id: row.id,
      kind: row.kind,
      declarationID: row.declaration_id ?? null,
      positionID: row.position_id ?? null,
      quoteSnapshotID: row.quote_snapshot_id ?? null,
      detail: row.detail,
      createdAt: row.created_at
    }))
  };
}

function quoteCurrencyFor(symbol) {
  const suffix = String(symbol).split(/[\/-]/).at(-1)?.toUpperCase() || '';
  return /^[A-Z]{3}$/.test(suffix) ? suffix : 'USD';
}

function availabilityForObservation(observation) {
  const close = Number(observation?.market?.latestBar?.close);
  const freshness = typeof observation?.freshness === 'string'
    ? observation.freshness.toLowerCase()
    : String(observation?.freshness?.state || observation?.freshness?.status || '').toLowerCase();
  if (freshness.includes('stale') || observation?.status === 'held') return 'HELD';
  if (observation?.status === 'bars' && observation?.confirmed === true && Number.isFinite(close) && close > 0) return 'AVAILABLE';
  return 'UNAVAILABLE';
}

function scoreForObservation(observation) {
  const composition = Number(observation?.composition?.score);
  if (Number.isFinite(composition)) return Math.max(-1, Math.min(1, composition));
  const change = Number(observation?.market?.changePct);
  return Number.isFinite(change) ? Math.tanh(change / 5) : 0;
}

function fieldInstrument(observation) {
  const assetClass = assetClassByDisc[String(observation?.discId || '').toLowerCase()];
  const symbol = String(observation?.symbol || '').trim().toUpperCase();
  const provider = String(observation?.provider || '').trim().toUpperCase();
  const displayName = boundedOptionalText(observation?.name || observation?.displaySymbol || symbol, 120) || symbol;
  if (!assetClass || !/^[A-Z0-9./-]{1,32}$/.test(symbol) || !/^[A-Z0-9./-]{1,48}$/.test(provider)) return null;
  const price = formattedDecimal(Number(observation?.market?.latestBar?.close));
  const availability = availabilityForObservation(observation);
  const observedAt = Number.isSafeInteger(observation?.observedAt) ? observation.observedAt : null;
  if (!observedAt) return null;
  const interval = boundedOptionalText(observation?.interval, 24) || '1d';
  const quoteCurrency = quoteCurrencyFor(symbol);
  const id = `${assetClass}:${provider}:${symbol}`;
  return {
    id,
    symbol,
    displayName,
    assetClass,
    venue: provider,
    quoteCurrency,
    price: availability === 'UNAVAILABLE' ? null : price,
    availability,
    paperEligible: paperAssetClasses.has(assetClass),
    displayOnly: assetClass === 'DIGITAL_ASSET',
    source: {
      provider: provider.toLowerCase(),
      sourceLabel: `Orb 2 server field · ${provider.toLowerCase()} · ${interval}`,
      interval,
      observedAt,
      freshness: boundedOptionalText(typeof observation?.freshness === 'string' ? observation.freshness : observation?.freshness?.state, 32) || 'unspecified'
    },
    score: scoreForObservation(observation)
  };
}

async function fieldCatalog(env, dependencies, now) {
  let field;
  try {
    field = dependencies.fieldSnapshot
      ? await dependencies.fieldSnapshot({ env, now })
      : await readOrb2FieldSnapshot(env, { now, interval: '1d' });
  } catch {
    throw new CommunityError(503, 'The server-managed Orb 2 field is unavailable. No market value has been fabricated.');
  }
  if (!field || field.ok === false || !Array.isArray(field.observations)) {
    const message = boundedOptionalText(field?.message, 160) || 'The server-managed Orb 2 field is unavailable. No market value has been fabricated.';
    throw new CommunityError(503, message);
  }
  const byID = new Map();
  for (const raw of field.observations) {
    const instrument = fieldInstrument(raw);
    if (!instrument) continue;
    const previous = byID.get(instrument.id);
    if (!previous || instrument.source.observedAt > previous.source.observedAt) byID.set(instrument.id, instrument);
  }
  const instruments = [...byID.values()].sort((left, right) => left.id.localeCompare(right.id));
  return {
    fieldGeneratedAt: Number.isSafeInteger(field.generatedAt) ? field.generatedAt : now,
    instruments,
    sourceAvailability: 'AVAILABLE',
    sourceMessage: 'Server-managed Orb 2 field. It is observational only and never a trading instruction.'
  };
}

function catalogDTO(catalog, generatedAt) {
  return {
    schema: 'harshal-paper-market-catalog-v1',
    mode: PAPER_MARKET_MODE,
    generatedAt,
    sourceAvailability: catalog.sourceAvailability,
    sourceMessage: catalog.sourceMessage,
    instruments: catalog.instruments.map(instrument => ({
      id: instrument.id,
      symbol: instrument.symbol,
      displayName: instrument.displayName,
      assetClass: instrument.assetClass,
      venue: instrument.venue,
      quoteCurrency: instrument.quoteCurrency,
      price: instrument.price,
      availability: instrument.availability,
      paperEligible: instrument.paperEligible,
      displayOnly: instrument.displayOnly,
      source: instrument.source
    })),
    boundary: 'PAPER_TEST only. Quotes are server-observed references, not an order, recommendation, custody, wallet, payment, or provider API entitlement.'
  };
}

function currentInstrument(catalog, id, { paperOnly = false } = {}) {
  if (typeof id !== 'string' || id.length > 128) throw new CommunityError(400, 'Choose a reviewed market instrument.');
  const instrument = catalog.instruments.find(candidate => candidate.id === id);
  if (!instrument) throw new CommunityError(409, 'That reviewed instrument is unavailable in the current server field.');
  if (paperOnly && !instrument.paperEligible) {
    throw new CommunityError(409, 'This surface is display-only. Digital-asset observations are not PAPER_TEST instruments.');
  }
  return instrument;
}

async function requireOwnerCapacity(db, ownerID, table, maximum, label) {
  const row = await db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE owner_id=?`).bind(ownerID).first();
  if (!Number.isSafeInteger(Number(row?.count)) || Number(row.count) >= maximum) {
    throw new CommunityError(409, `This account reached its retained PAPER_TEST ${label} limit. Existing paper history remains readable; no new record was created.`);
  }
}

async function insertQuoteSnapshot(db, ownerID, instrument, idempotencyKey, now) {
  if (instrument.availability !== 'AVAILABLE' || !instrument.price) {
    throw new CommunityError(409, 'The current server field has no available confirmed quote for this PAPER_TEST action.');
  }
  const existing = await db.prepare('SELECT * FROM paper_market_quote_snapshots WHERE owner_id=? AND idempotency_key=?')
    .bind(ownerID, idempotencyKey).first();
  if (existing) {
    if (existing.instrument_id !== instrument.id) {
      throw new CommunityError(409, 'This Idempotency-Key was already used for a different PAPER_TEST quote request.');
    }
    return { quote: existing, replayed: true };
  }
  await requireOwnerCapacity(db, ownerID, 'paper_market_quote_snapshots', 5000, 'quote snapshot');
  const id = crypto.randomUUID();
  try {
    await db.prepare(`INSERT INTO paper_market_quote_snapshots
      (id, owner_id, instrument_id, symbol, display_name, asset_class, venue, quote_currency, price_text,
        provider, source_label, interval, freshness, observed_at, retrieved_at, expires_at, availability, idempotency_key)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(id, ownerID, instrument.id, instrument.symbol, instrument.displayName, instrument.assetClass,
        instrument.venue, instrument.quoteCurrency, instrument.price, instrument.source.provider,
        instrument.source.sourceLabel, instrument.source.interval, instrument.source.freshness, instrument.source.observedAt, now,
        now + quoteLifetimeMilliseconds, 'AVAILABLE', idempotencyKey).run();
  } catch {
    const replay = await db.prepare('SELECT * FROM paper_market_quote_snapshots WHERE owner_id=? AND idempotency_key=?')
      .bind(ownerID, idempotencyKey).first();
    if (replay && replay.instrument_id === instrument.id) return { quote: replay, replayed: true };
    if (replay) throw new CommunityError(409, 'This Idempotency-Key was already used for a different PAPER_TEST quote request.');
    throw new CommunityError(503, 'The server could not retain the PAPER_TEST quote reference.');
  }
  const row = await db.prepare('SELECT * FROM paper_market_quote_snapshots WHERE id=? AND owner_id=?').bind(id, ownerID).first();
  if (!row) throw new CommunityError(503, 'The server could not retain the PAPER_TEST quote reference.');
  return { quote: row, replayed: false };
}

function positionValuation(position, instrumentByID) {
  const entry = Number(position.entryQuote.price);
  const quantity = Number(position.quantity);
  const finalQuote = position.exitQuote;
  let mark = null;
  let valuationState = 'UNAVAILABLE';
  if (position.state === 'CLOSED' && finalQuote) {
    mark = Number(finalQuote.price);
    valuationState = 'FINAL';
  } else if (position.state === 'WITHDRAWN') {
    valuationState = 'WITHDRAWN';
  } else {
    const current = instrumentByID.get(position.instrumentID);
    if (current?.availability === 'AVAILABLE' && current.price) {
      mark = Number(current.price);
      valuationState = 'CURRENT';
    } else if (current?.availability === 'HELD') {
      valuationState = 'HELD';
    }
  }
  let profitLoss = null;
  if (Number.isFinite(entry) && Number.isFinite(quantity) && Number.isFinite(mark)) {
    const calculated = (position.side === 'SHORT' ? entry - mark : mark - entry) * quantity;
    profitLoss = Number.isFinite(calculated) && Math.abs(calculated) <= 1e18
      ? calculated.toFixed(8).replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1') : null;
  }
  return {
    positionID: position.id,
    state: position.state,
    valuationState,
    mark: mark === null ? null : formattedDecimal(mark),
    quoteCurrency: position.entryQuote.quoteCurrency,
    profitLoss,
    source: mark === null ? null : (position.state === 'CLOSED' ? position.exitQuote.provenance : instrumentByID.get(position.instrumentID)?.source ?? null)
  };
}

function fnv32(value) {
  let hash = 0x811c9dc5;
  for (const byte of encoder.encode(value)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const rounded = value => Number(Number(value).toFixed(6));

function orbPosition(radius, longitude, latitude, formation, axes) {
  const disc = { x: radius * Math.cos(longitude), y: 0, z: radius * Math.sin(longitude) };
  const sphere = {
    x: radius * Math.cos(latitude) * Math.cos(longitude),
    y: radius * Math.sin(latitude),
    z: radius * Math.cos(latitude) * Math.sin(longitude)
  };
  const axis = {
    x: 1 + (axes.x - 1) * formation,
    y: 1 + (axes.y - 1) * formation,
    z: 1 + (axes.z - 1) * formation
  };
  return {
    x: (disc.x + (sphere.x - disc.x) * formation) * axis.x,
    y: (disc.y + (sphere.y - disc.y) * formation) * axis.y,
    z: (disc.z + (sphere.z - disc.z) * formation) * axis.z
  };
}

function chordDistance(left, right) {
  const x = left.x - right.x, y = left.y - right.y, z = left.z - right.z;
  return Math.sqrt(x * x + y * y + z * z);
}

// Server-side rendering directive. It adopts NEO ORB's logarithmic radial
// bands and disc-to-spheroid interpolation, but emits coordinates rather than
// asking a mobile client to derive market placement from raw provider data.
function makeOrb(catalog, positions) {
  const all = catalog.instruments;
  const available = all.filter(item => item.availability === 'AVAILABLE');
  const scores = available.map(item => item.score).filter(Number.isFinite);
  const average = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  const variance = scores.length ? scores.reduce((sum, score) => sum + (score - average) ** 2, 0) / scores.length : 0;
  const dispersion = Math.sqrt(variance);
  const formation = clamp(all.length ? available.length / all.length : 0, 0, 1);
  const axes = {
    x: rounded(clamp(1 + average * 0.16, 0.75, 1.25)),
    y: rounded(clamp(1 - dispersion * 0.18, 0.75, 1.25)),
    z: rounded(clamp(1 - average * 0.12, 0.75, 1.25))
  };
  const positionByInstrument = new Map(positions.filter(item => item.state === 'OPEN').map(item => [item.instrumentID, item]));
  const ordered = [...all].sort((left, right) => left.id.localeCompare(right.id));
  const maximumBandRadius = 0.44 * Math.pow(1.45, 5);
  const prepared = ordered.map((instrument, index) => {
    const sector = fnv32(instrument.id) % 360;
    const depth = clamp(0.5 + instrument.score / 2, 0, 1);
    const radialBand = clamp(Math.round(depth * 5), 0, 5);
    const radialBandRadius = 0.44 * Math.pow(1.45, radialBand);
    const radius = (0.24 + 0.76 * (radialBandRadius / maximumBandRadius)) * (0.88 + 0.12 * depth);
    const longitude = (sector / 360) * (2 * Math.PI) - Math.PI / 2;
    const latitude = Math.asin(clamp(1 - 2 * ((index + 0.5) / Math.max(1, ordered.length)), -1, 1)) * 0.62;
    return { instrument, sector, depth, radialBand, radialBandRadius, radius, sourceLongitude: longitude, sourceLatitude: latitude,
      longitude, latitude, wasReslotted: false, kind: positionByInstrument.has(instrument.id) ? 'interaction' : 'field' };
  });

  // A bounded server-side berth pass avoids asking each client to solve visual
  // collisions differently. It affects display longitude/latitude only.
  const occupied = [];
  let crowdedNodeCount = 0;
  for (const placement of [...prepared].sort((left, right) => fnv32(left.instrument.id) - fnv32(right.instrument.id))) {
    const initial = orbPosition(placement.radius, placement.longitude, placement.latitude, formation, axes);
    if (occupied.every(point => chordDistance(point, initial) >= 0.12)) {
      occupied.push(initial);
      continue;
    }
    crowdedNodeCount += 1;
    let chosen = null;
    for (let step = 1; step <= 16 && !chosen; step += 1) {
      for (const direction of [-1, 1]) {
        const longitude = placement.sourceLongitude + direction * step * 0.09;
        const point = orbPosition(placement.radius, longitude, placement.sourceLatitude, formation, axes);
        if (occupied.every(other => chordDistance(other, point) >= 0.12)) {
          chosen = { longitude, point };
          break;
        }
      }
    }
    if (chosen) {
      placement.longitude = chosen.longitude;
      placement.wasReslotted = true;
      occupied.push(chosen.point);
    } else {
      occupied.push(initial);
    }
  }
  const nodeDTOs = prepared.map(placement => {
    const point = orbPosition(placement.radius, placement.longitude, placement.latitude, formation, axes);
    return {
      id: placement.instrument.id,
      label: placement.instrument.displayName,
      symbol: placement.instrument.symbol,
      assetClass: placement.instrument.assetClass,
      kind: placement.kind,
      paperEligible: placement.instrument.paperEligible,
      displayOnly: placement.instrument.displayOnly,
      availability: placement.instrument.availability,
      source: placement.instrument.source,
      sector: placement.sector,
      depth: rounded(placement.depth),
      radialBand: placement.radialBand,
      position: { x: rounded(point.x), y: rounded(point.y), z: rounded(point.z) },
      sourcePosition: { longitude: rounded(placement.sourceLongitude), latitude: rounded(placement.sourceLatitude) },
      wasReslotted: placement.wasReslotted
    };
  });
  const convergence = clamp(1 - Math.max(Math.abs(axes.x - 1), Math.abs(axes.y - 1), Math.abs(axes.z - 1)) / 0.35, 0, 1);
  const byInstrument = new Map(all.map(item => [item.id, item]));
  return {
    schema: 'harshal-paper-market-orb-v1',
    mode: PAPER_MARKET_MODE,
    availability: all.length ? 'AVAILABLE' : 'UNAVAILABLE',
    placementAuthority: 'server',
    placementMethod: 'Server-normalized Orb/Orb 2 display geometry; never a forecast or instruction.',
    marketWide: {
      formation: rounded(formation),
      axes,
      convergence: rounded(convergence),
      berthSeparation: { amount: 1, minimumChordDistance: 0.12, crowdedNodeCount,
        movedNodeIDs: nodeDTOs.filter(node => node.wasReslotted).map(node => node.id) },
      nodes: nodeDTOs
    },
    accountOverlay: {
      valuations: positions.map(position => positionValuation(position, byInstrument)),
      boundary: 'Private account overlay. It is PAPER_TEST valuation only; no order, execution, custody, wallet, payment, or investment recommendation is present.'
    },
    cryptoBoundary: 'Crypto Orb nodes, when present, are passive server-observed display data only. They are not mineable, tradable, custodial, wallet, token, or device-work surfaces.'
  };
}

async function startPairing(request, env, dependencies, now) {
  exactConfiguredOrigin(request, env);
  await requirePaperSchema(env.COMMUNITY_DB);
  await limitCommunityIpAction(request, env, 'paper-device-pair-start', 8, 3600);
  await cleanupPairings(env.COMMUNITY_DB, now);
  const body = await jsonBody(request, ['deviceLabel']);
  const deviceLabel = boundedText(body.deviceLabel, 'deviceLabel', 1, 80);
  const id = crypto.randomUUID();
  const pairingCode = randomCode();
  const pollToken = randomToken();
  const expiresAt = now + pairingLifetimeMilliseconds;
  await env.COMMUNITY_DB.prepare(`INSERT INTO paper_market_device_pairings
    (id, pairing_code_hash, poll_token_hash, owner_id, device_label, state, created_at, expires_at, approved_at, redeemed_at)
    VALUES (?,?,?,?,?,'pending',?,?,NULL,NULL)`).bind(
    id, await digest(pairingCode), await digest(pollToken), null, deviceLabel, now, expiresAt
  ).run();
  return authJson({
    pairing: {
      id,
      state: 'pending',
      deviceLabel,
      pairingCode,
      pollToken,
      expiresAt,
      approvalURL: `${exactConfiguredOrigin(request, env)}/account#paper-market`
    },
    boundary: 'Enter this code only in the signed-in HarshalOS browser account page. The code approves a scoped PAPER_TEST device; it cannot authorize trading, custody, payment, mining, or a provider account.'
  }, 201);
}

async function pollPairing(request, env, id, now) {
  exactConfiguredOrigin(request, env);
  await requirePaperSchema(env.COMMUNITY_DB);
  await limitCommunityIpAction(request, env, 'paper-device-pair-poll', 180, 3600);
  await cleanupPairings(env.COMMUNITY_DB, now);
  const token = request.headers.get('X-HOS-Paper-Pairing') || '';
  if (!tokenPattern.test(token)) throw new CommunityError(401, 'A valid native pairing status capability is required.');
  const row = await env.COMMUNITY_DB.prepare(`SELECT id, device_label, state, expires_at
    FROM paper_market_device_pairings WHERE id=? AND poll_token_hash=?`).bind(id, await digest(token)).first();
  if (!row) throw new CommunityError(401, 'Pairing status capability is unavailable.');
  return authJson({ pairing: pairingDTO(row, { includeRedeem: true, now }) });
}

async function approvePairing(request, env, now) {
  const actor = await authorizeBrowser(request, env, { write: true, now });
  await cleanupPairings(env.COMMUNITY_DB, now);
  const body = await jsonBody(request, ['approvalCode', 'acknowledgement']);
  if (!pairingCodePattern.test(body.approvalCode || '')) throw new CommunityError(400, 'Enter the 16-character device pairing code.');
  if (body.acknowledgement !== 'APPROVE_PAPER_TEST_DEVICE') {
    throw new CommunityError(400, 'Confirm the explicit PAPER_TEST device approval acknowledgement.');
  }
  const row = await env.COMMUNITY_DB.prepare(`SELECT id, device_label, state, expires_at
    FROM paper_market_device_pairings WHERE pairing_code_hash=? AND state='pending' AND expires_at>?`)
    .bind(await digest(body.approvalCode), now).first();
  if (!row) throw new CommunityError(404, 'Pending device pairing not found or expired.');
  const approved = await env.COMMUNITY_DB.prepare(`UPDATE paper_market_device_pairings
    SET owner_id=?, state='approved', pairing_code_hash=NULL, approved_at=?
    WHERE id=? AND state='pending' AND expires_at=? RETURNING id, device_label, state, expires_at`)
    .bind(actor.ownerID, now, row.id, row.expires_at).first();
  if (!approved) throw new CommunityError(409, 'The device pairing changed; review its status before approving again.');
  return authJson({ pairing: pairingDTO(approved), approved: true });
}

async function redeemPairing(request, env, id, now) {
  exactConfiguredOrigin(request, env);
  await requirePaperSchema(env.COMMUNITY_DB);
  await limitCommunityIpAction(request, env, 'paper-device-pair-redeem', 30, 3600);
  await cleanupPairings(env.COMMUNITY_DB, now);
  const token = request.headers.get('X-HOS-Paper-Pairing') || '';
  if (!tokenPattern.test(token)) throw new CommunityError(401, 'A valid native pairing status capability is required.');
  const pairing = await env.COMMUNITY_DB.prepare(`SELECT id, owner_id, device_label, state, expires_at
    FROM paper_market_device_pairings WHERE id=? AND poll_token_hash=?`).bind(id, await digest(token)).first();
  if (!pairing) throw new CommunityError(401, 'Pairing capability is unavailable.');
  if (pairing.state === 'pending') throw new CommunityError(409, 'The signed-in browser account has not approved this device yet.');
  if (pairing.state !== 'approved' || !pairing.owner_id || pairing.expires_at <= now) {
    throw new CommunityError(409, 'This device pairing is no longer redeemable. Start a new pairing.');
  }
  const activeDevices = await env.COMMUNITY_DB.prepare(`SELECT COUNT(*) AS count FROM paper_market_device_tokens
    WHERE owner_id=? AND revoked_at IS NULL AND expires_at>?`).bind(pairing.owner_id, now).first();
  if (!Number.isSafeInteger(Number(activeDevices?.count)) || Number(activeDevices.count) >= 20) {
    throw new CommunityError(409, 'This account already has the maximum number of active PAPER_TEST devices. Revoke an unused device in the signed-in browser account first.');
  }
  const accessToken = randomToken();
  const deviceID = crypto.randomUUID();
  const expiresAt = now + deviceTokenLifetimeMilliseconds;
  const eventID = crypto.randomUUID();
  await env.COMMUNITY_DB.batch([
    env.COMMUNITY_DB.prepare(`INSERT INTO paper_market_device_tokens
      (id, token_hash, owner_id, pairing_id, device_label, scope, created_at, expires_at, last_used_at, revoked_at)
      VALUES (?,?,?,?,?,'PAPER_TEST',?,?,NULL,NULL)`)
      .bind(deviceID, await digest(accessToken), pairing.owner_id, pairing.id, pairing.device_label, now, expiresAt),
    env.COMMUNITY_DB.prepare(`UPDATE paper_market_device_pairings
      SET state='redeemed', poll_token_hash=NULL, redeemed_at=? WHERE id=? AND state='approved'`).bind(now, pairing.id),
    env.COMMUNITY_DB.prepare(`INSERT INTO paper_market_events
      (id, owner_id, kind, declaration_id, position_id, quote_snapshot_id, detail, created_at)
      VALUES (?,?,'DEVICE_PAIRED',NULL,NULL,NULL,?,?)`)
      .bind(eventID, pairing.owner_id, `PAPER_TEST device paired: ${pairing.device_label}`, now)
  ]);
  const redeemed = await env.COMMUNITY_DB.prepare("SELECT state FROM paper_market_device_pairings WHERE id=?").bind(pairing.id).first();
  if (redeemed?.state !== 'redeemed') throw new CommunityError(409, 'This device pairing changed; start a new pairing.');
  return authJson({
    credential: { accessToken, scope: 'PAPER_TEST', deviceID, deviceLabel: pairing.device_label, expiresAt },
    boundary: 'Store this scoped credential in the device Keychain only. It is revocable and expires; it grants only private PAPER_TEST ledger access.'
  }, 201);
}

async function listDevices(request, env, now) {
  const actor = await authorizeBrowser(request, env, { now });
  const { results } = await env.COMMUNITY_DB.prepare(`SELECT id, device_label, scope, created_at, expires_at, last_used_at, revoked_at
    FROM paper_market_device_tokens WHERE owner_id=? ORDER BY created_at DESC LIMIT 50`).bind(actor.ownerID).all();
  return authJson({ devices: results.map(row => ({
    id: row.id,
    deviceLabel: row.device_label,
    scope: row.scope,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at ?? null,
    status: row.revoked_at ? 'REVOKED' : row.expires_at <= now ? 'EXPIRED' : 'ACTIVE'
  })) });
}

async function revokeDevice(request, env, id, now) {
  const actor = await authorizeBrowser(request, env, { write: true, now });
  const existing = await env.COMMUNITY_DB.prepare('SELECT id, device_label, revoked_at FROM paper_market_device_tokens WHERE id=? AND owner_id=?')
    .bind(id, actor.ownerID).first();
  if (!existing) throw new CommunityError(404, 'PAPER_TEST device not found.');
  if (!existing.revoked_at) {
    const eventID = crypto.randomUUID();
    await env.COMMUNITY_DB.batch([
      env.COMMUNITY_DB.prepare('UPDATE paper_market_device_tokens SET revoked_at=? WHERE id=? AND owner_id=? AND revoked_at IS NULL')
        .bind(now, id, actor.ownerID),
      env.COMMUNITY_DB.prepare(`INSERT INTO paper_market_events
        (id, owner_id, kind, declaration_id, position_id, quote_snapshot_id, detail, created_at)
        VALUES (?,?,'DEVICE_REVOKED',NULL,NULL,NULL,?,?)`)
        .bind(eventID, actor.ownerID, `PAPER_TEST device revoked: ${existing.device_label}`, now)
    ]);
  }
  return authJson({ revoked: true, deviceID: id });
}

async function readCatalog(request, env, dependencies, now) {
  await authorizeActor(request, env, { now });
  const catalog = await fieldCatalog(env, dependencies, now);
  return authJson(catalogDTO(catalog, now));
}

async function createQuote(request, env, dependencies, now) {
  const actor = await authorizeActor(request, env, { write: true, now });
  const idempotencyKey = requiredIdempotencyKey(request);
  const body = await jsonBody(request, ['instrumentID']);
  const catalog = await fieldCatalog(env, dependencies, now);
  const instrument = currentInstrument(catalog, body.instrumentID, { paperOnly: true });
  const result = await insertQuoteSnapshot(env.COMMUNITY_DB, actor.ownerID, instrument, idempotencyKey, now);
  return authJson({ mode: PAPER_MARKET_MODE, quote: quoteDTO(result.quote), replayed: result.replayed }, result.replayed ? 200 : 201);
}

async function createDeclaration(request, env, dependencies, now) {
  const actor = await authorizeActor(request, env, { write: true, now });
  const idempotencyKey = requiredIdempotencyKey(request);
  const body = await jsonBody(request, ['phase', 'instrumentID', 'direction', 'thesis', 'targetAt']);
  if (!phases.has(body.phase)) throw new CommunityError(400, 'Choose NAB, CWO, or GSRB for this PAPER_TEST declaration.');
  if (!directions.has(body.direction)) throw new CommunityError(400, 'Choose HIGHER, LOWER, or NEUTRAL.');
  const thesis = boundedText(body.thesis, 'thesis', 1, 2000, { multiline: true });
  const targetAt = safeInteger(body.targetAt, 'targetAt', now + 60_000, now + 10 * 365 * 24 * 60 * 60 * 1000);
  const replay = await env.COMMUNITY_DB.prepare('SELECT * FROM paper_market_declarations WHERE owner_id=? AND idempotency_key=?')
    .bind(actor.ownerID, idempotencyKey).first();
  if (replay) {
    if (replay.phase !== body.phase || replay.instrument_id !== body.instrumentID || replay.direction !== body.direction
      || replay.thesis !== thesis || replay.target_at !== targetAt) {
      throw new CommunityError(409, 'This Idempotency-Key was already used for a different PAPER_TEST declaration.');
    }
    return authJson({ mode: PAPER_MARKET_MODE, declaration: declarationDTO(replay), replayed: true });
  }
  await requireOwnerCapacity(env.COMMUNITY_DB, actor.ownerID, 'paper_market_declarations', 1000, 'declaration');
  const catalog = await fieldCatalog(env, dependencies, now);
  currentInstrument(catalog, body.instrumentID, { paperOnly: true });
  const id = crypto.randomUUID();
  try {
    await env.COMMUNITY_DB.prepare(`INSERT INTO paper_market_declarations
      (id, owner_id, phase, instrument_id, direction, thesis, target_at, created_at, idempotency_key)
      VALUES (?,?,?,?,?,?,?,?,?)`).bind(id, actor.ownerID, body.phase, body.instrumentID, body.direction, thesis, targetAt, now, idempotencyKey).run();
  } catch {
    const raceReplay = await env.COMMUNITY_DB.prepare('SELECT * FROM paper_market_declarations WHERE owner_id=? AND idempotency_key=?')
      .bind(actor.ownerID, idempotencyKey).first();
    if (raceReplay) return authJson({ mode: PAPER_MARKET_MODE, declaration: declarationDTO(raceReplay), replayed: true });
    throw new CommunityError(503, 'The PAPER_TEST declaration could not be recorded.');
  }
  const declaration = await env.COMMUNITY_DB.prepare('SELECT * FROM paper_market_declarations WHERE id=? AND owner_id=?').bind(id, actor.ownerID).first();
  if (!declaration) throw new CommunityError(503, 'The PAPER_TEST declaration receipt is unavailable.');
  return authJson({ mode: PAPER_MARKET_MODE, declaration: declarationDTO(declaration), replayed: false }, 201);
}

async function createPosition(request, env, now) {
  const actor = await authorizeActor(request, env, { write: true, now });
  const idempotencyKey = requiredIdempotencyKey(request);
  const body = await jsonBody(request, ['declarationID', 'side', 'quantity', 'quoteSnapshotID']);
  if (!UUID_RE.test(body.declarationID || '') || !UUID_RE.test(body.quoteSnapshotID || '')) throw new CommunityError(400, 'A valid declaration and server quote reference are required.');
  if (!sides.has(body.side)) throw new CommunityError(400, 'Choose LONG or SHORT for this simulated paper position.');
  const quantity = decimalText(body.quantity, 'quantity');
  const replay = await env.COMMUNITY_DB.prepare(`${positionSelect} WHERE p.owner_id=? AND p.open_idempotency_key=?`)
    .bind(actor.ownerID, idempotencyKey).first();
  if (replay) {
    if (replay.declaration_id !== body.declarationID || replay.side !== body.side || replay.quantity_text !== quantity
      || replay.entry_snapshot_id !== body.quoteSnapshotID) {
      throw new CommunityError(409, 'This Idempotency-Key was already used for a different PAPER_TEST position.');
    }
    return authJson({ mode: PAPER_MARKET_MODE, position: positionDTO(replay), replayed: true });
  }
  await requireOwnerCapacity(env.COMMUNITY_DB, actor.ownerID, 'paper_market_positions', 1000, 'position');
  const declaration = await env.COMMUNITY_DB.prepare('SELECT * FROM paper_market_declarations WHERE id=? AND owner_id=?')
    .bind(body.declarationID, actor.ownerID).first();
  if (!declaration) throw new CommunityError(404, 'PAPER_TEST declaration not found.');
  const quote = await env.COMMUNITY_DB.prepare('SELECT * FROM paper_market_quote_snapshots WHERE id=? AND owner_id=?')
    .bind(body.quoteSnapshotID, actor.ownerID).first();
  if (!quote || quote.expires_at <= now || quote.availability !== 'AVAILABLE' || quote.instrument_id !== declaration.instrument_id) {
    throw new CommunityError(409, 'A current matching server-issued PAPER_TEST quote is required to open this position.');
  }
  const id = crypto.randomUUID();
  try {
    await env.COMMUNITY_DB.prepare(`INSERT INTO paper_market_positions
      (id, owner_id, declaration_id, phase, instrument_id, side, quantity_text, entry_snapshot_id, exit_snapshot_id,
        state, opened_at, closed_at, open_idempotency_key, close_idempotency_key, withdraw_idempotency_key)
      VALUES (?,?,?,?,?,?,?,?,NULL,'OPEN',?,NULL,?,NULL,NULL)`)
      .bind(id, actor.ownerID, declaration.id, declaration.phase, declaration.instrument_id, body.side, quantity,
        quote.id, now, idempotencyKey).run();
  } catch {
    const raceReplay = await env.COMMUNITY_DB.prepare(`${positionSelect} WHERE p.owner_id=? AND p.open_idempotency_key=?`)
      .bind(actor.ownerID, idempotencyKey).first();
    if (raceReplay) return authJson({ mode: PAPER_MARKET_MODE, position: positionDTO(raceReplay), replayed: true });
    throw new CommunityError(503, 'The PAPER_TEST position could not be recorded.');
  }
  const position = await readPosition(env.COMMUNITY_DB, actor.ownerID, id);
  if (!position) throw new CommunityError(503, 'The PAPER_TEST position receipt is unavailable.');
  return authJson({ mode: PAPER_MARKET_MODE, position: positionDTO(position), replayed: false }, 201);
}

async function closePosition(request, env, id, now) {
  const actor = await authorizeActor(request, env, { write: true, now });
  const idempotencyKey = requiredIdempotencyKey(request);
  const body = await jsonBody(request, ['quoteSnapshotID']);
  if (!UUID_RE.test(body.quoteSnapshotID || '')) throw new CommunityError(400, 'A server quote reference is required to close this PAPER_TEST position.');
  const existing = await readPosition(env.COMMUNITY_DB, actor.ownerID, id);
  if (!existing) throw new CommunityError(404, 'PAPER_TEST position not found.');
  if (existing.state === 'CLOSED') {
    if (existing.close_idempotency_key === idempotencyKey && existing.exit_snapshot_id === body.quoteSnapshotID) {
      return authJson({ mode: PAPER_MARKET_MODE, position: positionDTO(existing), replayed: true });
    }
    throw new CommunityError(409, 'This PAPER_TEST position has already closed.');
  }
  if (existing.state !== 'OPEN') throw new CommunityError(409, 'This PAPER_TEST position is no longer open.');
  const quote = await env.COMMUNITY_DB.prepare('SELECT * FROM paper_market_quote_snapshots WHERE id=? AND owner_id=?')
    .bind(body.quoteSnapshotID, actor.ownerID).first();
  if (!quote || quote.expires_at <= now || quote.availability !== 'AVAILABLE' || quote.instrument_id !== existing.instrument_id) {
    throw new CommunityError(409, 'A current matching server-issued PAPER_TEST quote is required to close this position.');
  }
  const changed = await env.COMMUNITY_DB.prepare(`UPDATE paper_market_positions
    SET state='CLOSED', exit_snapshot_id=?, closed_at=?, close_idempotency_key=?
    WHERE id=? AND owner_id=? AND state='OPEN' RETURNING id`)
    .bind(quote.id, now, idempotencyKey, id, actor.ownerID).first();
  if (!changed) {
    const current = await readPosition(env.COMMUNITY_DB, actor.ownerID, id);
    if (current?.state === 'CLOSED' && current.close_idempotency_key === idempotencyKey && current.exit_snapshot_id === body.quoteSnapshotID) {
      return authJson({ mode: PAPER_MARKET_MODE, position: positionDTO(current), replayed: true });
    }
    throw new CommunityError(409, 'This PAPER_TEST position changed before it could close.');
  }
  const closed = await readPosition(env.COMMUNITY_DB, actor.ownerID, id);
  return authJson({ mode: PAPER_MARKET_MODE, position: positionDTO(closed), replayed: false });
}

async function withdrawPosition(request, env, id, now) {
  const actor = await authorizeActor(request, env, { write: true, now });
  const idempotencyKey = requiredIdempotencyKey(request);
  await jsonBody(request, []);
  const existing = await readPosition(env.COMMUNITY_DB, actor.ownerID, id);
  if (!existing) throw new CommunityError(404, 'PAPER_TEST position not found.');
  if (existing.state === 'WITHDRAWN') {
    if (existing.withdraw_idempotency_key === idempotencyKey) return authJson({ mode: PAPER_MARKET_MODE, position: positionDTO(existing), replayed: true });
    throw new CommunityError(409, 'This PAPER_TEST position has already been withdrawn.');
  }
  if (existing.state !== 'OPEN') throw new CommunityError(409, 'This PAPER_TEST position is no longer open.');
  const changed = await env.COMMUNITY_DB.prepare(`UPDATE paper_market_positions
    SET state='WITHDRAWN', closed_at=?, withdraw_idempotency_key=?
    WHERE id=? AND owner_id=? AND state='OPEN' RETURNING id`)
    .bind(now, idempotencyKey, id, actor.ownerID).first();
  if (!changed) {
    const current = await readPosition(env.COMMUNITY_DB, actor.ownerID, id);
    if (current?.state === 'WITHDRAWN' && current.withdraw_idempotency_key === idempotencyKey) {
      return authJson({ mode: PAPER_MARKET_MODE, position: positionDTO(current), replayed: true });
    }
    throw new CommunityError(409, 'This PAPER_TEST position changed before it could withdraw.');
  }
  const withdrawn = await readPosition(env.COMMUNITY_DB, actor.ownerID, id);
  return authJson({ mode: PAPER_MARKET_MODE, position: positionDTO(withdrawn), replayed: false });
}

async function ledgerResponse(request, env, now) {
  const actor = await authorizeActor(request, env, { now });
  const ledger = await readLedger(env.COMMUNITY_DB, actor.ownerID);
  return authJson({ schema: 'harshal-paper-market-ledger-v1', mode: PAPER_MARKET_MODE, generatedAt: now, ledger });
}

async function orbResponse(request, env, dependencies, now) {
  const actor = await authorizeActor(request, env, { now });
  const positions = await readPositions(env.COMMUNITY_DB, actor.ownerID);
  try {
    const catalog = await fieldCatalog(env, dependencies, now);
    return authJson({ generatedAt: now, orb: makeOrb(catalog, positions) });
  } catch (error) {
    if (!(error instanceof CommunityError)) throw error;
    return authJson({ generatedAt: now, orb: {
      schema: 'harshal-paper-market-orb-v1', mode: PAPER_MARKET_MODE, availability: 'UNAVAILABLE',
      placementAuthority: 'server', message: error.message, marketWide: { nodes: [] },
      accountOverlay: { valuations: positions.map(position => positionValuation(position, new Map())),
        boundary: 'Market field unavailable. No current mark or valuation has been fabricated.' }
    } });
  }
}

async function snapshotResponse(request, env, dependencies, now) {
  const actor = await authorizeActor(request, env, { now });
  const ledger = await readLedger(env.COMMUNITY_DB, actor.ownerID);
  try {
    const catalog = await fieldCatalog(env, dependencies, now);
    return authJson({
      schema: PAPER_MARKET_SCHEMA,
      mode: PAPER_MARKET_MODE,
      generatedAt: now,
      market: catalogDTO(catalog, now),
      ledger,
      orb: makeOrb(catalog, ledger.positions),
      boundary: 'Authoritative state is the account-scoped server PAPER_TEST ledger. Local apps may render a last successful snapshot but must label offline or unavailable state; they may not invent a quote or valuation.'
    });
  } catch (error) {
    if (!(error instanceof CommunityError)) throw error;
    return authJson({
      schema: PAPER_MARKET_SCHEMA,
      mode: PAPER_MARKET_MODE,
      generatedAt: now,
      market: { schema: 'harshal-paper-market-catalog-v1', mode: PAPER_MARKET_MODE, sourceAvailability: 'UNAVAILABLE',
        sourceMessage: error.message, instruments: [], boundary: 'No fallback quote source is used.' },
      ledger,
      orb: {
        schema: 'harshal-paper-market-orb-v1', mode: PAPER_MARKET_MODE, availability: 'UNAVAILABLE',
        placementAuthority: 'server', message: error.message, marketWide: { nodes: [] },
        accountOverlay: { valuations: ledger.positions.map(position => positionValuation(position, new Map())),
          boundary: 'Market field unavailable. No current mark or valuation has been fabricated.' }
      },
      boundary: 'The account ledger remains readable, but the server market field is unavailable. No fallback quote, valuation, recommendation, or provider request was made.'
    });
  }
}

function methodNotAllowed(allow) {
  return authJson({ error: 'Method not allowed.' }, 405, { Allow: allow });
}

// Dependencies are test-only function arguments. They cannot be supplied in a
// request and are never used as a client/provider proxy.
export async function handlePaperMarket(request, env, dependencies = {}) {
  const path = new URL(request.url).pathname;
  const now = nowMilliseconds(dependencies);
  try {
    if (path === `${PAPER_MARKET_BASE_PATH}/device-pairings`) {
      return request.method === 'POST' ? await startPairing(request, env, dependencies, now) : methodNotAllowed('POST');
    }
    if (path === `${PAPER_MARKET_BASE_PATH}/device-pairings/approve`) {
      return request.method === 'POST' ? await approvePairing(request, env, now) : methodNotAllowed('POST');
    }
    const pairing = pairingPath.exec(path);
    if (pairing) return request.method === 'GET' ? await pollPairing(request, env, pairing[1].toLowerCase(), now) : methodNotAllowed('GET');
    const redeem = redeemPath.exec(path);
    if (redeem) return request.method === 'POST' ? await redeemPairing(request, env, redeem[1].toLowerCase(), now) : methodNotAllowed('POST');
    if (path === `${PAPER_MARKET_BASE_PATH}/devices`) return request.method === 'GET' ? await listDevices(request, env, now) : methodNotAllowed('GET');
    const revoke = revokeDevicePath.exec(path);
    if (revoke) return request.method === 'POST' ? await revokeDevice(request, env, revoke[1].toLowerCase(), now) : methodNotAllowed('POST');
    if (path === `${PAPER_MARKET_BASE_PATH}/catalog`) return request.method === 'GET' ? await readCatalog(request, env, dependencies, now) : methodNotAllowed('GET');
    if (path === `${PAPER_MARKET_BASE_PATH}/quotes`) return request.method === 'POST' ? await createQuote(request, env, dependencies, now) : methodNotAllowed('POST');
    if (path === `${PAPER_MARKET_BASE_PATH}/declarations`) return request.method === 'POST' ? await createDeclaration(request, env, dependencies, now) : methodNotAllowed('POST');
    if (path === `${PAPER_MARKET_BASE_PATH}/positions`) return request.method === 'POST' ? await createPosition(request, env, now) : methodNotAllowed('POST');
    const close = closePositionPath.exec(path);
    if (close) return request.method === 'POST' ? await closePosition(request, env, close[1].toLowerCase(), now) : methodNotAllowed('POST');
    const withdraw = withdrawPositionPath.exec(path);
    if (withdraw) return request.method === 'POST' ? await withdrawPosition(request, env, withdraw[1].toLowerCase(), now) : methodNotAllowed('POST');
    if (path === `${PAPER_MARKET_BASE_PATH}/ledger`) return request.method === 'GET' ? await ledgerResponse(request, env, now) : methodNotAllowed('GET');
    if (path === `${PAPER_MARKET_BASE_PATH}/orb`) return request.method === 'GET' ? await orbResponse(request, env, dependencies, now) : methodNotAllowed('GET');
    if (path === `${PAPER_MARKET_BASE_PATH}/snapshot`) return request.method === 'GET' ? await snapshotResponse(request, env, dependencies, now) : methodNotAllowed('GET');
    throw new CommunityError(404, 'Unknown PAPER_TEST market route.');
  } catch (error) {
    return authJson(
      { error: error instanceof CommunityError ? error.message : 'PAPER_TEST market service unavailable. Please retry without inventing a local quote.' },
      error instanceof CommunityError ? error.status : 503
    );
  }
}
