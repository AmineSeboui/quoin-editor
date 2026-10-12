import { describe, expect, it } from 'vitest';
import { linePrefix, parseLine } from './line-kind';

describe('parseLine', () => {
  it.each([
    ['plain', { kind: 'paragraph', rest: 'plain' }],
    ['# H', { kind: 'heading', level: 1, rest: 'H' }],
    ['###### H6', { kind: 'heading', level: 6, rest: 'H6' }],
    ['####### seven', { kind: 'paragraph', rest: '####### seven' }],
    ['#nospace', { kind: 'paragraph', rest: '#nospace' }],
    ['## closed ##', { kind: 'heading', level: 2, rest: 'closed' }],
    ['# ', { kind: 'heading', level: 1, rest: '' }],
    ['- item', { kind: 'bullet', rest: 'item' }],
    ['* item', { kind: 'bullet', rest: 'item' }],
    ['+ item', { kind: 'bullet', rest: 'item' }],
    ['-', { kind: 'bullet', rest: '' }],
    ['- [ ] todo', { kind: 'task', checked: false, rest: 'todo' }],
    ['- [x] done', { kind: 'task', checked: true, rest: 'done' }],
    ['* [X] done', { kind: 'task', checked: true, rest: 'done' }],
    ['1. one', { kind: 'ordered', start: 1, rest: 'one' }],
    ['7) seven', { kind: 'ordered', start: 7, rest: 'seven' }],
    ['> quote', { kind: 'quote', rest: 'quote' }],
    ['>quote', { kind: 'quote', rest: 'quote' }],
    ['\\# escaped', { kind: 'paragraph', rest: '\\# escaped' }],
    ['   # indented', { kind: 'heading', level: 1, rest: 'indented' }],
  ])('parses %j', (input, expected) => expect(parseLine(input)).toEqual(expected));

  it('returns only the fields that belong to the kind', () => {
    expect(Object.keys(parseLine('plain'))).toEqual(['kind', 'rest']);
    expect(Object.keys(parseLine('## h'))).toEqual(['kind', 'level', 'rest']);
    expect(Object.keys(parseLine('1. o'))).toEqual(['kind', 'start', 'rest']);
  });

  it('keeps text that only looks like a marker as a paragraph', () => {
    expect(parseLine('    # four spaces').kind).toBe('paragraph');
    expect(parseLine('-x').kind).toBe('paragraph');
    expect(parseLine('1234567890. ten digits').kind).toBe('paragraph');
    expect(parseLine('1.x').kind).toBe('paragraph');
    expect(parseLine('- [x]done')).toEqual({ kind: 'bullet', rest: '[x]done' });
  });

  it('keeps a hash run that is not a closing sequence', () => {
    expect(parseLine('# C#')).toEqual({ kind: 'heading', level: 1, rest: 'C#' });
    expect(parseLine('# foo \\#')).toEqual({ kind: 'heading', level: 1, rest: 'foo \\#' });
    expect(parseLine('## a ## b')).toEqual({ kind: 'heading', level: 2, rest: 'a ## b' });
  });

  it('reads only the first line of a multi line string', () => {
    expect(parseLine('# a\n# b')).toEqual({ kind: 'heading', level: 1, rest: 'a\n# b' });
  });

  it('writes canonical prefixes', () => {
    expect(linePrefix({ kind: 'paragraph' })).toBe('');
    expect(linePrefix({ kind: 'heading', level: 3 })).toBe('### ');
    expect(linePrefix({ kind: 'bullet' })).toBe('- ');
    expect(linePrefix({ kind: 'ordered', start: 4 })).toBe('4. ');
    expect(linePrefix({ kind: 'ordered' })).toBe('1. ');
    expect(linePrefix({ kind: 'task', checked: true })).toBe('- [x] ');
    expect(linePrefix({ kind: 'task' })).toBe('- [ ] ');
    expect(linePrefix({ kind: 'quote' })).toBe('> ');
  });

  it('keeps a heading level inside one to six', () => {
    expect(linePrefix({ kind: 'heading' })).toBe('# ');
    expect(linePrefix({ kind: 'heading', level: 0 })).toBe('# ');
    expect(linePrefix({ kind: 'heading', level: 9 })).toBe('###### ');
  });

  it('parses back every prefix it writes', () => {
    const attrs = [
      { kind: 'heading', level: 5 },
      { kind: 'bullet' },
      { kind: 'ordered', start: 12 },
      { kind: 'task', checked: true },
      { kind: 'task', checked: false },
      { kind: 'quote' },
    ] as const;
    for (const a of attrs) expect(parseLine(`${linePrefix(a)}body`)).toMatchObject({ ...a, rest: 'body' });
  });
});
