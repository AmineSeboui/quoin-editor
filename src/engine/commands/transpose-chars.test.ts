import { describe, expect, it } from 'vitest';
import { buildState, caretOf, markdownOf, run } from '../test-support/build-state';
import { transposeChars } from './transpose-chars';

const transpose = (markdown: string, offset: number) => run(buildState([markdown], { block: 0, offset }), transposeChars);

describe('transposeChars', () => {
  it('swaps the graphemes on either side of the caret and moves past them', () => {
    const { ok, state, tr } = transpose('abc', 1);
    expect(ok).toBe(true);
    expect(markdownOf(state)).toEqual(['bac']);
    expect(caretOf(state)).toEqual({ block: 0, offset: 2 });
    expect(tr?.origin).toBe('input');
  });

  it('swaps the two graphemes before the caret at the end of a line', () => {
    expect(markdownOf(transpose('abc', 3).state)).toEqual(['acb']);
    const { state } = transpose('ab\\\ncd', 2);
    expect(markdownOf(state)).toEqual(['ba\\\ncd']);
    expect(caretOf(state)).toEqual({ block: 0, offset: 2 });
  });

  it('moves whole graphemes with their marks', () => {
    expect(markdownOf(transpose('a\u{1F44D}\u{1F3FD}', 1).state)).toEqual(['\u{1F44D}\u{1F3FD}a']);
    expect(markdownOf(transpose('**a**b', 1).state)).toEqual(['b**a**']);
  });

  it('refuses at the start of a line, across a line break, with one grapheme or for a range', () => {
    expect(transpose('abc', 0).ok).toBe(false);
    expect(transpose('ab\\\ncd', 3).ok).toBe(false);
    expect(transpose('a', 1).ok).toBe(false);
    expect(transpose('', 0).ok).toBe(false);
    const range = buildState(['abc'], { anchor: { block: 0, offset: 0 }, head: { block: 0, offset: 2 } });
    expect(run(range, transposeChars).ok).toBe(false);
  });
});
