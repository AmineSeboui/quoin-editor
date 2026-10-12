import { describe, expect, it } from 'vitest';
import {
  addMarkRange,
  atom,
  equalInline,
  inlineLength,
  inlineText,
  marksAt,
  normalizeInline,
  rangeHasMark,
  removeMarkRange,
  replaceInline,
  sliceInline,
  text,
} from './inline';

const b = { type: 'bold' };
const i = { type: 'italic' };
const code = { type: 'code' };
const link = { type: 'link', attrs: { href: 'https://a.b' } };
const mention = atom('mention', { id: '1', label: 'Ada' });

describe('normalizeInline', () => {
  it('drops empty text, merges equal neighbours and sorts marks', () => {
    expect(normalizeInline([text('a', [i, b]), text(''), text('b', [b, i]), text('c')])).toEqual([
      text('ab', [b, i]),
      text('c'),
    ]);
  });

  it('strips the code mark from hard breaks', () => {
    expect(normalizeInline([text('a\nb', [code])])).toEqual([text('a', [code]), text('\n'), text('b', [code])]);
  });

  it('keeps the other marks of a code hard break', () => {
    expect(normalizeInline([text('a\nb', [b, code])])).toEqual([
      text('a', [b, code]),
      text('\n', [b]),
      text('b', [b, code]),
    ]);
  });
});

describe('length, text and slices', () => {
  const doc = normalizeInline([text('ab', [b]), mention, text('cd')]);

  it('counts atoms as one', () => {
    expect(inlineLength(doc)).toBe(5);
    expect(inlineText(doc)).toBe('ab\uFFFCcd');
  });

  it('renders atoms through a custom text function', () => {
    expect(inlineText(doc, (node) => `@${node.attrs.label}`)).toBe('ab@Adacd');
  });

  it('slices across nodes', () => {
    expect(sliceInline(doc, 1, 4)).toEqual([text('b', [b]), mention, text('c')]);
    expect(sliceInline(doc, 0, 0)).toEqual([]);
  });

  it('replaces a range and normalizes', () => {
    expect(replaceInline(doc, 1, 4, [text('X', [b])])).toEqual([text('aX', [b]), text('d')]);
    expect(replaceInline(doc, 5, 5, [text('!')])).toEqual([text('ab', [b]), mention, text('cd!')]);
  });

  it('rejects an inverted or out of bounds range', () => {
    expect(() => replaceInline(doc, 3, 2, [])).toThrow(RangeError);
    expect(() => replaceInline(doc, -1, 2, [])).toThrow(RangeError);
    expect(() => replaceInline(doc, 0, 6, [])).toThrow(RangeError);
  });

  it('compares structurally', () => {
    expect(equalInline(doc, normalizeInline([text('a', [b]), text('b', [b]), mention, text('cd')]))).toBe(true);
  });

  it('tells apart kinds, text, atom attrs and marks', () => {
    expect(equalInline([text('a')], [text('a'), text('b')])).toBe(false);
    expect(equalInline([text('a')], [text('b')])).toBe(false);
    expect(equalInline([text('a')], [text('a', [b])])).toBe(false);
    expect(equalInline([text('\uFFFC')], [mention])).toBe(false);
    expect(equalInline([mention], [text('\uFFFC')])).toBe(false);
    expect(equalInline([mention], [atom('mention', { id: '2', label: 'Ada' })])).toBe(false);
    expect(equalInline([mention], [atom('mention', { label: 'Ada', id: '1' })])).toBe(true);
  });
});

describe('marks over ranges', () => {
  const doc = normalizeInline([text('hello world')]);

  it('adds and removes marks over a range', () => {
    const bolded = addMarkRange(doc, 0, 5, b);
    expect(bolded).toEqual([text('hello', [b]), text(' world')]);
    expect(removeMarkRange(bolded, 2, 4, 'bold')).toEqual([text('he', [b]), text('ll'), text('o', [b]), text(' world')]);
  });

  it('marks atoms inside the range and leaves the input untouched', () => {
    const before = normalizeInline([text('a'), mention, text('b')]);
    expect(addMarkRange(before, 1, 2, b)).toEqual([text('a'), atom('mention', mention.attrs, [b]), text('b')]);
    expect(before).toEqual([text('a'), mention, text('b')]);
  });

  it('leaves the inline unchanged over an empty range', () => {
    expect(addMarkRange(doc, 3, 3, b)).toEqual(doc);
    expect(removeMarkRange(addMarkRange(doc, 0, 5, b), 2, 2, 'bold')).toEqual([text('hello', [b]), text(' world')]);
  });

  it('rejects an inverted or out of bounds range instead of changing the text', () => {
    const bolded = addMarkRange(doc, 0, 5, b);
    expect(() => addMarkRange(doc, 4, 2, b)).toThrow(RangeError);
    expect(() => removeMarkRange(bolded, 4, 2, 'bold')).toThrow(RangeError);
    expect(() => addMarkRange(doc, -1, 2, b)).toThrow(RangeError);
    expect(() => removeMarkRange(bolded, 0, 12, 'bold')).toThrow(RangeError);
  });

  it('reports whether every character in a range has a mark', () => {
    const bolded = addMarkRange(doc, 0, 5, b);
    expect(rangeHasMark(bolded, 0, 5, 'bold')).toBe(true);
    expect(rangeHasMark(bolded, 0, 6, 'bold')).toBe(false);
  });

  it('reads an empty range from the marks at its offset', () => {
    const bolded = addMarkRange(doc, 0, 5, b);
    expect(rangeHasMark(bolded, 3, 3, 'bold')).toBe(true);
    expect(rangeHasMark(bolded, 7, 7, 'bold')).toBe(false);
    expect(rangeHasMark(bolded, 4, 2, 'bold')).toBe(false);
  });

  it('reads marks before the offset, skipping non-inclusive marks at their end', () => {
    const linked = normalizeInline([text('ab', [link, b]), text('c')]);
    expect(marksAt(linked, 2)).toEqual([b]);
    expect(marksAt(linked, 1)).toEqual([link, b]);
    expect(marksAt(linked, 0)).toEqual([link, b]);
    expect(marksAt([], 0)).toEqual([]);
  });

  it('drops a non-inclusive mark at the end of the inline and before a different link', () => {
    const other = { type: 'link', attrs: { href: 'https://c.d' } };
    expect(marksAt(normalizeInline([text('ab', [link])]), 2)).toEqual([]);
    expect(marksAt(normalizeInline([text('a', [link]), text('b', [other])]), 1)).toEqual([]);
    expect(marksAt(normalizeInline([text('ab', [link])]), 2, () => true)).toEqual([link]);
  });
});
