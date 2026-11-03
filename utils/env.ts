import Constants from 'expo-constants';

type Extra = {
  FINNHUB_API_KEY?: string;
  GEMINI_API_KEY?: string;
  ALPHA_VANTAGE_API_KEY?: string;
  [key: string]: any;
};

// Keys come only from .env (via app.config.ts `extra`). Never hardcode them
// here: anything committed to git ends up public. See .env.example.

function getExtra(): Extra {
  // Works in dev with Expo Go
  const fromExpoConfig = Constants.expoConfig?.extra as Extra | undefined;
  // Works in production builds with newer Expo (manifest2)
  const fromManifest2 = (Constants as any).manifest2?.extra as Extra | undefined;
  // Legacy manifest fallback
  const fromManifest = (Constants as any).manifest?.extra as Extra | undefined;
  return fromExpoConfig ?? fromManifest2 ?? fromManifest ?? {};
}

export function getFinnhubApiKey(): string {
  const extra = getExtra();
  // Also allow EXPO_PUBLIC_ fallbacks if user opts for public envs
  return (
    extra.FINNHUB_API_KEY ||
    (process.env as any)?.EXPO_PUBLIC_FINNHUB_API_KEY ||
    ''
  );
}

export function getGeminiApiKey(): string {
  const extra = getExtra();
  return (
    extra.GEMINI_API_KEY ||
    (process.env as any)?.EXPO_PUBLIC_GEMINI_API_KEY ||
    ''
  );
}

export function getAlphaVantageApiKey(): string {
  const extra = getExtra();
  return (
    extra.ALPHA_VANTAGE_API_KEY ||
    (process.env as any)?.EXPO_PUBLIC_ALPHA_VANTAGE_API_KEY ||
    ''
  );
}


