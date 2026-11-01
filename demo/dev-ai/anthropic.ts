import Anthropic from '@anthropic-ai/sdk';
import type { AiEnv, ModelStream } from './model-stream.ts';

/** Claude through the Anthropic API, keyed by `ANTHROPIC_API_KEY` or an `ant auth login` profile. */
export function anthropicStream(env: AiEnv, model: string): ModelStream {
  return async function* ({ system, user }, signal) {
    try {
      const client = new Anthropic(env.ANTHROPIC_API_KEY ? { apiKey: env.ANTHROPIC_API_KEY } : {});
      const stream = client.beta.messages.stream(
        {
          model,
          max_tokens: 64_000,
          output_config: { effort: 'low' },
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          system,
          messages: [{ role: 'user', content: user }],
        },
        { signal },
      );
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') yield event.delta.text;
      }
      if ((await stream.finalMessage()).stop_reason === 'refusal') throw new Error('Claude declined this request.');
    } catch (error) {
      throw new Error(describe(error), { cause: error });
    }
  };
}

function describe(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) return 'The Anthropic API refused the key: check ANTHROPIC_API_KEY.';
  if (error instanceof Anthropic.RateLimitError) return 'The Anthropic API is rate limiting this key: try again shortly.';
  if (error instanceof Anthropic.APIError) return `The Anthropic API answered ${error.status}: ${error.message}`;
  return error instanceof Error ? error.message : String(error);
}
