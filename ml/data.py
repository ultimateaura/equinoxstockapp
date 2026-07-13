"""
data.py - Download free daily price history from the Yahoo Finance chart API.

This mirrors what the app uses at runtime (utils/marketDataService.ts), so the
training data matches production data. Responses are cached to ml/cache/ as JSON
to avoid re-downloading. No API key required.

(We previously used Stooq, but it now serves a JS anti-bot challenge instead of
CSV, so it is unusable from a script/app.)
"""

from __future__ import annotations
import json
import os
import time
import urllib.request
import numpy as np

CACHE_DIR = os.path.join(os.path.dirname(__file__), "cache")
YAHOO_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{sym}?range=10y&interval=1d"


def _cache_path(symbol: str) -> str:
    os.makedirs(CACHE_DIR, exist_ok=True)
    return os.path.join(CACHE_DIR, f"{symbol.lower()}.json")


def download_dated(symbol: str, max_age_days: int = 1):
    """Return (dates, closes) sorted oldest->newest. Empty on failure."""
    path = _cache_path(symbol)
    if os.path.exists(path) and (time.time() - os.path.getmtime(path)) < max_age_days * 86400:
        with open(path) as f:
            payload = json.load(f)
        return payload["dates"], np.array(payload["closes"], dtype=float)

    try:
        url = YAHOO_URL.format(sym=symbol)
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as exc:  # noqa: BLE001
        print(f"  ! download failed for {symbol}: {exc}")
        return [], np.array([])

    result = (data.get("chart", {}).get("result") or [None])[0]
    if not result:
        return [], np.array([])
    timestamps = result.get("timestamp") or []
    quote = (result.get("indicators", {}).get("quote") or [{}])[0]
    closes_raw = quote.get("close") or []

    import datetime as dt

    dates, closes = [], []
    for ts, c in zip(timestamps, closes_raw):
        if c is None:
            continue
        dates.append(dt.datetime.utcfromtimestamp(ts).strftime("%Y-%m-%d"))
        closes.append(float(c))

    with open(path, "w") as f:
        json.dump({"dates": dates, "closes": closes}, f)

    return dates, np.array(closes, dtype=float)


def download_history(symbol: str, max_age_days: int = 1) -> np.ndarray:
    """Just the closes (oldest -> newest)."""
    _, closes = download_dated(symbol, max_age_days)
    return closes


# A small, liquid large-cap universe to train on. Expand as you like.
DEFAULT_UNIVERSE = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA", "JPM", "V", "MA",
    "UNH", "HD", "PG", "JNJ", "XOM", "CVX", "KO", "PEP", "COST", "WMT",
    "DIS", "NFLX", "ADBE", "CRM", "INTC", "AMD", "QCOM", "TXN", "ORCL", "CSCO",
    "NKE", "MCD", "SBUX", "BA", "CAT", "GE", "GS", "MS", "BAC", "WFC",
    "PFE", "MRK", "ABBV", "TMO", "ABT", "LLY", "AVGO", "ACN", "IBM", "T",
]

BENCHMARK = "SPY"
