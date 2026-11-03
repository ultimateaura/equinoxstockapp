# Equinox API proxy

A Cloudflare Worker that keeps the Gemini, Finnhub and Alpha Vantage API keys
off the app. Anything Expo bundles (including `app.config.ts` `extra` and
`EXPO_PUBLIC_*` variables) can be pulled out of a build, so the app only knows
this proxy's URL and the keys exist only as Worker secrets.

- **Auth:** every request needs `Authorization: Bearer <Firebase ID token>`
  for project `stock-advisor-app`. The Worker verifies the token's signature
  against Google's public keys, plus its issuer, audience and expiry.
- **Rate limits (per Firebase uid):** 20 Gemini calls/min, 120 data calls/min
  (`ratelimits` in `wrangler.jsonc`). Over the limit returns 429.
- **Endpoints:** only what the app uses.

| Route | Upstream |
| --- | --- |
| `POST /gemini/generateContent` | Gemini `models/{model}:generateContent`. Body is the SDK's `{ model, contents, config }`; models limited to those the app uses, `maxOutputTokens` capped at 4096. |
| `GET /finnhub/{search, quote, stock/profile2, stock/candle, stock/symbol, news, company-news}` | `finnhub.io/api/v1/...` with the key added as a header. |
| `GET /alphavantage?function=TIME_SERIES_DAILY&symbol=..&outputsize=..` | Alpha Vantage. Returns 503 if `ALPHA_VANTAGE_API_KEY` isn't set (the app then skips that fallback). |

The client side lives in `utils/apiProxy.ts` (URL + ID token),
`utils/geminiClient.ts`, `utils/stockApi.ts`, `utils/newsService.ts` and
`utils/marketDataService.ts`.

## Run locally

```bash
cd proxy
npm install
```

Create `proxy/.dev.vars` (gitignored) with your keys:

```
GEMINI_API_KEY=...
FINNHUB_API_KEY=...
ALPHA_VANTAGE_API_KEY=...
```

```bash
npm run dev            # http://localhost:8787
```

In the app's `.env` set `EXPO_PUBLIC_API_PROXY_URL=http://localhost:8787` and
restart Metro. The iOS simulator reaches `localhost` on your Mac directly; a
physical phone needs your Mac's LAN IP (`npx wrangler dev --ip 0.0.0.0`) or the
deployed URL.

## Deploy (free plan)

1. Create a free Cloudflare account, then from `proxy/`:

   ```bash
   npx wrangler login
   ```

2. Add the keys as secrets (prompts for each value; they're stored encrypted
   on Cloudflare, never in this repo):

   ```bash
   npx wrangler secret put GEMINI_API_KEY
   npx wrangler secret put FINNHUB_API_KEY
   npx wrangler secret put ALPHA_VANTAGE_API_KEY
   ```

   The first `secret put` offers to create the Worker if it doesn't exist yet.

3. Deploy:

   ```bash
   npm run deploy
   ```

   Wrangler prints the URL, e.g.
   `https://equinox-api-proxy.<your-subdomain>.workers.dev`.

4. Point the app at it: set `EXPO_PUBLIC_API_PROXY_URL` to that URL in `.env`
   (and in EAS env vars for store builds), then restart Metro / rebuild.

5. Check it: an unauthenticated request should be rejected.

   ```bash
   curl -i https://equinox-api-proxy.<your-subdomain>.workers.dev/finnhub/quote?symbol=AAPL
   # HTTP/2 401  {"error":"Unauthorized"}
   ```

To rotate a key, run `npx wrangler secret put <NAME>` again. It takes effect
immediately with no app release.

Free-plan limits: 100,000 requests/day and 10 ms CPU per request. The proxy
does almost no CPU work itself (waiting on upstream APIs doesn't count).

## Adding an endpoint

Add the Finnhub path to `FINNHUB_PATHS`, the Gemini model to `GEMINI_MODELS`,
or the Alpha Vantage function to `ALPHA_VANTAGE_FUNCTIONS` in `src/index.ts`,
then redeploy. Anything not listed returns 404/400.
