import test from 'node:test';
import assert from 'node:assert/strict';
import '../js/nab-sectors.js';
import '../js/characters-disc-catalog.js';
import '../js/nab-composites.js';
import { TICKERBOT_WATCHLIST } from '../worker/good-intelligence-tickerbot.mjs';

const Model = globalThis.NabComposites;
const NOW = Date.parse('2026-10-04T12:00:00Z');
const market = { latestBar: { close: 100 * Math.exp(Math.log(1.25) / 2) }, basis: 100, bands: { lower1000: 80, upper1000: 125 } };
const obs = (overrides = {}) => ({ channel: 'stocks', symbol: 'V', provider: 'tickerbot', interval: '1d', at: NOW, status: 'bars', market, ...overrides });
const registry = Model.catalog({ watchlist: TICKERBOT_WATCHLIST, crypto: [
  { symbol: 'BTC', providerId: 'BTC/USD', krakenPair: 'BTC/USD', providerBase: 'BTC', rankingProvider: 'Kraken', name: 'Bitcoin' },
  { symbol: 'USDT', providerId: 'USDT/USD', krakenPair: 'USDT/USD', providerBase: 'USDT', rankingProvider: 'Kraken', name: 'Tether' },
  { symbol: 'NEW', providerId: 'NEW/USD', krakenPair: 'NEW/USD', providerBase: 'NEW', rankingProvider: 'Kraken', name: 'Review me' }
] });

test('NAB FBB displacement is symmetric in log space and invariant to quote-price scaling', () => {
  const halfWidth = Math.log(1.25);
  const marketAt = value => ({ latestBar: { close: 100 * Math.exp(value * halfWidth) }, basis: 100, bands: { lower1000: 80, upper1000: 125 } });
  assert.ok(Math.abs(Model.displacement(marketAt(.5)) - .5) < 1e-12);
  assert.ok(Math.abs(Model.displacement(marketAt(-.5)) + .5) < 1e-12);
  const scaled = { latestBar: { close: marketAt(.5).latestBar.close * 1e6 }, basis: 100e6, bands: { lower1000: 80e6, upper1000: 125e6 } };
  assert.ok(Math.abs(Model.displacement(scaled) - .5) < 1e-12);
  assert.equal(Model.displacement({ ...marketAt(0), latestBar: { close: 0 } }), null);
});

test('119 NAB Discs preserve membership and surface unmapped market assets for editorial review', () => {
  assert.equal(registry.discs.length, 119);
  assert.equal(globalThis.CharactersDiscCatalog.nabDiscs.length, 119);
  const ids = new Set(registry.members.map(row => row.id));
  const reviewIds = new Set(registry.review.map(row => row.id));
  for (const row of TICKERBOT_WATCHLIST) assert.ok(ids.has(`stocks:${row.symbol}`));
  for (const channel of ['fx', 'commodities', 'indices']) for (const row of globalThis.CharactersDiscCatalog.staticInstruments(channel)) assert.ok(ids.has(`${channel}:${row.symbol}`));
  const stockReviews = registry.review.filter(row => row.source === 'reviewed Tickerbot watchlist');
  assert.equal(stockReviews.length, 22, 'new market-roster assets without a reviewed NAB assignment remain visible for editorial review');
  assert.ok(stockReviews.every(row => ids.has(row.id) && TICKERBOT_WATCHLIST.some(asset => `stocks:${asset.symbol}` === row.id)));
  assert.equal(reviewIds.has('crypto:NEW'), true, 'an unknown exact Kraken pair stays in review');
  assert.equal(registry.review.length, 23);
  for (const disc of registry.discs) assert.equal(registry.members.filter(row => row.nabId === disc.nabId && row.role === 'designated-stock').length, 1);
});

test('same alignment joins a bank, stock, FX and Kraken crypto into a composite, not an average', () => {
  const composite = Model.compose(12, {
    registry,
    observations: [obs(), obs({ channel: 'fx', symbol: 'EURUSD', provider: 'massive', market: { latestBar: { close: 1.2 } } })],
    now: NOW
  });
  const ids = composite.members.map(row => row.id);
  for (const id of ['central-bank:fed', 'central-bank:ecb', 'stocks:V', 'fx:EURUSD', 'crypto:USDT']) assert.ok(ids.includes(id), id);
  assert.ok(!ids.includes('stocks:MA'));
  assert.ok(Math.abs(composite.members.find(row => row.id === 'stocks:V').observations[0].fbbDisplacement - .5) < 1e-12);
  assert.equal(composite.members.find(row => row.id === 'fx:EURUSD').observations[0].fbbDisplacement, null);
  assert.equal(composite.members.find(row => row.id === 'central-bank:fed').observations.length, 0);
  assert.equal(composite.coverage.observed, 2);
  assert.equal(composite.averagePrice, undefined);
  assert.ok(composite.aiContext.missing.includes('central-bank:fed'));
  assert.match(composite.aiContext.instructions, /not.*verified classification/);
  assert.ok(Object.isFrozen(composite.members));
});

test('new NAB observations enforce provider/channel/1d identity with no Stocks fallback', () => {
  assert.ok(Model.observation(obs()), 'Tickerbot Stocks 1d is the active stock route');
  assert.ok(Model.observation(obs({ channel: 'fx', symbol: 'EURUSD', provider: 'massive' })));
  assert.ok(Model.observation(obs({ channel: 'crypto', symbol: 'BTC', provider: 'kraken', providerId: 'BTC/USD', krakenPair: 'BTC/USD' })));
  for (const invalid of [
    obs({ provider: 'massive' }),
    obs({ provider: 'alpha', interval: '1mo' }),
    obs({ provider: 'tickerbot', interval: '1h' }),
    obs({ channel: 'fx', symbol: 'EURUSD', provider: 'tickerbot' }),
    obs({ channel: 'crypto', symbol: 'BTC', provider: 'massive', providerId: 'X:BTCUSD' }),
    obs({ channel: 'crypto', symbol: 'BTC', provider: 'kraken', providerId: 'ETH/USD' }),
    obs({ channel: 'indices', symbol: 'SPX', provider: 'unknown' })
  ]) assert.equal(Model.observation(invalid), null, JSON.stringify({ channel: invalid.channel, provider: invalid.provider, interval: invalid.interval }));
});

test('provider, interval, source channel and exact Kraken identity never collide', () => {
  const values = Model.mergeObservations([
    obs(),
    obs({ provider: 'tickerbot', interval: '1h' }),
    obs({ channel: 'fx', symbol: 'EURUSD', provider: 'massive' }),
    obs({ at: NOW + 100, market: null, status: 'unavailable' })
  ]);
  assert.equal(values.length, 3, 'an hourly NAB stock observation is refused; a failed daily refresh remains recorded');
  const composite = Model.compose(12, { registry, observations: values, now: NOW + 200 });
  const stock = composite.members.find(row => row.id === 'stocks:V');
  assert.equal(stock.observations.length, 2);
  assert.equal(stock.observations[0].status, 'unavailable');
  const wrongPair = Model.compose(20, { registry, observations: [obs({ channel: 'crypto', symbol: 'BTC', provider: 'kraken', providerId: 'ETH/USD' })] });
  assert.equal(wrongPair.members.find(row => row.id === 'crypto:BTC').observations.length, 0);
  const exactPair = Model.compose(20, { registry, observations: [obs({ channel: 'crypto', symbol: 'BTC', provider: 'kraken', providerId: 'BTC/USD' })] });
  assert.equal(exactPair.members.find(row => row.id === 'crypto:BTC').observations.length, 1,
    'Kraken crypto history joins only on its exact display-format USD pair');
  assert.equal(Model.observation(obs({ market: { synthetic: true } })), null);
  assert.equal(Model.observation(obs({ at: null })), null);
});

test('legacy Alpha 1mo is retained as read-only history and excluded from NAB calculations', () => {
  const alpha = Model.fromSavedBeats([{
    discId: 'stocks', provider: 'alpha', beatAt: NOW,
    payload: { entry: { interval: '1mo' }, observations: [{ ticker: 'AAPL', close: 120, status: 'ready' }] }
  }]);
  assert.equal(alpha.length, 1);
  assert.equal(alpha[0].legacy, true);
  assert.equal(alpha[0].interval, '1mo');
  assert.equal(alpha[0].provider, 'alpha');
  assert.equal(Model.observation(obs({ provider: 'alpha', interval: '1mo' })), null, 'new Alpha input is not accepted');
  const composite = Model.compose(14, { registry, observations: alpha, now: NOW + 1 });
  const archived = composite.members.find(row => row.id === 'stocks:AAPL').observations[0];
  assert.equal(archived.legacy, true);
  assert.equal(archived.fbbDisplacement, null);
  assert.equal(composite.coverage.observed, 0);
  assert.equal(composite.aiContext.constituents.find(row => row.id === 'stocks:AAPL').observations.length, 0);
  assert.ok(composite.aiContext.missing.includes('stocks:AAPL'));
});

test('physical designs join only their designated NAB; missing material records stay missing', () => {
  const materials = [{ materialId: 'mp-1', density: 2 }];
  const spheroids = [{ id: 'physical-a', name: 'A', nabId: 12, components: [{ materialId: 'mp-1', sharePercent: 50 }, { materialId: 'mp-2', sharePercent: 50 }] }, { id: 'physical-b', nabId: 20, components: [] }];
  const composite = Model.compose(12, { registry, materials, spheroids });
  assert.equal(composite.physical.length, 1);
  assert.equal(composite.physical[0].components[0].material.density, 2);
  assert.equal(composite.physical[0].components[1].material, null);
  assert.equal(Object.isFrozen(materials[0]), false, 'composing cannot mutate/freeze source records');
});

test('legacy and compact archives migrate non-destructively and cannot fabricate FBB bands', () => {
  const events = [{ discId: 'stocks', provider: 'massive', interval: '1d', at: NOW, instruments: [{ symbol: 'V', status: 'bars', market }] }];
  const before = JSON.stringify(events);
  const migrated = Model.fromLegacy(events);
  assert.equal(migrated.length, 1);
  assert.equal(migrated[0].legacy, true);
  assert.equal(JSON.stringify(events), before);
  const compact = Model.fromSavedBeats([{ discId: 'stocks', provider: 'tickerbot', beatAt: NOW, payload: { entry: { interval: '1d' }, observations: [{ ticker: 'V', close: 120, status: 'ready' }] } }]);
  assert.equal(compact.length, 1);
  assert.equal(compact[0].legacy, false, 'an archived row on the active provider path retains its current route identity');
  assert.equal(Model.displacement(compact[0].market), null);
  const old = Model.compose(12, { registry, observations: migrated, now: NOW + 2 * 86_400_000 }).members.find(row => row.id === 'stocks:V').observations[0];
  assert.equal(old.stale, true);
  assert.equal(old.fbbDisplacement, null, 'an old provider/Disc pairing remains visible but has no composite height');
});
