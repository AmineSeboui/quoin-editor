import type { QuoinBlock } from '../../engine/model/quoin-block';

const md = (id: string, markdown: string, indent?: number): QuoinBlock =>
  indent === undefined ? { id, type: 'MARKDOWN', data: { markdown } } : { id, type: 'MARKDOWN', data: { markdown }, indent };

/** Two versions of a document with every kind of change: each op, grouped lists and quotes, moves and attributes. */
export const diffBefore: QuoinBlock[] = [
  md('title', '# Release notes'),
  md('intro', 'The **quick** brown fox jumps.'),
  md('gone', 'This paragraph goes away.'),
  md('b1', '- first item'),
  md('b2', '- second item'),
  md('b3', '- third item'),
  md('q1', '> a quoted line'),
  md('q2', '> another line'),
  md('level', '#### Section'),
  md('task', '- [ ] Ship it'),
  { id: 'image', type: 'IMAGE', data: { url: '/cat.png', alt: 'A cat' } },
  md('cjk', '\u4eca\u5929\u5929\u6c14\u5f88\u597d'),
  md('mover', 'This block moves down.'),
  md('edited-mover', 'This one moves and changes.'),
  md('stays', 'A paragraph that stays.'),
  { id: 'code', type: 'CODE', data: { language: 'ts', code: 'let a = 1;' } },
];

export const diffAfter: QuoinBlock[] = [
  md('title', '# Release notes'),
  md('edited-mover', 'This one moved and changed.'),
  md('intro', 'The **slow** brown fox jumps [high](https://quoin.dev).'),
  md('added', 'A brand new paragraph.'),
  md('b1', '- first item'),
  md('b2', '- second entry'),
  md('b4', '- brand new entry'),
  md('q1', '> a quoted line'),
  md('q2', '> another quoted line'),
  md('level', '## Section'),
  md('task', '- [x] Ship it'),
  { id: 'image', type: 'IMAGE', data: { url: '/cat.png', alt: 'A sleeping cat' } },
  md('cjk', '\u4eca\u5929\u5929\u6c14\u4e0d\u597d'),
  md('stays', 'A paragraph that stays.'),
  md('mover', 'This block moves down.'),
  { id: 'code', type: 'CODE', data: { language: 'ts', code: 'let a = 2;' } },
];

const toggle = (id: string, markdown: string, indent = 0): QuoinBlock => ({
  id,
  type: 'TOGGLE',
  data: { markdown, open: false },
  indent,
});

/** Two versions with nesting: indented list items, closed toggles inside closed toggles, a table and numbered items. */
export const nestedBefore: QuoinBlock[] = [
  { id: 'toc', type: 'TOC', data: {} },
  md('kept-h', '## Kept heading'),
  md('gone-h', '## Removed heading'),
  md('moved-h', '## Moved heading'),
  md('p1', '- Parent one'),
  md('c1', '- Child kept', 1),
  md('c2', '- Child removed', 1),
  md('p2', '- Parent removed'),
  md('g1', '- Grandchild kept', 1),
  toggle('outer', 'Closed toggle'),
  md('inside', 'Inside old', 1),
  toggle('inner', 'Inner toggle', 1),
  md('deep', 'Deep text', 2),
  { id: 'grid', type: 'TABLE', data: { rows: [['h1', 'h2', 'h3'], ['a', 'b', 'c'], ['gone', 'row', 'here']] } },
  md('n1', '1. first'),
  md('n2', '2. second'),
  md('n3', '3. third'),
];

export const nestedAfter: QuoinBlock[] = [
  { id: 'toc', type: 'TOC', data: {} },
  md('kept-h', '## Kept heading'),
  md('p1', '- Parent one'),
  md('c1', '- Child kept', 1),
  md('c3', '- Brand new entry', 1),
  md('g1', '- Grandchild kept', 1),
  toggle('outer', 'Closed toggle'),
  md('inside', 'Inside new', 1),
  toggle('inner', 'Inner toggle', 1),
  md('deep', 'Deep text changed', 2),
  { id: 'grid', type: 'TABLE', data: { rows: [['h1', 'h2'], ['a', 'b']] } },
  md('n1', '1. first'),
  md('n3', '2. third'),
  md('moved-h', '## Moved heading'),
];
