import { describe, expect, it } from 'vitest';
import { parseLine } from './line-kind';
import { lineMarkdown } from './line-markdown';

describe('lineMarkdown', () => {
  it('puts the line prefix in front of the body', () => {
    expect(lineMarkdown({ kind: 'paragraph' }, 'a')).toBe('a');
    expect(lineMarkdown({ kind: 'heading', level: 2 }, 'a')).toBe('## a');
    expect(lineMarkdown({ kind: 'ordered', start: 4 }, 'a')).toBe('4. a');
    expect(lineMarkdown({ kind: 'task', checked: true }, 'a')).toBe('- [x] a');
    expect(lineMarkdown({ kind: 'quote' }, 'a')).toBe('> a');
  });

  it('escapes a trailing hash run of a heading after a space or a tab', () => {
    expect(lineMarkdown({ kind: 'heading', level: 1 }, 'a ##')).toBe('# a \\##');
    expect(lineMarkdown({ kind: 'heading', level: 1 }, 'a\t#')).toBe('# a\t\\#');
    expect(parseLine(lineMarkdown({ kind: 'heading', level: 1 }, 'a\t#')).rest).toBe('a\t\\#');
  });

  it('leaves hashes that are part of a word, and hashes in other kinds, alone', () => {
    expect(lineMarkdown({ kind: 'heading', level: 1 }, 'a#')).toBe('# a#');
    expect(lineMarkdown({ kind: 'bullet' }, 'a ##')).toBe('- a ##');
  });
});
