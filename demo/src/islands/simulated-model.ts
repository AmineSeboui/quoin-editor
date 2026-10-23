import type { AiRequest, AiStream } from 'quoin-editor/ai';

const WORD_MS = 45;

const firstSentence = (markdown: string) => markdown.replace(/[#>*_`-]/g, '').trim().split(/(?<=[.!?])\s/)[0] ?? '';

/** What the simulated model answers: canned text shaped by the action, never a real model's. */
function answerFor({ action, prompt, selection }: AiRequest): string {
  switch (action) {
    case 'continue':
      return ' The host streams each answer in as markdown chunks, and the writer accepts it in one undo step.';
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
