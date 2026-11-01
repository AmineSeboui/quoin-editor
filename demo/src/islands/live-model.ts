import type { AiStream } from 'quoin-editor/ai';

/** Streams the answer of the real model behind the dev server's `api/ai`, which only `npm run dev:ai` serves. */
export const liveModel: AiStream = async function* (request, signal) {
  const response = await fetch(`${import.meta.env.BASE_URL}api/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  });
  if (!response.ok || response.body === null) {
    throw new Error((await response.text()) || `The AI route answered ${response.status}.`);
  }
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  for (let next = await reader.read(); !next.done; next = await reader.read()) yield next.value;
};
