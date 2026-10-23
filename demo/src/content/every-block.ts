import type { QuoinBlock } from 'quoin-editor';

const text = (id: string, markdown: string): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown } });

/** One block of every type Quoin draws, the catalogue's included. */
export const everyBlock: QuoinBlock[] = [
  { id: 'toc', type: 'TOC', data: {} },
  text('h1', '## Every block'),
  text('p', 'A paragraph with **bold**, _italic_, ~~struck~~, `code`, a [link](https://github.com/AmineSeboui/quoin-editor), $e^{i\\pi} + 1 = 0$ and [@Ada Lovelace](mention:user:ada) \u{1F389}.'),
  text('h2', '### Text'),
  text('bullet', '- A bulleted item'),
  text('number', '1. A numbered item'),
  text('task', '- [ ] A task'),
  text('quote', '> A quote'),
  { id: 'callout', type: 'CALLOUT', data: { tone: 'info', body: 'A callout, in one of its tones.' } },
  { id: 'toggle', type: 'TOGGLE', data: { markdown: 'A toggle', open: true } },
  { id: 'toggle-body', type: 'MARKDOWN', data: { markdown: 'What it holds, one level in.' }, indent: 1 },
  { id: 'divider', type: 'DIVIDER', data: {} },
  text('h2-media', '### Code, media and data'),
  { id: 'code', type: 'CODE', data: { language: 'ts', code: "const greeting: string = 'Blocks on screen';\nconsole.log(greeting);" } },
  { id: 'image', type: 'IMAGE', data: { storageKey: 'sample-image.svg', alt: 'Three blocks locked in a frame by a wedge', widthPercent: 60 } },
  { id: 'file', type: 'FILE', data: { storageKey: 'sample-notes.txt', filename: 'sample-notes.txt', size: 99, mime: 'text/plain' } },
  { id: 'table', type: 'TABLE', data: { rows: [['Block', 'Stored as'], ['Paragraph', 'Markdown'], ['Table', 'Rows of cells']], header: true, align: [null, null] } },
  { id: 'math', type: 'MATH', data: { latex: '\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}' } },
  { id: 'bookmark', type: 'BOOKMARK', data: { url: 'https://github.com/AmineSeboui/quoin-editor', title: 'Quoin on GitHub', description: 'The source of this editor' } },
  { id: 'embed', type: 'EMBED', data: { url: 'https://amineseboui.github.io/quoin-editor/' } },
  text('end', 'Press / on an empty line to add any of them again.'),
];
