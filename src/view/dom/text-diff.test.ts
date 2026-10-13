import { describe, expect, it } from 'vitest';
import { textDiff, type TextEdit } from './text-diff';

const apply = (before: string, edit: TextEdit) => before.slice(0, edit.from) + edit.insert + before.slice(edit.to);

describe('textDiff', () => {
  it.each([
    ['abc', 'abc', undefined, null],
    ['abc', 'abXc', undefined, { from: 2, to: 2, insert: 'X' }],
    ['abc', 'ac', undefined, { from: 1, to: 2, insert: '' }],
    ['hello', 'help', undefined, { from: 3, to: 5, insert: 'p' }],
    ['aa', 'aaa', 2, { from: 1, to: 1, insert: 'a' }],
    ['aa', 'aaa', 1, { from: 0, to: 0, insert: 'a' }],
    ['', 'にほん', undefined, { from: 0, to: 0, insert: 'にほん' }],
  ])('%j to %j', (before, after, hint, expected) => expect(textDiff(before, after, hint)).toEqual(expected));

  it.each([
    ['aaa', 'aa', 1, { from: 1, to: 2, insert: '' }],
    ['aaa', 'aa', 0, { from: 0, to: 1, insert: '' }],
    ['aaa', 'aa', 2, { from: 2, to: 3, insert: '' }],
    ['aaa', 'aa', undefined, { from: 2, to: 3, insert: '' }],
    ['abab', 'ababab', 4, { from: 2, to: 2, insert: 'ab' }],
    ['abab', 'ababab', 2, { from: 0, to: 0, insert: 'ab' }],
    ['abab', 'ababab', 9, { from: 4, to: 4, insert: 'ab' }],
    ['abab', 'ababab', -9, { from: 0, to: 0, insert: 'ab' }],
  ])('places the ambiguous edit %j to %j near caret %j', (before, after, hint, expected) =>
    expect(textDiff(before, after, hint)).toEqual(expected),
  );

  it('ignores the caret hint when the edit is unambiguous', () => {
    expect(textDiff('abc', 'abXc', 0)).toEqual({ from: 2, to: 2, insert: 'X' });
    expect(textDiff('abc', 'abXc', 99)).toEqual({ from: 2, to: 2, insert: 'X' });
  });

  it('replaces a whole code point rather than half of a surrogate pair', () => {
    expect(textDiff('a😀', 'a😁')).toEqual({ from: 1, to: 3, insert: '😁' });
    expect(textDiff('😀b', '😁b')).toEqual({ from: 0, to: 2, insert: '😁' });
  });

  it('never splits a pair that is inserted or removed', () => {
    expect(textDiff('a😀', 'a😀😁')).toEqual({ from: 3, to: 3, insert: '😁' });
    expect(textDiff('😀😁', '😁')).toEqual({ from: 0, to: 2, insert: '' });
  });

  it('describes every change as an edit that rebuilds the new text', () => {
    const samples = ['', 'a', 'aa', 'ab', 'aab', 'abab', 'banana', 'bandana', 'x\ny', 'x\n\ny', '￼', 'a￼a'];
    for (const before of samples) {
      for (const after of samples) {
        for (const hint of [undefined, 0, 1, 2, 3, 6]) {
          const edit = textDiff(before, after, hint);
          if (before === after) expect(edit).toBeNull();
          else expect(apply(before, edit as TextEdit)).toBe(after);
        }
      }
    }
  });
});
