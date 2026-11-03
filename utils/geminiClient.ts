import type { GenerateContentParameters, GenerateContentResponse } from '@google/genai';
import { proxyFetch } from './apiProxy';

/** The parts of the SDK response the app reads, plus the SDK's `text` shortcut. */
export type GeminiResponse = Pick<
  GenerateContentResponse,
  'candidates' | 'promptFeedback' | 'usageMetadata'
> & { text: string | undefined };

export interface GeminiClient {
  models: {
    generateContent(params: GenerateContentParameters): Promise<GeminiResponse>;
  };
}

/**
 * Gemini through the API proxy, so the key never ships in the app.
 *
 * Mirrors the slice of the @google/genai client the app uses
 * (`models.generateContent` with `{ model, contents, config }`), so call
 * sites read the same as with the SDK. Only types come from the SDK.
 */
const client: GeminiClient = {
  models: {
    async generateContent(params) {
      const res = await proxyFetch('/gemini/generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = data?.error?.message || data?.error || `HTTP ${res.status}`;
        throw new Error(`Gemini request failed: ${message}`);
      }

      // Same rule as the SDK's `text` getter: join the first candidate's text
      // parts, skipping thought summaries; undefined when there are none.
      const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
      const textParts = parts.filter((p) => typeof p?.text === 'string' && !p.thought);
      return {
        candidates: data.candidates,
        promptFeedback: data.promptFeedback,
        usageMetadata: data.usageMetadata,
        text: textParts.length > 0 ? textParts.map((p) => p.text).join('') : undefined,
      };
    },
  },
};

export function getGeminiClient(): GeminiClient {
  return client;
}
