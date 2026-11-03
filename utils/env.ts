// Third-party API keys (Gemini, Finnhub, Alpha Vantage) never live in the app:
// anything Expo bundles can be extracted from a build. They are secrets on the
// API proxy in proxy/ instead, and the app only needs the proxy's URL.

export function getApiProxyUrl(): string {
  // Expo inlines EXPO_PUBLIC_* at build time; it must be read with this exact
  // `process.env.EXPO_PUBLIC_...` expression for that to work.
  const url = process.env.EXPO_PUBLIC_API_PROXY_URL || '';
  return url.replace(/\/+$/, '');
}
