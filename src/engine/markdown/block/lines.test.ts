import { describe, expect, it } from 'vitest';
import { Cursor, splitLines, trimBlank, trimBlankEnd, trimBlankStart } from './lines';

describe('splitLines', () => {
  it('splits on every line ending', () => {
    expect(splitLines('a\r\nb\rc\nd')).toEqual(['a', 'b', 'c', 'd']);
    expect(splitLines('a\n')).toEqual(['a', '']);
  });

  it('replaces a null character', () => {
    expect(splitLines('a\u0000b')).toEqual(['a\uFFFDb']);
  });
});

describe('trimming', () => {
  it('trims spaces, tabs and newlines only', () => {
    expect(trimBlank(' \t\na b\n \t')).toBe('a b');
    expect(trimBlankStart('  a ')).toBe('a ');
    expect(trimBlankEnd('  a ')).toBe('  a');
    expect(trimBlank('\u00A0a\u00A0')).toBe('\u00A0a\u00A0');
    expect(trimBlank(' \t ')).toBe('');
  });
});

describe('Cursor', () => {
  const at = (line: string) => {
    const cursor = new Cursor();
    cursor.reset(line);
    return cursor;
  };

  it('counts a tab up to the next multiple of four columns', () => {
    expect(at('\tx').indent).toBe(4);
    expect(at('  \tx').indent).toBe(4);
    expect(at(' \t \tx').indent).toBe(8);
    expect(at('\tx').indented).toBe(true);
    expect(at('   x').indented).toBe(false);
  });

  it('reads blank lines and the text after the indentation', () => {
    expect(at(' \t ').blank).toBe(true);
    expect(at('').blank).toBe(true);
    expect(at('  x y').blank).toBe(false);
    expect(at('  x y').text).toBe('x y');
  });

  it('consumes part of a tab and fills the rest with spaces', () => {
    const cursor = at('\t\tx');
    cursor.advance(1, true);
    expect(cursor.column).toBe(1);
    expect(cursor.rest()).toBe('   \tx');
    cursor.advance(4, true);
    expect(cursor.rest()).toBe('   x');
    expect(cursor.indent).toBe(3);
  });

  it('counts a tab as one character when advancing by characters', () => {
    const cursor = at('>\tx');
    cursor.advance(1);
    cursor.advance(1);
    expect(cursor.column).toBe(4);
    expect(cursor.rest()).toBe('x');
  });

  it('moves to the first character that is not a space or tab', () => {
    const cursor = at('  \t- a');
    cursor.advanceToNonspace();
    expect(cursor.column).toBe(4);
    expect(cursor.rest()).toBe('- a');
    expect(cursor.next).toBe('-');
  });

  it('restores a saved position, including a part consumed tab', () => {
    const cursor = at('\tx');
    cursor.advance(2, true);
    const saved = cursor.mark();
    cursor.advance(2, true);
    expect(cursor.rest()).toBe('x');
    cursor.restore(saved);
    expect(cursor.column).toBe(2);
    expect(cursor.rest()).toBe('  x');
  });

  it('stops at the end of the line', () => {
    const cursor = at('ab');
    cursor.advance(10, true);
    expect(cursor.column).toBe(2);
    expect(cursor.next).toBeUndefined();
  });
});
