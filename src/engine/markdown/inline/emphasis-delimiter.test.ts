import { describe, expect, it } from 'vitest';
import { chooseDelimiter } from './emphasis-delimiter';

describe('chooseDelimiter', () => {
  it('prefers the canonical delimiter of each mark', () => {
    expect(chooseDelimiter('bold', '', 'x', '')).toBe('**');
    expect(chooseDelimiter('italic', '', 'x', '')).toBe('_');
    expect(chooseDelimiter('strike', '', 'x', '')).toBe('~~');
  });

  it('uses an asterisk for italic inside a word, where an underscore cannot open or close', () => {
    expect(chooseDelimiter('italic', 'a', 'b', 'c')).toBe('*');
    expect(chooseDelimiter('bold', 'a', 'b', 'c')).toBe('**');
    expect(chooseDelimiter('italic', 'a', 'b', ' ')).toBe('*');
    expect(chooseDelimiter('italic', ' ', 'b', 'c')).toBe('*');
  });

  it('returns null when the content starts or ends with whitespace', () => {
    expect(chooseDelimiter('bold', '', ' x', '')).toBeNull();
    expect(chooseDelimiter('italic', '', 'x ', '')).toBeNull();
    expect(chooseDelimiter('strike', '', '\nx', '')).toBeNull();
    expect(chooseDelimiter('bold', '', '', '')).toBeNull();
  });

  it('returns null when no delimiter can open or close next to the punctuation around it', () => {
    expect(chooseDelimiter('bold', 'a', '!x!', 'b')).toBeNull();
    expect(chooseDelimiter('bold', 'a', 'x!', ' ')).toBe('**');
    expect(chooseDelimiter('strike', 'a', '!', 'b')).toBeNull();
  });

  it('reads the characters around it as code points', () => {
    expect(chooseDelimiter('italic', '\uD83D\uDC4D', 'x', '\uD83D\uDC4D')).toBe('_');
    expect(chooseDelimiter('italic', 'a', '\uD83D\uDC4D', 'b')).toBeNull();
  });

  it('never lets a delimiter fuse with a run of its own character', () => {
    expect(chooseDelimiter('bold', '*', 'x', ' ')).toBe('__');
    expect(chooseDelimiter('italic', '_', 'x', ' ')).toBe('*');
    expect(chooseDelimiter('bold', '', '*a*', ' ')).toBe('__');
    expect(chooseDelimiter('bold', '', 'a*', ' ')).toBe('__');
    expect(chooseDelimiter('strike', '~', 'x', ' ')).toBeNull();
    expect(chooseDelimiter('bold', 'a**', 'x', '')).toBe('__');
  });

  it('does not count an escaped character as a run', () => {
    expect(chooseDelimiter('bold', '\\*', 'x', ' ')).toBe('**');
    expect(chooseDelimiter('bold', '', 'x\\*', ' ')).toBe('**');
    expect(chooseDelimiter('bold', '\\\\*', 'x', ' ')).toBe('__');
  });
});
