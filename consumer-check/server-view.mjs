import { format } from 'node:util';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { toHTML } from 'quoin-editor/engine';
import { QuoinView, defineBlock } from 'quoin-editor/view';

const errors = [];
console.error = (...args) => errors.push(format(...args));

if (typeof window !== 'undefined' || typeof document !== 'undefined') errors.push('This process has a DOM.');

const blocks = [
  { id: 'title', type: 'MARKDOWN', data: { markdown: '# Server view' } },
  { id: 'task', type: 'MARKDOWN', data: { markdown: '- [ ] Rendered without a browser' } },
  { id: 'toggle', type: 'TOGGLE', data: { markdown: 'More', open: true } },
  { id: 'code', type: 'CODE', data: { language: 'ts', code: 'const answer = 42;' } },
  { id: 'chart', type: 'CHART', data: { points: 3 } },
];
const blockTypes = [
  defineBlock({ type: 'CHART', label: 'Chart', icon: () => null, preview: ({ data }) => createElement('output', null, data.points) }),
];

const html = renderToString(createElement(QuoinView, { blocks, blockTypes, className: 'doc' }));
const expected = toHTML(blocks).replace('<div data-type="CHART"></div>', '<div data-type="CHART"><output>3</output></div>');
const written = html.replace(/<input ([^>]*)\/>/g, '<input $1>').replace(/ (disabled|open)=""/g, ' $1');
if (written !== `<div class="quoin-view doc">${expected}</div>`) errors.push(`QuoinView wrote\n${html}\ninstead of\n${expected}`);
if (errors.length > 0) {
  process.stderr.write(`${errors.join('\n\n')}\n`);
  process.exit(1);
}
