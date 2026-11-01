import type { QuoinBlock } from 'quoin-editor';

/** A rough line the simulated model knows how to fix and improve, so the page shows a believable answer. */
export const AI_DRAFT = 'quoin keep every text block as markdown so you can diff it in git and hand it to a llm';

/** The starting document of the AI page. */
export const aiDocument: QuoinBlock[] = [
  { id: 'title', type: 'MARKDOWN', data: { markdown: '## Release notes' } },
  { id: 'draft', type: 'MARKDOWN', data: { markdown: AI_DRAFT } },
  { id: 'empty', type: 'MARKDOWN', data: { markdown: '' } },
];
