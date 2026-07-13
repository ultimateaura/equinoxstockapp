"""
train.py - Train the on-device recommender and export it for the app.

Pipeline:
  1. Download daily history for a universe + SPY (data.py).
  2. Build a supervised dataset:
       X = feature vector at day t (uses ONLY data up to t -> no look-ahead bias)
       y = 1 if the stock's next-21-day return beats SPY's, else 0
  3. Train a small MLP (and a logistic-regression baseline) with a chronological
     train/validation split (walk-forward, never shuffle time series randomly).
  4. Export the MLP to assets/models/recommender.json in the exact format that
     utils/quant/mlModel.ts reads.

Run:  python ml/train.py
"""

from __future__ import annotations
import json
import os
import datetime as dt
import numpy as np

from features import FEATURE_NAMES, build_feature_vector
from data import DEFAULT_UNIVERSE, BENCHMARK, download_dated

HORIZON = 21          # trading days (~1 month)
MIN_HISTORY = 252     # need at least a year of history for features
SAMPLE_EVERY = 5      # subsample dates to reduce overlapping windows
OUT_PATH = os.path.join(
    os.path.dirname(__file__), "..", "assets", "models", "recommender.json"
)


def build_dataset():
    print(f"Downloading benchmark {BENCHMARK}...")
    bench_dates, bench_closes = download_dated(BENCHMARK)
    bench_index = {d: i for i, d in enumerate(bench_dates)}

    X, y, sample_dates = [], [], []

    for sym in DEFAULT_UNIVERSE:
        print(f"Processing {sym}...")
        dates, closes = download_dated(sym)
        if len(closes) < MIN_HISTORY + HORIZON + 5:
            continue

        for t in range(MIN_HISTORY, len(closes) - HORIZON, SAMPLE_EVERY):
            d = dates[t]
            if d not in bench_index:
                continue
            bt = bench_index[d]
            if bt + HORIZON >= len(bench_closes):
                continue

            # Features use only data up to and including day t.
            feats = build_feature_vector(
                closes[: t + 1],
                benchmark_closes=bench_closes[: bt + 1],
            )

            stock_fwd = closes[t + HORIZON] / closes[t] - 1
            bench_fwd = bench_closes[bt + HORIZON] / bench_closes[bt] - 1
            label = 1 if stock_fwd > bench_fwd else 0

            X.append(feats)
            y.append(label)
            sample_dates.append(d)

    return np.array(X, dtype=float), np.array(y, dtype=float), np.array(sample_dates)


def main():
    X, y, dates = build_dataset()
    if len(X) < 200:
        raise SystemExit(f"Not enough samples ({len(X)}). Check network/universe.")

    print(f"\nDataset: {len(X)} samples, {X.shape[1]} features. "
          f"Positive rate: {y.mean():.2%}")

    # Chronological split (walk-forward): train on the past, validate on the future.
    order = np.argsort(dates)
    X, y = X[order], y[order]
    split = int(len(X) * 0.8)
    X_train, X_val = X[:split], X[split:]
    y_train, y_val = y[:split], y[split:]

    # Standardize using TRAIN statistics only.
    mean = X_train.mean(axis=0)
    std = X_train.std(axis=0)
    std[std == 0] = 1.0
    Xtr = (X_train - mean) / std
    Xva = (X_val - mean) / std

    from tensorflow import keras  # imported here so the rest runs without TF

    model = keras.Sequential([
        keras.layers.Input(shape=(X.shape[1],)),
        keras.layers.Dense(16, activation="relu"),
        keras.layers.Dense(8, activation="relu"),
        keras.layers.Dense(1, activation="sigmoid"),
    ])
    model.compile(optimizer="adam", loss="binary_crossentropy", metrics=["AUC"])
    model.fit(
        Xtr, y_train,
        validation_data=(Xva, y_val),
        epochs=40, batch_size=64, verbose=2,
    )

    val_auc = model.evaluate(Xva, y_val, verbose=0)[1]
    print(f"\nValidation AUC: {val_auc:.3f} (0.5 = no skill)")

    export_model(model, mean, std)
    print(f"Exported model -> {os.path.abspath(OUT_PATH)}")


def export_model(model, mean, std):
    """Serialize Keras Dense layers into the JSON format mlModel.ts expects."""
    layers = []
    for layer in model.layers:
        weights = layer.get_weights()
        if len(weights) != 2:
            continue  # skip non-dense
        kernel, bias = weights  # kernel shape: (input, units)
        activation = layer.get_config().get("activation", "linear")
        layers.append({
            "activation": activation,
            "bias": bias.astype(float).tolist(),
            "weights": kernel.astype(float).tolist(),
        })

    spec = {
        "version": 1,
        "trainedOn": dt.datetime.utcnow().strftime("%Y-%m-%d"),
        "horizonDays": HORIZON,
        "objective": "P(stock total return > SPY total return over horizon)",
        "featureNames": FEATURE_NAMES,
        "scaler": {"mean": [float(x) for x in mean], "std": [float(x) for x in std]},
        "layers": layers,
    }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w") as f:
        json.dump(spec, f, indent=2)


if __name__ == "__main__":
    main()
