import type { QuoinBlock } from 'quoin-editor';

/** The document the first collaborator seeds the shared one with. */
export const collaborationDocument: QuoinBlock[] = [
  { id: 'title', type: 'MARKDOWN', data: { markdown: '## A shared document' } },
  { id: 'p', type: 'MARKDOWN', data: { markdown: 'Type in either editor: the other follows, with your caret in it.' } },
  { id: 'task', type: 'MARKDOWN', data: { markdown: '- [ ] Move a block on one side and watch the other' } },
];
