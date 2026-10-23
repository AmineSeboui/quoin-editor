import type { QuoinBlock } from 'quoin-editor';

/** The starting document of the AI page. */
export const aiDocument: QuoinBlock[] = [
  { id: 'title', type: 'MARKDOWN', data: { markdown: '## Ask the simulated model' } },
  { id: 'p', type: 'MARKDOWN', data: { markdown: 'Select this sentence and choose Ask AI in the toolbar, or press / and pick Continue writing.' } },
  { id: 'empty', type: 'MARKDOWN', data: { markdown: '' } },
];
