# ML training pipeline

Offline trainer for the on-device recommendation model. It learns to predict
the probability that a stock beats the market (SPY) over the next ~21 trading
days, then exports the trained network to
`assets/models/recommender.json` — the same file the app loads at runtime.

This folder is **not** shipped in the app bundle; only the exported JSON is.

## How it fits together

```
ml/features.py   <-- mirror of utils/quant/features.ts (keep in sync!)
ml/data.py       <-- free daily history from the Yahoo Finance chart API (no key)
ml/train.py      <-- builds dataset, trains MLP, exports recommender.json
        |
        v
assets/models/recommender.json  --> utils/quant/mlModel.ts (on-device inference)
```

## Run it

```bash
cd ml
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python train.py
```

`train.py` will:
1. Download daily prices (Yahoo Finance) for the universe in `data.py` + SPY (cached in `ml/cache/`).
2. Build features using **only past data** at each date (no look-ahead bias).
3. Label each sample 1 if the stock outperformed SPY over the next 21 days.
4. Train with a **chronological** train/validation split (walk-forward) and print
   the validation AUC (0.5 = no predictive skill; expect a small edge on free
   daily data — that is normal and honest).
5. Overwrite `assets/models/recommender.json`.

Restart the app/Metro after exporting so the new model is bundled.

## Important notes

- **Keep `features.py` identical to `utils/quant/features.ts`.** If you change one,
  change the other and retrain, or the app and model will disagree.
- The shipped `recommender.json` starts as a hand-tuned "starter" model so the app
  works before you ever train. Running `train.py` replaces it with a learned one.
- This is educational. A model trained on free daily data is weak; treat its
  output as one input among several, never a guarantee.
