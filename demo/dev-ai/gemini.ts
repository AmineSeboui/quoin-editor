import { ApiError, FinishReason, GoogleGenAI, ThinkingLevel } from '@google/genai';
import type { AiEnv, ModelStream } from './model-stream.ts';

const FINISHED: ReadonlySet<string | undefined> = new Set([undefined, FinishReason.STOP, FinishReason.MAX_TOKENS]);

/** Gemini through the Gemini API, keyed by `GEMINI_API_KEY`. */
export function geminiStream(env: AiEnv, model: string): ModelStream {
  return async function* ({ system, user }, signal) {
    try {
      const client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
      const chunks = await client.models.generateContentStream({
        model,
        contents: user,
        config: { systemInstruction: system, abortSignal: signal, thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
      });
      let finish: string | undefined;
      for await (const chunk of chunks) {
        if (chunk.promptFeedback?.blockReason) throw new Error('Gemini declined this request.');
        if (chunk.text) yield chunk.text;
        finish = chunk.candidates?.[0]?.finishReason ?? finish;
      }
      if (!FINISHED.has(finish)) throw new Error(`Gemini stopped the answer: ${finish}.`);
    } catch (error) {
      throw new Error(describe(error, model), { cause: error });
    }
  };
}

function describe(error: unknown, model: string): string {
  if (error instanceof ApiError && error.status === 429) {
    return `The Gemini API has no quota left for ${model} on this key: check its plan, or set QUOIN_AI_MODEL to another model.`;
  }
  if (error instanceof ApiError) return `The Gemini API answered ${error.status}: ${error.message}`;
  return error instanceof Error ? error.message : String(error);
}
