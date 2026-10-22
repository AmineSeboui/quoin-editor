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
  md('intro', 'The **slow** brown fox jumps high.'),
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
