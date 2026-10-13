import { describe, expect, it } from 'vitest';
import { createBlockCodec } from '../blocks/codec';
import type { QuoinBlock } from '../model/quoin-block';
import { buildState } from '../test-support/build-state';
import { sliceFromSelection } from './extract-slice';
import { sliceToClipboard } from './serialize-slice';

const copiedText = (...args: Parameters<typeof buildState>) => {
  const state = buildState(...args);
  return sliceToClipboard(sliceFromSelection(state, createBlockCodec(state.schema))!).text;
};
const within = (length: number) => ({ anchor: { block: 0, offset: 0 }, head: { block: 0, offset: length } });
const table: QuoinBlock = { id: 't', type: 'TABLE', data: { rows: [['a_b *c*']], header: false } };

describe('the text flavour of a copy', () => {
  it('writes text from inside one block exactly as it is', () => {
    const texts = [
      'snake_case_name',
      'see https://example.com/a_b_c?x=1&y=2',
      'C:\\Users\\me',
      'a * b = c',
      'price $5 and $6',
      '[not a link] x < y ~tilde~ `tick`',
      '# hash at start',
      '1. not a list',
    ];
    for (const text of texts) expect(copiedText([{ paragraph: text }], within(text.length)), text).toBe(text);
  });

  it('drops the marks and the block syntax of a selection inside one block', () => {
    expect(copiedText(['## He**llo** [link](https://a.b)'], within(10))).toBe('Hello link');
  });

  it('writes the plain text of a selection inside a table cell', () => {
    const cell = (offset: number) => ({ block: 0, offset, region: 'cell:0:0' });
    expect(copiedText([table], { anchor: cell(0), head: cell(5) })).toBe('a_b c');
  });

  it('keeps markdown for a selection across blocks', () => {
    const selection = { anchor: { block: 0, offset: 0 }, head: { block: 1, offset: 1 } };
    expect(copiedText(['- a_b', '- c'], selection)).toBe('- a_b\n- c');
  });

  it('keeps markdown for whole blocks', () => {
    expect(copiedText(['- a', '- b'], { blocks: [0, 1] })).toBe('- a\n- b');
  });
});
