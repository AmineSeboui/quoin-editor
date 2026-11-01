import type { AiAction, AiRequest, AiStream } from 'quoin-editor/ai';
import { AI_DRAFT } from '../content/ai-document';

const WORD_MS = 45;

const REWRITES: Partial<Record<AiAction, string>> = {
  fix: 'Quoin keeps every text block as markdown, so you can diff it in git and hand it to an LLM.',
  improve: 'Quoin stores every text block as plain markdown, so you can review it in git or hand it straight to an LLM.',
  shorten: 'Quoin stores text as markdown you can diff and hand to an LLM.',
};

const firstSentence = (markdown: string) => markdown.replace(/[#>*_`-]/g, '').trim().split(/(?<=[.!?])\s/)[0] ?? '';

/** What the simulated model answers: canned text shaped by the action, never a real model's. */
function answerFor({ action, prompt, selection }: AiRequest): string {
  const rewrite = selection.trim() === AI_DRAFT ? REWRITES[action] : undefined;
  if (rewrite) return rewrite;
  switch (action) {
    case 'continue':
      return 'Writers get live formatting and a slash menu, and every answer streams in as markdown that is accepted in one undo step.';
    case 'summarize':
      return `In short: ${firstSentence(selection) || 'the document is made of blocks.'}`;
    case 'explain':
      return 'Each block is typed data, and each text block stores its markdown, so the document stays readable on disk.';
    case 'shorten':
      return firstSentence(selection) || 'Shorter.';
    case 'translate':
      return `(${prompt ?? 'Another language'}) ${selection}`;
    case 'custom':
      return `You asked: “${prompt ?? ''}”. A real host would send that to its model.`;
    default:
      return `${selection.trim()} Now clearer, as a model would put it.`;
  }
}

const pause = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    });
  });

/** Streams a canned answer word by word, as a model's would arrive, and stops when the signal aborts. */
export const simulatedModel: AiStream = async function* (request, signal) {
  for (const word of answerFor(request).split(/(?<= )/)) {
    await pause(WORD_MS, signal);
    if (signal.aborted) return;
    yield word;
  }
};
