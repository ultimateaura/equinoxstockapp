import { GoogleGenAI } from '@google/genai';
import { getGeminiApiKey } from './env';

let client: GoogleGenAI | null = null;

/**
 * Shared Gemini client, created on first use.
 *
 * The SDK throws if constructed without a key, so building it at module load
 * would crash the whole app when GEMINI_API_KEY is missing. Creating it lazily
 * means only the AI feature that needs it fails, with a clear message.
 */
export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY is not set. Add it to .env (see .env.example) and restart Metro.'
      );
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}
