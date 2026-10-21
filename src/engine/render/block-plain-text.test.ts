import { describe, expect, it } from 'vitest';
import { createSchema } from '../schema/create-schema';
import type { BlockSpec } from '../schema/types';
import { countText } from './count-text';
import { toPlainText } from './to-plain-text';

const md = (id: string, markdown: string) => ({ id, type: 'MARKDOWN', data: { markdown } });
const block = (type: string, data: Record<string, unknown>) => ({ id: type, type, data });

describe('toPlainText per block type', () => {
  it('writes the visible text of each core block', () => {
    expect(toPlainText([block('CALLOUT', { tone: 'info', body: 'a **b**' })])).toBe('a b');
    expect(toPlainText([block('TOGGLE', { markdown: 'Summary _x_', open: true })])).toBe('Summary x');
    expect(toPlainText([block('CODE', { language: 'ts', code: 'a < b\n  c' })])).toBe('a < b\n  c');
    expect(toPlainText([block('IMAGE', { storageKey: 'k', alt: 'An image', caption: 'cap' })])).toBe('An image');
    expect(toPlainText([block('FILE', { storageKey: 'k', filename: 'a.pdf' })])).toBe('a.pdf');
    expect(toPlainText([block('EMBED', { url: 'https://x.y' })])).toBe('https://x.y');
    expect(toPlainText([block('BOOKMARK', { url: 'https://x.y', title: 'T' })])).toBe('T');
    expect(toPlainText([block('BOOKMARK', { url: 'https://x.y' })])).toBe('https://x.y');
    expect(toPlainText([block('MATH', { latex: 'x^2' })])).toBe('x^2');
    expect(toPlainText([block('TOC', {}), block('DIVIDER', {}), block('WEIRD', { a: 1 })])).toBe('\n\n');
  });

  it('keeps hard breaks and drops list markers, quote markers and task boxes', () => {
    expect(toPlainText([md('a', 'one\\\ntwo'), md('b', '> quote'), md('c', '- [x] task'), md('d', '3. third')])).toBe(
      'one\ntwo\nquote\ntask\nthird',
    );
  });

  it('separates the cells of a row with tabs and the rows with newlines', () => {
    const rows = [['a', ''], ['**b**', 'c']];
    expect(toPlainText([block('TABLE', { rows, header: true, align: [null, null] })])).toBe('a\t\nb\tc');
  });

  it('is empty for no blocks', () => {
    expect(toPlainText([])).toBe('');
  });
});

describe('toPlainText with a custom schema', () => {
  const note: BlockSpec = {
    type: 'NOTE',
    flow: 'text',
    primaryRegion: 'text',
    fromData: (data, ctx) => ({ attrs: {}, regions: { text: ctx.inline.parse(String(data.text)) } }),
    toData: () => ({}),
    initial: () => ({ attrs: {}, regions: { text: [] } }),
  };
  const stamp: BlockSpec = {
    type: 'STAMP',
    flow: 'void',
    fromData: () => ({ attrs: {}, regions: {} }),
    toData: () => ({}),
    initial: () => ({ attrs: {}, regions: {} }),
    toPlainText: () => 'stamped',
  };
  const schema = createSchema({
    blocks: [note, stamp],
    atoms: [{ type: 'emoji', plainText: ({ name }) => `:${name}:` }],
  });

  it('reads the primary region of a custom text block', () => {
    expect(toPlainText([block('NOTE', { text: 'hello' })], { schema })).toBe('hello');
  });

  it('prefers the text a block spec gives', () => {
    expect(toPlainText([block('STAMP', {})], { schema })).toBe('stamped');
  });

  it('writes a custom atom through its spec and an unknown atom as nothing', () => {
    const emoji = '<span data-atom="emoji" data-attr-name="tada"></span>';
    const other = '<span data-atom="other"></span>';
    expect(toPlainText([md('a', `hi ${emoji}${other}!`)], { schema })).toBe('hi :tada:!');
    expect(countText([md('a', `hi ${emoji}`)], { schema })).toEqual({ characters: 'hi :tada:'.length, words: 2 });
  });
});

describe('countText', () => {
  it('counts nothing for no blocks and ignores the newlines that join blocks', () => {
    expect(countText([])).toEqual({ characters: 0, words: 0 });
    expect(countText([md('a', 'ab cd'), md('b', ''), md('c', 'ef')])).toEqual({ characters: 7, words: 3 });
  });

  it('counts words apart from punctuation and spaces', () => {
    expect(countText([md('a', 'hello,   big\tworld!')])).toEqual({ characters: 19, words: 3 });
  });
});
