import { format } from 'node:util';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { BlockCanvas } from 'quoin-editor';

const errors = [];
console.error = (...args) => errors.push(format(...args));

const blocks = [
  { id: 'markdown', type: 'MARKDOWN', data: { markdown: '# Server rendered\n\nWith **bold** text.' } },
  { id: 'callout', type: 'CALLOUT', data: { tone: 'warning', body: 'Mind the gap.' } },
  { id: 'code', type: 'CODE', data: { language: 'ts', code: 'const answer = 42;' } },
  { id: 'image', type: 'IMAGE', data: { storageKey: 'cover.png', alt: 'A cover' } },
  { id: 'file', type: 'FILE', data: { storageKey: 'notes.pdf', filename: 'notes.pdf' } },
];

const html = renderToString(createElement(BlockCanvas, { blocks, onChange: () => {} }));

if (!html.includes('data-block-id="callout"')) errors.push('The server-rendered canvas is missing the sample document.');
if (errors.length > 0) {
  process.stderr.write(`${errors.join('\n\n')}\n`);
  process.exit(1);
}
