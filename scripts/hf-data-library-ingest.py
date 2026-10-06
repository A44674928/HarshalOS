#!/usr/bin/env python3
"""HF Data Library -> R2 ingestion helper.

Downloads one complete 1-minute Parquet archive outside the Worker, preserves
the raw archive in R2, and publishes a bounded 5,000-bar normalized tail.
"""
from __future__ import annotations
import argparse, gzip, hashlib, json, os, subprocess, tempfile
from pathlib import Path
import pandas as pd
import requests

API_ROOT = "https://api.hfdatalibrary.com/v1"
VERSION = "clean"
TAIL_LIMIT = 5000
BUCKET = os.getenv("R2_BUCKET", "main-empty-domains")
REQUIRED = {"datetime", "open", "high", "low", "close", "volume"}

def download(ticker: str, destination: Path) -> None:
    key = os.environ.get("HF_DATA_LIBRARY_API_KEY")
    if not key:
        raise RuntimeError("HF_DATA_LIBRARY_API_KEY is required.")
    url = f"{API_ROOT}/bars/{ticker}?version={VERSION}"
    with requests.get(url, headers={"X-API-Key": key}, stream=True, timeout=180) as response:
        response.raise_for_status()
        with destination.open("wb") as handle:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    handle.write(chunk)

def normalize(ticker: str, parquet_path: Path, output: Path) -> dict:
    df = pd.read_parquet(parquet_path)
    df.columns = [str(c).lower() for c in df.columns]
    if not REQUIRED.issubset(df.columns):
        raise RuntimeError(f"{ticker}: unexpected columns {sorted(df.columns)}")
    df = df.sort_values("datetime").drop_duplicates("datetime", keep="last")
    df = df.dropna(subset=list(REQUIRED))
    for col in ["open", "high", "low", "close", "volume"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.dropna(subset=["open", "high", "low", "close", "volume"])
    df = df[(df.open > 0) & (df.high > 0) & (df.low > 0) & (df.close > 0) & (df.volume >= 0)]
    if df.empty:
        raise RuntimeError(f"{ticker}: no usable bars after normalization")

    # HF documents datetime as Eastern Time, tz-naive. Convert explicitly.
    dt = pd.to_datetime(df["datetime"], errors="coerce")
    dt = dt.dt.tz_localize("America/New_York", ambiguous="infer", nonexistent="shift_forward").dt.tz_convert("UTC")
    df["datetime"] = dt
    df = df.dropna(subset=["datetime"]).sort_values("datetime")
    tail = df.tail(TAIL_LIMIT)

    bars = []
    for row in tail.itertuples(index=False):
        bars.append({
            "time": row.datetime.isoformat().replace("+00:00", "Z"),
            "open": float(row.open), "high": float(row.high),
            "low": float(row.low), "close": float(row.close),
            "volume": float(row.volume), "confirmed": True
        })

    payload = {
        "schema": "gi-hf-history-v1",
        "provider": "hf-data-library",
        "symbol": ticker,
        "timeframe": "1m",
        "version": VERSION,
        "retrievedAt": int(pd.Timestamp.now(tz="UTC").timestamp() * 1000),
        "sourceRows": int(len(df)),
        "availableBars": len(bars),
        "sourceSha256": hashlib.sha256(parquet_path.read_bytes()).hexdigest(),
        "bars": bars
    }
    with gzip.open(output, "wt", encoding="utf-8") as handle:
        json.dump(payload, handle, separators=(",", ":"))
    return payload

def upload(path: Path, key: str, content_type: str, encoding: str | None = None) -> None:
    command = [
        "npx", "wrangler", "r2", "object", "put", f"{BUCKET}/{key}",
        "--remote", "--file", str(path), "--content-type", content_type, "--force"
    ]
    if encoding:
        command += ["--content-encoding", encoding]
    subprocess.run(command, check=True)

def ingest(ticker: str, do_upload: bool) -> None:
    ticker = ticker.strip().upper()
    if not ticker or not all(c.isalnum() or c in ".-" for c in ticker):
        raise RuntimeError(f"Invalid ticker: {ticker}")
    with tempfile.TemporaryDirectory(prefix=f"hf-{ticker}-") as temp:
        root = Path(temp)
        parquet = root / f"{ticker}.parquet"
        normalized = root / f"{ticker}-1m-tail.json.gz"
        print(f"{ticker}: downloading HF Data Library Parquet...")
        download(ticker, parquet)
        print(f"{ticker}: downloaded {parquet.stat().st_size / 1024 / 1024:.1f} MiB")
        payload = normalize(ticker, parquet, normalized)
        raw_key = f"hf-data-library/raw/{VERSION}/{ticker}.parquet"
        normalized_key = f"hf-data-library/normalized/{VERSION}/{ticker}/1m-tail.json.gz"
        if do_upload:
            print(f"{ticker}: uploading raw archive to R2...")
            upload(parquet, raw_key, "application/vnd.apache.parquet")
            print(f"{ticker}: uploading normalized tail to R2...")
            upload(normalized, normalized_key, "application/json", "gzip")
        print(json.dumps({
            "ticker": ticker, "sourceRows": payload["sourceRows"],
            "normalizedBars": payload["availableBars"],
            "rawBytes": parquet.stat().st_size,
            "sourceSha256": payload["sourceSha256"], "uploaded": do_upload
        }, indent=2))

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("tickers", nargs="+")
    parser.add_argument("--upload", action="store_true")
    args = parser.parse_args()
    for ticker in args.tickers:
        ingest(ticker, args.upload)

if __name__ == "__main__":
    main()
