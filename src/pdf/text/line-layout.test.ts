// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { GlyphItem } from './glyph-items';
import { layoutLines, type Line } from './line-layout';
import { BODY } from './text-style';

const use = { face: { glyph: () => 1, advance: () => 1000, hex: () => '01' }, fakeBold: false, fakeItalic: false };

// Every character is ten points wide, so a line's width reads as its length.
const items = (text: string): GlyphItem[] =>
  [...text].map((char) => ({
    text: char,
    style: BODY,
    width: 10,
    use,
    glyph: 1,
    space: char === ' ' || char === '\u3000',
    newline: char === '\n',
  }));

const texts = (lines: readonly Line[]) => lines.map(({ items: placed }) => placed.map(({ text }) => text).join(''));
const xs = (line: Line) => line.items.map(({ x }) => x);

describe('layoutLines', () => {
  it('fills each line with the words that fit, keeping the space a line breaks at on the line before', () => {
    const lines = layoutLines(items('aa bb cc dd'), 55);
    expect(texts(lines)).toEqual(['aa bb ', 'cc dd']);
    expect(lines.map(({ width }) => width)).toEqual([50, 50]);
    expect(lines.map(({ last }) => last)).toEqual([false, true]);
  });

  it('breaks a word wider than the line between its characters', () => {
    expect(texts(layoutLines(items('abcdefg hi'), 30))).toEqual(['abc', 'def', 'g ', 'hi']);
  });

  it('breaks where the text has a line break, and holds an empty line for a break that ends the text', () => {
    const lines = layoutLines(items('ab\ncd\n'), 100);
    expect(texts(lines)).toEqual(['ab', 'cd', '']);
    expect(lines.map(({ last }) => last)).toEqual([true, true, true]);
  });

  it('holds one empty line for empty text', () => {
    expect(texts(layoutLines([], 100))).toEqual(['']);
  });

  it('keeps the spaces a line starts with, as code is indented', () => {
    expect(texts(layoutLines(items('  ab\n    cd'), 100))).toEqual(['  ab', '    cd']);
  });

  it('breaks Chinese and Japanese between any two characters, but not before closing punctuation', () => {
    expect(texts(layoutLines(items('\u4E2D\u6587\u5B57\u3002\u308A'), 30))).toEqual(['\u4E2D\u6587', '\u5B57\u3002\u308A']);
    expect(texts(layoutLines(items('ab\u4E2Dcd'), 30))).toEqual(['ab\u4E2D', 'cd']);
  });

  it('places a line at the start, the middle or the end of the width, measuring it without its last spaces', () => {
    const [left] = layoutLines(items('ab cd'), 100);
    expect(xs(left)).toEqual([0, 10, 20, 30, 40]);
    const [centered] = layoutLines(items('ab'), 100, 'center');
    expect(xs(centered)).toEqual([40, 50]);
    const [right] = layoutLines(items('ab '), 100, 'right');
    expect(xs(right)).toEqual([80, 90, 100]);
  });

  it('justifies every line but the last of a paragraph, spreading the spaces between its words', () => {
    const lines = layoutLines(items('a b c dd'), 60, 'justify');
    expect(texts(lines)).toEqual(['a b c ', 'dd']);
    expect(xs(lines[0])).toEqual([0, 10, 25, 35, 50, 60]);
    expect(xs(lines[1])).toEqual([0, 10]);
  });
});
