import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../worker/index.mjs';
import { handlePaperMarket, PAPER_MARKET_BASE_PATH } from '../worker/paper-market.mjs';
import { digest } from '../worker/community-auth.mjs';

const origin = 'https://os.example';
const fixedNow = 1_790_000_000_000;

function insertRawQuote(sql, { id, ownerID = 'alice', instrumentID = 'HOSX' }) {
  sql.prepare(`INSERT INTO paper_market_quote_snapshots
    (id, owner_id, instrument_id, symbol, display_name, asset_class, venue, quote_currency, price_text,
      provider, source_label, interval, freshness, observed_at, retrieved_at, expires_at, availability, idempotency_key)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, ownerID, instrumentID, instrumentID, 'Direct SQL test quote', 'EQUITY', 'TEST', 'USD', '123.45',
      'test-provider', 'Direct trigger test', '1d', 'fresh', fixedNow, fixedNow, fixedNow + 300_000, 'AVAILABLE',
      `direct-quote-${id}-idempotency-key`);
}

function fieldSnapshot() {
  return {
    ok: true,
    generatedAt: fixedNow,
    observations: [
      {
        symbol: 'HOSX', displaySymbol: 'HOSX', name: 'Harshal Test Equity', discId: 'stocks', provider: 'tickerbot',
        interval: '1d', status: 'bars', confirmed: true, observedAt: fixedNow - 30_000,
        market: { latestBar: { close: 123.45, confirmed: true }, changePct: 1.75 }, composition: { score: 0.22 }
      },
      {
        symbol: 'EUR/USD', displaySymbol: 'EUR/USD', name: 'Euro / U.S. dollar', discId: 'fx', provider: 'massive',
        interval: '1d', status: 'bars', confirmed: true, observedAt: fixedNow - 30_000,
        market: { latestBar: { close: 1.08, confirmed: true }, changePct: -0.12 }
      },
      {
        symbol: 'BTC', displaySymbol: 'BTC', name: 'Bitcoin display node', discId: 'crypto', provider: 'kraken',
        interval: '1d', status: 'bars', confirmed: true, observedAt: fixedNow - 30_000,
        market: { latestBar: { close: 65_000, confirmed: true }, changePct: 2.2 }
      },
      {
        symbol: 'HELD', displaySymbol: 'HELD', name: 'Held field record', discId: 'stocks', provider: 'tickerbot',
        interval: '1d', status: 'held', confirmed: false, observedAt: fixedNow - 600_000, market: null
      }
    ]
  };
}

async function fixture(t) {
  const sql = new DatabaseSync(':memory:');
  t.after(() => sql.close());
  sql.exec('PRAGMA foreign_keys=ON');
  for (const file of ['0001_private_drafts.sql', '0002_auth_sessions.sql', '0016_public_observations.sql', '0017_paper_market.sql']) {
    sql.exec(readFileSync(new URL('../migrations/community/' + file, import.meta.url), 'utf8'));
  }
  const db = {
    prepare(source) {
      let args = [];
      const statement = {
        bind(...values) { args = values; return statement; },
        exec() { return sql.prepare(source).run(...args); },
        async run() { return statement.exec(); },
        async first() { return sql.prepare(source).get(...args) ?? null; },
        async all() { return { results: sql.prepare(source).all(...args) }; }
      };
      return statement;
    },
    async batch(statements) {
      sql.exec('BEGIN');
      try {
        const result = statements.map(statement => statement.exec());
        sql.exec('COMMIT');
        return result;
      } catch (error) {
        sql.exec('ROLLBACK');
        throw error;
      }
    }
  };
  for (const id of ['alice', 'bob']) {
    sql.prepare('INSERT INTO community_users VALUES(?,?,?,0,?)').run(id, 'https://issuer.example/', id, fixedNow);
    sql.prepare('INSERT INTO community_sessions VALUES(?,?,?,?,?,?)')
      .run(await digest(id[0].repeat(43)), id, 'https://issuer.example/', 'client', Math.floor(fixedNow / 1000) - 60, Math.floor(fixedNow / 1000) + 86400);
  }
  const env = {
    COMMUNITY_ENABLED: 'true',
    COMMUNITY_DB: db,
    COMMUNITY_ORIGIN: origin,
    OIDC_ISSUER: 'https://issuer.example/',
    OIDC_CLIENT_ID: 'client',
    OIDC_CLIENT_SECRET: 'secret',
    COMMUNITY_RATE_SECRET: 'r'.repeat(64)
  };
  async function call(path, { method = 'GET', user = null, data, headers = {}, requestOrigin = origin } = {}) {
    const requestHeaders = { 'CF-Connecting-IP': '192.0.2.1', ...headers };
    if (data !== undefined) requestHeaders['Content-Type'] = 'application/json';
    if (user) {
      requestHeaders.Cookie = '__Host-hos_session=' + user[0].repeat(43);
      if (requestOrigin) requestHeaders.Origin = requestOrigin;
    }
    return handlePaperMarket(new Request(origin + PAPER_MARKET_BASE_PATH + path, {
      method,
      headers: requestHeaders,
      body: data === undefined ? undefined : JSON.stringify(data)
    }), env, { now: fixedNow, fieldSnapshot });
  }
  return { sql, env, call };
}

async function pairDevice(f, deviceLabel = 'Alice iPhone') {
  const started = await f.call('/device-pairings', { method: 'POST', data: { deviceLabel } });
  assert.equal(started.status, 201, await started.clone().text());
  const pairing = (await started.json()).pairing;
  assert.match(pairing.pairingCode, /^[A-Z2-9]{4}(?:-[A-Z2-9]{4}){3}$/);
  assert.match(pairing.pollToken, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(pairing.approvalURL, origin + '/account#paper-market');
  const raw = f.sql.prepare('SELECT * FROM paper_market_device_pairings WHERE id=?').get(pairing.id);
  assert.notEqual(raw.pairing_code_hash, pairing.pairingCode);
  assert.notEqual(raw.poll_token_hash, pairing.pollToken);

  const approve = await f.call('/device-pairings/approve', {
    method: 'POST', user: 'alice', data: { approvalCode: pairing.pairingCode, acknowledgement: 'APPROVE_PAPER_TEST_DEVICE' }
  });
  assert.equal(approve.status, 200, await approve.clone().text());
  assert.equal((await approve.json()).pairing.state, 'approved');

  const status = await f.call('/device-pairings/' + pairing.id, { headers: { 'X-HOS-Paper-Pairing': pairing.pollToken } });
  assert.equal(status.status, 200);
  assert.equal((await status.json()).pairing.canRedeem, true);

  const redeemed = await f.call('/device-pairings/' + pairing.id + '/redeem', {
    method: 'POST', headers: { 'X-HOS-Paper-Pairing': pairing.pollToken }, data: {}
  });
  assert.equal(redeemed.status, 201, await redeemed.clone().text());
  const credential = (await redeemed.json()).credential;
  assert.match(credential.accessToken, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(credential.scope, 'PAPER_TEST');
  assert.equal(f.sql.prepare('SELECT state, poll_token_hash FROM paper_market_device_pairings WHERE id=?').get(pairing.id).state, 'redeemed');
  assert.equal(f.sql.prepare('SELECT poll_token_hash FROM paper_market_device_pairings WHERE id=?').get(pairing.id).poll_token_hash, null);
  assert.notEqual(f.sql.prepare('SELECT token_hash FROM paper_market_device_tokens WHERE id=?').get(credential.deviceID).token_hash, credential.accessToken);
  return { pairing, credential };
}

test('PAPER_TEST route is dispatched inside the private Community namespace', async t => {
  const f = await fixture(t);
  const response = await worker.fetch(new Request(origin + PAPER_MARKET_BASE_PATH + '/device-pairings', {
    method: 'POST', headers: { 'CF-Connecting-IP': '192.0.2.1', 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceLabel: 'Router Test Device' })
  }), f.env);
  assert.equal(response.status, 201, await response.clone().text());
  assert.equal((await response.json()).pairing.state, 'pending');
});

test('PAPER_TEST pairs a native device only after an explicit signed-in browser approval', async t => {
  const f = await fixture(t);
  const started = await f.call('/device-pairings', { method: 'POST', data: { deviceLabel: 'Test iPhone' } });
  const pairing = (await started.json()).pairing;
  assert.equal((await f.call('/device-pairings/' + pairing.id, { headers: { 'X-HOS-Paper-Pairing': 'x'.repeat(43) } })).status, 401);
  assert.equal((await f.call('/device-pairings/' + pairing.id + '/redeem', {
    method: 'POST', headers: { 'X-HOS-Paper-Pairing': pairing.pollToken }, data: {}
  })).status, 409, 'pending browser approval cannot mint a token');
  assert.equal((await f.call('/device-pairings/approve', {
    method: 'POST', user: 'alice', requestOrigin: 'https://attacker.example',
    data: { approvalCode: pairing.pairingCode, acknowledgement: 'APPROVE_PAPER_TEST_DEVICE' }
  })).status, 403, 'browser approval preserves same-origin protection');

  const { credential } = await pairDevice(f, 'Alice iPad');
  const snapshot = await f.call('/snapshot', { headers: { Authorization: 'Bearer ' + credential.accessToken } });
  assert.equal(snapshot.status, 200, await snapshot.clone().text());
  const data = await snapshot.json();
  assert.equal(data.schema, 'harshal-paper-market-mobile-snapshot-v1');
  assert.equal(data.mode, 'PAPER_TEST');
  assert.equal(data.market.instruments.some(instrument => instrument.symbol === 'BTC' && instrument.displayOnly && !instrument.paperEligible), true);
  assert.equal(JSON.stringify(data).includes('alice'), false, 'mobile snapshot must not reveal the Community owner identifier');
});

test('PAPER_TEST writes are owner-scoped, server-quoted, append-only, and idempotent', async t => {
  const f = await fixture(t);
  const { credential } = await pairDevice(f);
  const headers = { Authorization: 'Bearer ' + credential.accessToken };
  const catalogResponse = await f.call('/catalog', { headers });
  const catalog = await catalogResponse.json();
  const equity = catalog.instruments.find(instrument => instrument.symbol === 'HOSX');
  const forex = catalog.instruments.find(instrument => instrument.symbol === 'EUR/USD');
  const crypto = catalog.instruments.find(instrument => instrument.symbol === 'BTC');
  assert.equal(equity.paperEligible, true);
  assert.equal(forex.paperEligible, true);
  assert.equal(crypto.paperEligible, false);

  const declarationData = { phase: 'CWO', instrumentID: equity.id, direction: 'HIGHER', thesis: 'Paper-only reviewed field exercise.', targetAt: fixedNow + 86_400_000 };
  const declarationHeaders = { ...headers, 'Idempotency-Key': 'declare-paper-test-key-0001' };
  const createdDeclaration = await f.call('/declarations', { method: 'POST', headers: declarationHeaders, data: declarationData });
  assert.equal(createdDeclaration.status, 201, await createdDeclaration.clone().text());
  const declaration = (await createdDeclaration.json()).declaration;
  const replay = await f.call('/declarations', { method: 'POST', headers: declarationHeaders, data: declarationData });
  assert.equal(replay.status, 200);
  assert.equal((await replay.json()).declaration.id, declaration.id);
  assert.equal((await f.call('/declarations', {
    method: 'POST', headers: declarationHeaders, data: { ...declarationData, thesis: 'different request' }
  })).status, 409);

  const cryptoQuote = await f.call('/quotes', {
    method: 'POST', headers: { ...headers, 'Idempotency-Key': 'crypto-paper-quote-key-000001' }, data: { instrumentID: crypto.id }
  });
  assert.equal(cryptoQuote.status, 409, 'passive Crypto Orb observation is not paper-tradable');
  const quoteHeaders = { ...headers, 'Idempotency-Key': 'equity-paper-quote-key-000001' };
  const quoteResponse = await f.call('/quotes', { method: 'POST', headers: quoteHeaders, data: { instrumentID: equity.id } });
  assert.equal(quoteResponse.status, 201, await quoteResponse.clone().text());
  const quote = (await quoteResponse.json()).quote;
  assert.equal(quote.price, '123.45');
  assert.equal(quote.provenance.provider, 'tickerbot');
  assert.equal(quote.provenance.freshness, 'unspecified');
  const quoteReplay = await f.call('/quotes', { method: 'POST', headers: quoteHeaders, data: { instrumentID: equity.id } });
  assert.equal(quoteReplay.status, 200);
  assert.equal((await quoteReplay.json()).quote.id, quote.id);
  assert.equal((await f.call('/quotes', {
    method: 'POST', headers: quoteHeaders, data: { instrumentID: forex.id }
  })).status, 409);

  const positionData = { declarationID: declaration.id, side: 'LONG', quantity: '2.5', quoteSnapshotID: quote.id };
  const positionHeaders = { ...headers, 'Idempotency-Key': 'open-paper-test-key-00000001' };
  const openedResponse = await f.call('/positions', { method: 'POST', headers: positionHeaders, data: positionData });
  assert.equal(openedResponse.status, 201, await openedResponse.clone().text());
  const position = (await openedResponse.json()).position;
  const openedReplay = await f.call('/positions', { method: 'POST', headers: positionHeaders, data: positionData });
  assert.equal(openedReplay.status, 200);
  assert.equal((await openedReplay.json()).position.id, position.id);

  insertRawQuote(f.sql, { id: 'direct-foreign-instrument', instrumentID: forex.id });
  assert.throws(() => f.sql.prepare(`INSERT INTO paper_market_positions
    (id, owner_id, declaration_id, phase, instrument_id, side, quantity_text, entry_snapshot_id,
      exit_snapshot_id, state, opened_at, closed_at, open_idempotency_key, close_idempotency_key, withdraw_idempotency_key)
    VALUES ('direct-invalid-position', 'alice', ?, 'CWO', ?, 'LONG', '1', 'direct-foreign-instrument', NULL,
      'OPEN', ?, NULL, 'direct-invalid-position-key', NULL, NULL)`).run(declaration.id, equity.id, fixedNow),
  /account and instrument/);
  insertRawQuote(f.sql, { id: 'direct-bob-quote', ownerID: 'bob', instrumentID: equity.id });
  assert.throws(() => f.sql.prepare(`UPDATE paper_market_positions
    SET state='CLOSED', exit_snapshot_id=?, closed_at=?, close_idempotency_key=? WHERE id=?`)
    .run('direct-bob-quote', fixedNow + 1, 'direct-invalid-close-key', position.id), /exit quote must belong/);

  const ledgerResponse = await f.call('/ledger', { headers });
  const ledger = (await ledgerResponse.json()).ledger;
  assert.equal(ledger.declarations.length, 1);
  assert.equal(ledger.positions.length, 1);
  assert.deepEqual(ledger.events.map(event => event.kind).slice(0, 2), ['POSITION_OPENED', 'DECLARATION_RECORDED']);
  const bobLedger = await (await f.call('/ledger', { user: 'bob' })).json();
  assert.deepEqual(bobLedger.ledger.declarations, [], 'a browser session sees only its own account-scoped ledger');
  assert.deepEqual(bobLedger.ledger.positions, []);
  assert.equal(f.sql.prepare('SELECT count(*) AS count FROM paper_market_events').get().count >= 3, true, 'pairing, declaration, and position events exist');
  assert.throws(() => f.sql.exec("UPDATE paper_market_events SET detail='tamper'"), /append-only/);
  assert.throws(() => f.sql.exec("UPDATE paper_market_quote_snapshots SET price_text='1'"), /immutable/);
  assert.throws(() => f.sql.exec("UPDATE paper_market_declarations SET thesis='tamper'"), /immutable/);

  const orb = await (await f.call('/orb', { headers })).json();
  assert.equal(orb.orb.placementAuthority, 'server');
  assert.equal(orb.orb.marketWide.nodes.some(node => node.symbol === 'BTC' && node.displayOnly && !node.paperEligible), true);
  assert.equal(orb.orb.accountOverlay.valuations[0].valuationState, 'CURRENT');
  assert.equal(orb.orb.accountOverlay.valuations[0].profitLoss, '0');
  assert.equal(JSON.stringify(orb).includes('alice'), false);
});

test('PAPER_TEST device revocation is browser-only and immediately fail-closed', async t => {
  const f = await fixture(t);
  const { credential } = await pairDevice(f);
  const unauthorized = await f.call('/devices/' + credential.deviceID + '/revoke', {
    method: 'POST', headers: { Authorization: 'Bearer ' + credential.accessToken }, data: {}
  });
  assert.equal(unauthorized.status, 403);
  const revoked = await f.call('/devices/' + credential.deviceID + '/revoke', { method: 'POST', user: 'alice', data: {} });
  assert.equal(revoked.status, 200, await revoked.clone().text());
  assert.equal((await f.call('/snapshot', { headers: { Authorization: 'Bearer ' + credential.accessToken } })).status, 401);
  const devices = await (await f.call('/devices', { user: 'alice' })).json();
  assert.equal(devices.devices[0].status, 'REVOKED');
});

test('PAPER_TEST snapshot reports a server-field outage instead of fabricating a quote or valuation', async t => {
  const f = await fixture(t);
  const { credential } = await pairDevice(f);
  const request = new Request(origin + PAPER_MARKET_BASE_PATH + '/snapshot', {
    headers: { 'CF-Connecting-IP': '192.0.2.1', Authorization: 'Bearer ' + credential.accessToken }
  });
  const response = await handlePaperMarket(request, f.env, {
    now: fixedNow,
    fieldSnapshot: async () => ({ ok: false, message: 'Scheduled field is unavailable.' })
  });
  assert.equal(response.status, 200);
  const snapshot = await response.json();
  assert.equal(snapshot.market.sourceAvailability, 'UNAVAILABLE');
  assert.deepEqual(snapshot.market.instruments, []);
  assert.equal(snapshot.orb.availability, 'UNAVAILABLE');
  assert.equal(snapshot.boundary.includes('No fallback quote'), true);
});
