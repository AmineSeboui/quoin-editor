import type { IncomingMessage, ServerResponse } from 'node:http';
import { json } from 'node:stream/consumers';
import { loadEnv, type Plugin } from 'vite';
import type { ModelStream } from './model-stream.ts';
import { pickModel } from './pick-model.ts';
import { isAiRequest, promptFor } from './prompt.ts';

const TEXT = { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' };

/** In `vite --mode ai`, answers the AI demo through `api/ai` from a real model, with keys that stay on this machine. */
export function devAi(base: string): Plugin {
  return {
    name: 'quoin-site-dev-ai',
    apply: (_, { command, mode }) => command === 'serve' && mode === 'ai',
    configureServer(server) {
      const { mode, envDir, root, logger } = server.config;
      const { label, stream } = pickModel(loadEnv(mode, envDir || root, ['ANTHROPIC_', 'GEMINI_', 'QUOIN_AI_']));
      logger.info(`  AI demo answers from ${label}`);
      server.middlewares.use(`${base}api/ai`, (request, response, next) => {
        if (request.method !== 'POST') return next();
        void answer(stream, request, response);
      });
    },
  };
}

async function answer(stream: ModelStream, request: IncomingMessage, response: ServerResponse): Promise<void> {
  const body: unknown = await json(request).catch(() => undefined);
  if (!isAiRequest(body)) return fail(response, 400, 'The body is not an AI request.');
  const abort = new AbortController();
  response.on('close', () => abort.abort());
  try {
    for await (const text of stream(promptFor(body), abort.signal)) {
      if (!response.headersSent) response.writeHead(200, TEXT);
      response.write(text);
    }
    if (!response.headersSent) response.writeHead(200, TEXT);
    response.end();
  } catch (error) {
    fail(response, 502, error instanceof Error ? error.message : String(error));
  }
}

function fail(response: ServerResponse, status: number, message: string): void {
  if (response.destroyed) return;
  // Part of the answer has gone out with a 200, so only a cut connection still tells the editor it failed.
  if (response.headersSent) response.destroy();
  else response.writeHead(status, TEXT).end(message);
}
