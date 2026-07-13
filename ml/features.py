"""
features.py - Python port of utils/quant/features.ts (and indicators.ts).

This MUST stay in lockstep with the TypeScript version. The on-device app and
this training script have to compute features identically, or the model will
behave differently in production than it did in training ("train/serve skew").

FEATURE_NAMES order is the contract shared with the app via recommender.json.
"""

from __future__ import annotations
import numpy as np

FEATURE_NAMES = [
    "mom3",
    "mom6",
    "mom12",
    "volAnn",
    "rsi14",
    "priceToSMA50",
    "priceToSMA200",
    "maxDD",
    "beta",
    "relReturn6",
    "pe",
    "pb",
]


def daily_returns(prices: np.ndarray) -> np.ndarray:
    prices = np.asarray(prices, dtype=float)
    prev = prices[:-1]
    nxt = prices[1:]
    mask = prev > 0
    return (nxt[mask] - prev[mask]) / prev[mask]


def sma(values: np.ndarray, window: int) -> float:
    if len(values) < window or window <= 0:
        return float("nan")
    return float(np.mean(values[-window:]))


def annualized_volatility(returns: np.ndarray) -> float:
    if len(returns) < 2:
        return 0.0
    return float(np.std(returns, ddof=1) * np.sqrt(252))


def rsi(prices: np.ndarray, period: int = 14) -> float:
    prices = np.asarray(prices, dtype=float)
    if len(prices) < period + 1:
        return 50.0
    deltas = np.diff(prices)
    gains = np.where(deltas > 0, deltas, 0.0)
    losses = np.where(deltas < 0, -deltas, 0.0)
    avg_gain = gains[:period].mean()
    avg_loss = losses[:period].mean()
    for i in range(period, len(deltas)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return float(100 - 100 / (1 + rs))


def max_drawdown(prices: np.ndarray) -> float:
    prices = np.asarray(prices, dtype=float)
    if len(prices) == 0:
        return 0.0
    peak = prices[0]
    max_dd = 0.0
    for p in prices:
        if p > peak:
            peak = p
        if peak > 0:
            dd = p / peak - 1
            if dd < max_dd:
                max_dd = dd
    return abs(max_dd)


def trailing_return(prices: np.ndarray, lookback: int) -> float:
    if len(prices) <= lookback:
        return 0.0
    start = prices[-1 - lookback]
    end = prices[-1]
    if start <= 0:
        return 0.0
    return float(end / start - 1)


def beta(stock_returns: np.ndarray, market_returns: np.ndarray) -> float:
    n = min(len(stock_returns), len(market_returns))
    if n < 2:
        return 1.0
    s = stock_returns[-n:]
    m = market_returns[-n:]
    var_m = np.var(m, ddof=1)
    if var_m == 0:
        return 1.0
    cov = np.cov(s, m, ddof=1)[0, 1]
    return float(cov / var_m)


def build_feature_vector(
    closes: np.ndarray,
    benchmark_closes: np.ndarray | None = None,
    pe_ratio: float | None = None,
    price_to_book: float | None = None,
) -> list[float]:
    closes = np.asarray(closes, dtype=float)
    price = closes[-1] if len(closes) else 0.0
    sma50 = sma(closes, 50)
    sma200 = sma(closes, 200)
    rets = daily_returns(closes)

    mom6 = trailing_return(closes, 126)
    bench_mom6 = trailing_return(benchmark_closes, 126) if benchmark_closes is not None else 0.0
    beta_val = beta(rets, daily_returns(benchmark_closes)) if benchmark_closes is not None else 1.0

    return [
        trailing_return(closes, 63),
        mom6,
        trailing_return(closes, 252),
        annualized_volatility(rets),
        rsi(closes),
        (price / sma50 - 1) if (np.isfinite(sma50) and sma50 > 0) else 0.0,
        (price / sma200 - 1) if (np.isfinite(sma200) and sma200 > 0) else 0.0,
        max_drawdown(closes),
        beta_val,
        mom6 - bench_mom6,
        pe_ratio if (pe_ratio and pe_ratio > 0) else 22.0,
        price_to_book if (price_to_book and price_to_book > 0) else 4.0,
    ]
