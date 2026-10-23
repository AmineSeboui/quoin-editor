import type { QuoinBlock } from '../../engine/model/quoin-block';
import type { HTMLOptions } from '../../engine/render/to-html';

const MARKS =
  '**bold** *italic* <u>under</u> ~~strike~~ `code` <sub>sub</sub> <sup>sup</sup> [link](https://quoin.dev "Docs") ' +
  '<mark data-color="yellow">marked</mark> <mark>plain</mark> <span data-color="red">red</span> ' +
  '<span data-bg="blue">blue</span> <span data-comment="c1">commented</span> <span data-mark="x">custom</span> ' +
  '[unsafe](javascript:alert(1)) a < b & "c" \'d\'';

const ATOMS = 'Ask [@Ada Lovelace](mention:user:1) about $x^2$ and <span data-atom="emoji" data-attr-name="tada"></span>';

/** A document with every block type, mark and atom the engine renders, and each list, quote and nesting shape. */
export const everyBlockDocument: QuoinBlock[] = [
  { id: 'toc', type: 'TOC', data: {} },
  { id: 'h1', type: 'MARKDOWN', data: { markdown: '# Every block', align: 'center', color: 'red', background: 'blue' } },
  { id: 'marks', type: 'MARKDOWN', data: { markdown: MARKS } },
  { id: 'atoms', type: 'MARKDOWN', data: { markdown: ATOMS } },
  { id: 'break', type: 'MARKDOWN', data: { markdown: 'one  \ntwo' } },
  { id: 'h2', type: 'MARKDOWN', data: { markdown: '## Lists' } },
  { id: 'b1', type: 'MARKDOWN', data: { markdown: '- bullet' } },
  { id: 'o1', type: 'MARKDOWN', data: { markdown: '3. third' }, indent: 1 },
  { id: 'o2', type: 'MARKDOWN', data: { markdown: '4. fourth' }, indent: 1 },
  { id: 'deep', type: 'MARKDOWN', data: { markdown: 'deep' }, indent: 3 },
  { id: 't1', type: 'MARKDOWN', data: { markdown: '- [x] done' } },
  { id: 't2', type: 'MARKDOWN', data: { markdown: '- [ ] open' } },
  { id: 't3', type: 'MARKDOWN', data: { markdown: '- [ ] ' } },
  { id: 't4', type: 'MARKDOWN', data: { markdown: '- [ ] <span data-atom="emoji" data-attr-name="tada"></span>' } },
  { id: 't5', type: 'MARKDOWN', data: { markdown: '- [x] $x^2$' } },
  { id: 'q1', type: 'MARKDOWN', data: { markdown: '> quoted' } },
  { id: 'q2', type: 'MARKDOWN', data: { markdown: '> again' } },
  { id: 'q3', type: 'MARKDOWN', data: { markdown: '> indented' }, indent: 1 },
  { id: 'h3', type: 'MARKDOWN', data: { markdown: '### Blocks' } },
  { id: 'divider', type: 'DIVIDER', data: {} },
  { id: 'callout', type: 'CALLOUT', data: { tone: 'warning', icon: '!', body: 'Mind **the** gap' } },
  { id: 'bare', type: 'CALLOUT', data: { tone: 'info', body: 'No icon' } },
  { id: 'code', type: 'CODE', data: { language: 'ts', code: 'const a = 1 < 2;\nconst b = "x";' } },
  { id: 'plain', type: 'CODE', data: { language: '', code: 'plain' } },
  { id: 'toggle', type: 'TOGGLE', data: { markdown: 'Open toggle', open: true } },
  { id: 'inside', type: 'MARKDOWN', data: { markdown: 'inside' }, indent: 1 },
  { id: 'closed', type: 'TOGGLE', data: { markdown: 'Closed toggle', open: false } },
  { id: 'image', type: 'IMAGE', data: { storageKey: 'cover.png', alt: 'A "cover"', caption: 'The *cover*', width: 4, height: 3 } },
  { id: 'url', type: 'IMAGE', data: { url: 'https://quoin.dev/a.png', alt: '', align: 'right' } },
  { id: 'file', type: 'FILE', data: { storageKey: 'notes.pdf', filename: 'notes <1>.pdf' } },
  {
    id: 'table',
    type: 'TABLE',
    data: { rows: [['Name', 'Role'], ['**Ada**', 'Author']], header: true, align: [null, 'right'] },
  },
  { id: 'headless', type: 'TABLE', data: { rows: [['a', 'b']], header: false, align: [] } },
  { id: 'youtube', type: 'EMBED', data: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } },
  { id: 'page', type: 'EMBED', data: { url: 'https://quoin.dev/page' } },
  { id: 'bookmark', type: 'BOOKMARK', data: { url: 'https://quoin.dev/docs', title: 'Quoin & docs' } },
  { id: 'math', type: 'MATH', data: { latex: 'e^{i\\pi} + 1 = 0' } },
  { id: 'custom', type: 'CHART', data: { points: [1, 2] }, indent: 1 },
];

/** Options that reach every branch: resolved assets, rendered math and frames for known providers. */
export const everyBlockOptions: HTMLOptions = {
  resolveAssetUrl: (key) => `/assets/${key}`,
  renderMath: (latex, { displayMode }) => `<span class="math" data-display="${displayMode}">${latex}</span>`,
  embeds: 'iframe',
};
