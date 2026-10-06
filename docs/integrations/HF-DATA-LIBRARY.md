# HF Data Library historical ingestion

**Status:** PR #83 foundation  
**Provider:** `hf-data-library`  
**Timeframe:** `1m`  
**Durable storage:** Cloudflare R2

HF Data Library supplies complete 1-minute ticker histories as Parquet files. The Worker does not download or parse those archives during the Orb heartbeat.

## Storage model

HF Data Library -> R2 raw Parquet -> normalized 5,000-bar analytical tail -> Orb market context.

For each reviewed stock:

- `hf-data-library/raw/clean/<TICKER>.parquet` is the durable source artifact.
- `hf-data-library/normalized/clean/<TICKER>/1m-tail.json.gz` is the operational analytical cache.
- The normalized artifact records provider identity, retrieval time, source row count, source SHA-256, and the retained bars.

The 5,000-bar tail is intentional: the existing market-context layer already bounds OHLCV analysis at 5,000 bars. The complete historical archive remains available in R2 without forcing the Worker to buffer tens of megabytes.

## Ingestion

Install the local dependencies:

```
python -m pip install -r requirements-hf-data-library.txt
```

Set the HF key without committing it:

```
export HF_DATA_LIBRARY_API_KEY='...'
```

Process one reviewed ticker locally:

```
python scripts/hf-data-library-ingest.py AAPL
```

Process and upload one ticker:

```
python scripts/hf-data-library-ingest.py AAPL --upload
```

The uploader uses Wrangler's R2 object command. Full source files never enter the Worker request path.

A complete 52-card ingestion should remain an explicit operator action. Pass the reviewed 52-card list deliberately rather than discovering an upstream universe automatically.

## Runtime

The Worker route is:

```
GET /api/good-intelligence/v1/market/hf-history?symbol=AAPL
```

It reads only the normalized R2 object and returns a `gi-market-context-v1` packet with explicit `hf-data-library` provenance.

Missing history produces structured unavailability. There is no fallback to Tickerbot, Massive, Kraken, or synthetic data.

## Failure boundary

The ingestion process fails closed on:

- missing API key;
- upstream HTTP errors;
- unexpected Parquet schema;
- invalid OHLCV;
- unusable timestamps;
- empty normalized history.

The Worker heartbeat has no HF download path.

## Source semantics

HF Data Library documents the 1-minute schema as `datetime`, OHLCV, and `source`, with timestamps documented as Eastern Time. The ingestion code explicitly converts those timestamps to UTC rather than guessing.

The project should preserve HF Data Library attribution wherever HF-derived observations are publicly displayed.
