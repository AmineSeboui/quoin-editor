import { format } from 'node:util';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { QuoinDiff, englishDiffLabels } from 'quoin-editor/diff';

const errors = [];
console.error = (...args) => errors.push(format(...args));

if (typeof window !== 'undefined' || typeof document !== 'undefined') errors.push('This process has a DOM.');

const before = [
  { id: 'title', type: 'MARKDOWN', data: { markdown: '# Server diff' } },
  { id: 'text', type: 'MARKDOWN', data: { markdown: 'Rendered without a browser' } },
  { id: 'gone', type: 'MARKDOWN', data: { markdown: '- an item that goes' } },
];
const after = [
  { id: 'title', type: 'MARKDOWN', data: { markdown: '# Server diff' } },
  { id: 'text', type: 'MARKDOWN', data: { markdown: 'Rendered without any browser' } },
  { id: 'new', type: 'MARKDOWN', data: { markdown: 'A new line' } },
];

const html = renderToString(createElement(QuoinDiff, { before, after, className: 'doc' }));
const expected = [
  '<div class="quoin-diff doc"><h1 id="h-title">Server diff</h1>',
  `<span data-diff-label="">${englishDiffLabels.changed([])}<span class="quoin-diff-hidden"`,
  '<span data-diff-label="">Removed<span',
  '<p>A new line</p></div>',
  '>inserted </span>any<span',
  '> end inserted </span></ins>',
  '<del><span class="quoin-diff-hidden"',
];
for (const part of expected) if (!html.includes(part)) errors.push(`QuoinDiff wrote\n${html}\nwithout\n${part}`);
if (errors.length > 0) {
  process.stderr.write(`${errors.join('\n\n')}\n`);
  process.exit(1);
}
