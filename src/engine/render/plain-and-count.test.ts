import { describe, expect, it } from 'vitest';
import { countText } from './count-text';
import { toPlainText } from './to-plain-text';

const blocks = [
  { id: 'a', type: 'MARKDOWN', data: { markdown: '# Hello **world**' } },
  { id: 'b', type: 'MARKDOWN', data: { markdown: '- ask [@Ada](mention:1)' } },
  { id: 'c', type: 'TABLE', data: { rows: [['x', 'y']], header: false, align: [null, null] } },
  { id: 'd', type: 'DIVIDER', data: {} },
];

describe('plain text and counts', () => {
  it('joins block text without markup', () => {
    expect(toPlainText(blocks)).toBe('Hello world\nask @Ada\nx\ty\n');
  });

  it('counts graphemes and words', () => {
    expect(countText(blocks)).toEqual({ characters: 'Hello worldask @Adax\ty'.length, words: 6 });
    expect(countText([{ id: 'e', type: 'MARKDOWN', data: { markdown: 'a👍🏽' } }])).toEqual({ characters: 2, words: 1 });
  });
});
