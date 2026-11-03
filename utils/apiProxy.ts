import { auth } from '../config/firebase';
import { getApiProxyUrl } from './env';

/**
 * Helpers for calling the Equinox API proxy (see proxy/README.md), which holds
 * the Gemini, Finnhub and Alpha Vantage keys server-side. Every request is
 * authenticated with the signed-in user's Firebase ID token.
 */

/** Absolute proxy URL for `path` (e.g. '/finnhub/quote'). */
export function proxyUrl(path: string): string {
  const base = getApiProxyUrl();
  if (!base) {
    throw new Error(
      'EXPO_PUBLIC_API_PROXY_URL is not set. Add it to .env (see .env.example) and restart Metro.'
    );
  }
  return `${base}${path}`;
}

/** `Authorization` header for the current user. Throws if nobody is signed in. */
export async function proxyAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to use this feature.');
  // getIdToken() returns the cached token and refreshes it when it is close to expiring.
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

/** fetch() against the proxy with the user's ID token attached. */
export async function proxyFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = proxyUrl(path);
  const headers = { ...(init.headers as Record<string, string>), ...(await proxyAuthHeaders()) };
  return fetch(url, { ...init, headers });
}
