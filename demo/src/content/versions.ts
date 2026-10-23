import type { QuoinBlock } from 'quoin-editor';

const text = (id: string, markdown: string): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown } });

/** Two versions of one document, for the server rendering page to draw and compare. */
export const firstVersion: QuoinBlock[] = [
  text('title', '## Release notes'),
  text('paste', 'Paste keeps **bold** and links.'),
  text('lists', '- Lists keep their numbers'),
  { id: 'callout', type: 'CALLOUT', data: { tone: 'warning', body: 'Back up before you upgrade.' } },
  text('old', 'Tables arrive in a later release.'),
];

export const secondVersion: QuoinBlock[] = [
  text('title', '## Release notes'),
  text('paste', 'Paste keeps **bold**, _italic_ and links.'),
  { id: 'callout', type: 'CALLOUT', data: { tone: 'warning', body: 'Back up before you upgrade.' } },
  text('lists', '- Lists keep their numbers'),
  text('tables', '- [x] Tables, typed cell by cell'),
];
