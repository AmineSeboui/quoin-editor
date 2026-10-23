import type { QuoinBlock } from 'quoin-editor';

/** The starting document of the comments page, one phrase already under a thread. */
export const commentsDocument: QuoinBlock[] = [
  { id: 'title', type: 'MARKDOWN', data: { markdown: '## Launch plan' } },
  { id: 'p', type: 'MARKDOWN', data: { markdown: 'We ship <span data-comment="first">on Thursday</span>, after the review.' } },
  { id: 'q', type: 'MARKDOWN', data: { markdown: 'Select any text and choose Comment in the toolbar to start a thread.' } },
];
