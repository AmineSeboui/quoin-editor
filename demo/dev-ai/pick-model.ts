import { anthropicStream } from './anthropic.ts';
import { geminiStream } from './gemini.ts';
import type { AiEnv, ModelStream } from './model-stream.ts';

const PROVIDERS = {
  anthropic: { model: 'claude-opus-5-5', stream: anthropicStream },
  gemini: { model: 'gemini-flash-lite-latest', stream: geminiStream },
};

const isProvider = (name: string): name is keyof typeof PROVIDERS => Object.hasOwn(PROVIDERS, name);

/**
 * The model the route answers from: the provider `QUOIN_AI_PROVIDER` names, else Gemini when only its key is set, else
 * Claude; and the model `QUOIN_AI_MODEL` names, else the provider's own.
 */
export function pickModel(env: AiEnv): { label: string; stream: ModelStream } {
  const provider = env.QUOIN_AI_PROVIDER || (env.GEMINI_API_KEY && !env.ANTHROPIC_API_KEY ? 'gemini' : 'anthropic');
  if (!isProvider(provider)) {
    throw new Error(`QUOIN_AI_PROVIDER is "${provider}"; use one of ${Object.keys(PROVIDERS).join(', ')}.`);
  }
  const model = env.QUOIN_AI_MODEL || PROVIDERS[provider].model;
  return { label: `${provider} ${model}`, stream: PROVIDERS[provider].stream(env, model) };
}
