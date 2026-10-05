/* NAB composites join explicitly aligned records; the old five Disc IDs are
   source-channel aliases only. No risk category, ticker spelling, or price is
   used to guess alignment. Pure model: no network calls or storage mutation. */
"use strict";
(() => {
  const VERSION = "nab-composites-v1";
  const LEGACY_CHANNELS = Object.freeze(["stocks", "fx", "crypto", "commodities", "indices"]);
  const channelNames = Object.freeze({ stocks: "Equity source", fx: "FX source", crypto: "Crypto source", commodities: "Commodity source", indices: "Index source" });
  const freeze = value => {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze); Object.freeze(value);
    }
    return value;
  };
  const number = value => typeof value === "number" && Number.isFinite(value) ? value : null;
  const text = value => typeof value === "string" ? value.slice(0, 500) : "";
  const key = (channel, symbol) => `${channel}:${symbol}`;
  // Editorial seed alignments, not assessed institutional classifications.
  // These supporting equities never replace a NAB's one designated stock proxy.
  const supportStocks = Object.freeze({
    AAPL:14, AMZN:13, GOOGL:14, META:43, MSFT:6, NFLX:87, AVGO:55,
    CRM:88, NOW:88, PLTR:36, COP:23, CVX:23, OXY:23, SLB:23, XOM:23,
    BAC:12, GS:56, JPM:12, JNJ:70, LLY:70, PFE:70, UNH:70,
    COST:88, KO:88, MCD:88, WMT:88, BA:22, GE:75, LMT:22,
    F:75, GM:75, RIVN:75, TSLA:75, COIN:20, HOOD:56, MSTR:20,
    IWM:54, QQQ:54, SPY:54, XLE:54
  });
  const commodityAlignment = Object.freeze({ WTI:23, NATURAL_GAS:23, COPPER:26, GOLD:70, SILVER:70, PLATINUM:70, PALLADIUM:70, WHEAT:5, CORN:5, SOYBEANS:5 });
  // A dynamic crypto ranking is joined by Massive's exact X:{BASE}USD ticker,
  // not by an ambiguous base-symbol collision. Unknown pairs remain for review.
  const cryptoAlignment = Object.freeze({
    "X:BTCUSD":20, "X:ETHUSD":4, "X:USDTUSD":12, "X:USDCUSD":12,
    "X:DAIUSD":12, "X:SOLUSD":4, "X:ADAUSD":4, "X:DOTUSD":4,
    "X:XRPUSD":3, "X:LTCUSD":3, "X:DOGEUSD":3, "X:LINKUSD":37,
    "X:BNBUSD":20
  });
  const bankRows = [
    ["USD","fed","Federal Reserve","https://www.federalreserve.gov/"],
    ["EUR","ecb","European Central Bank","https://www.ecb.europa.eu/"],
    ["JPY","boj","Bank of Japan","https://www.boj.or.jp/en/"],
    ["GBP","boe","Bank of England","https://www.bankofengland.co.uk/"],
    ["CNY","pboc","People's Bank of China","http://www.pbc.gov.cn/en/"],
    ["CHF","snb","Swiss National Bank","https://www.snb.ch/en/"],
    ["AUD","rba","Reserve Bank of Australia","https://www.rba.gov.au/"],
    ["CAD","boc","Bank of Canada","https://www.bankofcanada.ca/"],
    ["HKD","hkma","Hong Kong Monetary Authority","https://www.hkma.gov.hk/eng/"],
    ["SGD","mas","Monetary Authority of Singapore","https://www.mas.gov.sg/"],
    ["INR","rbi","Reserve Bank of India","https://www.rbi.org.in/"],
    ["NZD","rbnz","Reserve Bank of New Zealand","https://www.rbnz.govt.nz/"],
    ["MXN","banxico","Bank of Mexico","https://www.banxico.org.mx/"],
    ["KRW","bok","Bank of Korea","https://www.bok.or.kr/eng/"],
    ["BRL","bcb","Central Bank of Brazil","https://www.bcb.gov.br/en/"],
    ["TWD","cbc","Central Bank of the Republic of China (Taiwan)","https://www.cbc.gov.tw/en/"],
    ["ZAR","sarb","South African Reserve Bank","https://www.resbank.co.za/"],
    ["SEK","riksbank","Sveriges Riksbank","https://www.riksbank.se/en-gb/"],
    ["NOK","norges","Norges Bank","https://www.norges-bank.no/en/"],
    ["TRY","cbrt","Central Bank of the Republic of Türkiye","https://www.tcmb.gov.tr/"],
    ["DKK","danmarks","Danmarks Nationalbank","https://www.nationalbanken.dk/en/"],
    ["PLN","nbp","National Bank of Poland","https://nbp.pl/en/"],
    ["HUF","mnb","Magyar Nemzeti Bank","https://www.mnb.hu/en/"],
    ["RUB","cbr","Bank of Russia","https://www.cbr.ru/eng/"]
  ];
  const bankRationale = "Editorial cooperation alignment: monetary coordination and payment-system context fit NAB 12's cooperative structural binding. This is not an assessed classification or operational authority.";
  const banks = freeze(bankRows.map(([currency, id, name, source]) => ({
    id:`central-bank:${id.replaceAll(" ","")}`, channel:"central-bank", symbol:currency, name, source,
    nabId:12, rationale:bankRationale, role:"institutional-context", liveEligible:false,
    classificationStatus:"editorial", dataStatus:"reference-only; no policy-rate or balance-sheet feed configured"
  })));

  function catalog({ watchlist = [], crypto = [] } = {}) {
    const NAB = globalThis.NabSectors;
    const sources = globalThis.CharactersDiscCatalog;
    if (!NAB || !sources) throw new Error("NAB registry and legacy source catalog are required.");
    const stockSet = new Set(watchlist.map(row => row.symbol));
    const members = NAB.sectors.map(nab => ({
      id:key("stocks",nab.ticker), channel:"stocks", symbol:nab.ticker, name:nab.company,
      nabId:nab.id, role:"designated-stock", rationale:nab.rationale,
      source:"docs/models/nab-ticker-assignments.tsv", classificationStatus:"editorial",
      liveEligible:stockSet.has(nab.ticker), dataStatus:"unobserved"
    }));
    for (const row of watchlist) {
      if (NAB.byTicker(row.symbol)) continue;
      const nabId = supportStocks[row.symbol] || null;
      members.push({id:key("stocks",row.symbol), channel:"stocks", symbol:row.symbol, name:row.name,
        nabId, role:"supporting-equity", rationale:nabId ? `Editorial activity analogy to ${NAB.byId(nabId).trait}; supporting context, not a second designated stock.` : "No explicit NAB alignment; review required.",
        catalogContext:JSON.parse(JSON.stringify(row)), source:"reviewed Tickerbot watchlist", classificationStatus:nabId ? "editorial" : "unassigned", liveEligible:true, dataStatus:"unobserved"});
    }
    for (const channel of ["fx","commodities","indices"]) {
      for (const row of sources.staticInstruments(channel)) {
        const nabId = channel === "fx" ? 12 : channel === "indices" ? 54 : commodityAlignment[row.symbol] || null;
        members.push({id:key(channel,row.symbol), channel, symbol:row.symbol, name:row.name, nabId,
          role:"supporting-market", rationale:channel === "fx" ? bankRationale : channel === "indices" ? "Editorial reference-observation alignment; benchmarks remain contextual observations." : `Editorial infrastructure/planning context for ${NAB.byId(nabId)?.theme || "review"}; not an elemental or physical-material assignment.`,
          relatedIds:channel === "fx" ? banks.filter(bank => [row.symbol.slice(0,3),row.symbol.slice(3)].includes(bank.symbol)).map(bank => bank.id) : [],
          catalogContext:JSON.parse(JSON.stringify(row)), source:channel === "fx" ? sources.rankingSource.fx : "reviewed source catalog",
          classificationStatus:nabId ? "editorial" : "unassigned", liveEligible:true, dataStatus:"unobserved"});
      }
    }
    for (const row of crypto) {
      if (!row || typeof row.symbol !== "string" || row.rankingProvider !== "Massive") continue;
      const massiveTicker = typeof row.massiveTicker === "string" ? row.massiveTicker.toUpperCase() : "";
      const providerId = typeof row.providerId === "string" ? row.providerId.toUpperCase() : "";
      if (!/^[A-Z0-9]{2,12}$/.test(row.symbol) || massiveTicker !== `X:${row.symbol.toUpperCase()}USD` || providerId !== massiveTicker) continue;
      const nabId = cryptoAlignment[providerId] || null;
      members.push({id:key("crypto",row.symbol), channel:"crypto", symbol:row.symbol, name:row.name || row.symbol,
        providerId, rankingProvider:"Massive", nabId, role:"supporting-market",
        rationale:nabId ? `Editorial protocol-function alignment with ${NAB.byId(nabId).trait}; not a token risk assessment.` : "No explicit Massive-ticker alignment; review required.",
        catalogContext:JSON.parse(JSON.stringify(row)), source:sources.rankingSource.crypto, classificationStatus:nabId ? "editorial" : "unassigned", liveEligible:true, dataStatus:"unobserved"});
    }
    members.push(...banks);
    // Duplicate identities are ambiguous: reject them rather than merge data.
    const counts = new Map();
    members.forEach(row => counts.set(row.id,(counts.get(row.id) || 0)+1));
    const seen = new Set();
    const unique = members.filter(row => {if (seen.has(row.id)) return false; seen.add(row.id); return true;}).map(row =>
      counts.get(row.id)>1 ? {...row,nabId:null,liveEligible:false,classificationStatus:"ambiguous",rationale:"Duplicate source identity; resolve the catalog conflict before alignment or refresh."} : row);
    return freeze({schema:VERSION, members:unique, discs:NAB.sectors.map(nab => ({
      id:`nab-${nab.id}`, nabId:nab.id, label:`NAB ${nab.id} · ${nab.symbol} · ${nab.name}`,
      theme:nab.theme, designatedStock:nab.ticker
    })), review:unique.filter(row => row.nabId === null)});
  }

  function displacement(market) {
    const close = number(market?.latestBar?.close), basis = number(market?.basis ?? market?.bands?.basis);
    const lower = number(market?.bands?.lower1000), upper = number(market?.bands?.upper1000);
    if (close === null || basis === null || lower === null || upper === null ||
        close <= 0 || basis <= 0 || lower <= 0 || upper <= 0 || lower >= basis || upper <= basis) return null;
    const logClose = Math.log(close), logBasis = Math.log(basis);
    const logLower = Math.log(lower), logUpper = Math.log(upper);
    const halfWidth = logClose >= logBasis ? logUpper - logBasis : logBasis - logLower;
    if (![logClose, logBasis, logLower, logUpper, halfWidth].every(Number.isFinite) || halfWidth <= 0) return null;
    return (logClose - logBasis) / halfWidth;
  }

  function observation(raw) {
    if (!raw || !LEGACY_CHANNELS.includes(raw.channel) || typeof raw.symbol !== "string" || !/^[A-Z0-9._:-]{1,32}$/.test(raw.symbol) ||
        !["massive","tickerbot","alpha"].includes(raw.provider) || !["1h","1d","1mo"].includes(raw.interval) || number(raw.at) === null || raw.at <= 0 || raw.market?.synthetic) return null;
    const market = raw.market && typeof raw.market === "object" ? raw.market : null;
    // Clone before freezing; never freeze a caller's live provider packet.
    return freeze(JSON.parse(JSON.stringify({channel:raw.channel, symbol:raw.symbol,
      provider:raw.provider, interval:raw.interval, at:raw.at, status:text(raw.status) || "unknown",
      market, message:text(raw.message),
      /* Read old browser-local crypto identity keys without treating them as a
         Massive identity. They cannot join the current catalog unless the exact
         Massive providerId is present. */
      providerId:text(raw.providerId) || text(raw.coingeckoId), source:text(raw.source) || "legacy-source-adapter"})));
  }

  function fromLegacy(events = []) {
    return events.flatMap(event => {
      if (!event || !Array.isArray(event.instruments)) return [];
      return event.instruments.map(item => observation({channel:event.discId || event.disc,
        symbol:item.symbol, provider:event.provider, interval:event.interval,
        at:typeof event.at === "number" ? event.at : Date.parse(event.beatAt),
        status:item.status, market:item.market, message:item.message,
        providerId:item.providerId, coingeckoId:item.coingeckoId, source:"legacy-beat-history"})).filter(Boolean);
    });
  }

  function fromSavedBeats(beats = []) {
    // Compact D1 archives do not carry FBB bands. Preserve reported fields,
    // never reconstruct OHLC, volume, or bands from a mood or gauge.
    return beats.flatMap(beat => {
      if (!Array.isArray(beat?.payload?.observations)) return [];
      return beat.payload.observations.map(item => observation({
        channel:beat.discId, symbol:item.ticker, provider:beat.provider,
        interval:beat.payload.entry?.interval, at:beat.beatAt,
        status:item.status, source:"Characters D1 compact archive",
        market: {latestBar:number(item.close) === null ? null : {close:item.close},
          previousClose:number(item.previousClose), archiveContext:JSON.parse(JSON.stringify(item))}
      })).filter(Boolean);
    });
  }

  function mergeObservations(...batches) {
    const result = new Map();
    for (const raw of batches.flat()) {
      const row = observation(raw);
      if (!row) continue;
      const id = `${key(row.channel,row.symbol)}:${row.providerId}:${row.provider}:${row.interval}:${row.market ? "observation" : "attempt"}`;
      if (!result.has(id) || result.get(id).at < row.at) result.set(id,row);
    }
    return freeze([...result.values()]);
  }

  function compose(nabId, {registry = catalog(), observations = [], spheroids = [], materials = [], now = Date.now()} = {}) {
    const designation = globalThis.NabSectors?.designation(nabId);
    if (!designation) return null;
    const clean = [...mergeObservations(observations)].sort((a,b)=>b.at-a.at);
    const members = registry.members.filter(row => row.nabId === nabId).map(row => ({...row,
      observations:clean.filter(item => item.channel === row.channel && item.symbol === row.symbol &&
        (row.channel !== "crypto" || (row.providerId && item.providerId === row.providerId))).map(item => ({...item,
          ageMs:Math.max(0,now-item.at), stale: now-(number(item.market?.latestBar?.time) ?? item.at) > (item.interval === "1h" ? 3600000 : item.interval === "1mo" ? 31*86400000 : 86400000),
          fbbDisplacement:displacement(item.market)}))
    }));
    const physical = spheroids.filter(row => row.nabId === nabId).map(row => ({
      id:row.id, name:row.name, components:(row.components || []).map(component => ({...component,
        material: JSON.parse(JSON.stringify(materials.find(material => material.materialId === component.materialId) || null))}))
    }));
    return freeze({schema:VERSION, id:`nab-${nabId}`, designation, members, physical,
      coverage:{constituents:members.length, observed:members.filter(row => row.observations.some(item => number(item.market?.latestBar?.close) !== null)).length,
        referenceOnly:members.filter(row => row.channel === "central-bank").length, physicalDesigns:physical.length},
      aggregation:"Aligned evidence composite; prices, policy rates and densities are not averaged or treated as material volume fractions.",
      aiContext:{...designation.ai, constituents:members.map(row => ({id:row.id, role:row.role, rationale:row.rationale, sources:[row.source], catalogContext:row.catalogContext || null, relatedIds:row.relatedIds || [], observations:row.observations})),
        physical, missing:members.filter(row => !row.observations.some(item => number(item.market?.latestBar?.close) !== null)).map(row => row.id),
        instructions:designation.ai.instructions + " Treat aligned constituents as one evidence composite. Keep sources, times, units, uncertainty and disagreements separate; never promote an editorial institution alignment into a verified classification."}
    });
  }
  Object.defineProperty(globalThis,"NabComposites",{configurable:true,value:Object.freeze({VERSION,LEGACY_CHANNELS,channelNames,banks,catalog,compose,observation,fromLegacy,fromSavedBeats,mergeObservations,displacement})});
})();
