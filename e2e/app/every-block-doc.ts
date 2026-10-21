import type { QuoinBlock } from 'quoin-editor';

const EVERY_BLOCK: QuoinBlock[] = [
  { id: 'heading1', type: 'MARKDOWN', data: { markdown: '# Catalogue' } },
  { id: 'text', type: 'MARKDOWN', data: { markdown: 'Ask [@Ada Lovelace](mention:user:1) about $x^2$ \u{1F389}' } },
  { id: 'heading2', type: 'MARKDOWN', data: { markdown: '## Section' } },
  { id: 'heading3', type: 'MARKDOWN', data: { markdown: '### Subsection' } },
  { id: 'quote', type: 'MARKDOWN', data: { markdown: '> Quoted words' } },
  { id: 'divider', type: 'DIVIDER', data: {} },
  { id: 'callout', type: 'CALLOUT', data: { tone: 'info', body: 'Read this first' } },
  { id: 'bulletedList', type: 'MARKDOWN', data: { markdown: '- Bullet' } },
  { id: 'numberedList', type: 'MARKDOWN', data: { markdown: '1. Numbered' } },
  { id: 'todoList', type: 'MARKDOWN', data: { markdown: '- [ ] Task' } },
  { id: 'toggle', type: 'TOGGLE', data: { markdown: 'Details', open: true } },
  { id: 'image', type: 'IMAGE', data: { storageKey: 'fixture.png', alt: 'A red square', widthPercent: 50 } },
  { id: 'file', type: 'FILE', data: { storageKey: 'notes.pdf', filename: 'notes.pdf', size: 1536, mime: 'application/pdf' } },
  { id: 'code', type: 'CODE', data: { language: 'ts', code: 'const answer = 42;' } },
  { id: 'table', type: 'TABLE', data: { rows: [['Name', 'Role'], ['Ada', 'Author']], header: true, align: [null, null] } },
  { id: 'embed', type: 'EMBED', data: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', provider: 'youtube' } },
  {
    id: 'bookmark',
    type: 'BOOKMARK',
    data: { url: 'https://quoin.dev/docs', title: 'Quoin docs', description: 'How to write with Quoin' },
  },
  { id: 'blockEquation', type: 'MATH', data: { latex: 'e^{i\\pi} + 1 = 0' } },
  { id: 'tableOfContents', type: 'TOC', data: {} },
];

const line = (index: number): QuoinBlock => ({ id: `line${index}`, type: 'MARKDOWN', data: { markdown: `Line ${index}` } });

/** One block of every type the catalogue inserts, each between two lines of text for the arrows to come from and go to. */
export const everyBlock: QuoinBlock[] = EVERY_BLOCK.flatMap((block, index) => [line(index), block]).concat(
  line(EVERY_BLOCK.length),
);
