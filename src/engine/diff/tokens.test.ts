import { describe, expect, it } from 'vitest';
import { atom, text } from '../model/inline';
import type { Inline } from '../model/types';
import { tokenize } from './tokens';

const texts = (inline: Inline) => tokenize(inline).map((token) => (token.kind === 'text' ? token.text : token.type));

describe('tokenize', () => {
  it('splits words, whitespace runs and punctuation characters', () => {
    expect(texts([text('Hello,  world! (ok)')])).toEqual(['Hello', ',', '  ', 'world', '!', ' ', '(', 'ok', ')']);
  });

  it('keeps underscores, digits and combining marks inside a word', () => {
    expect(texts([text('snake_case 42nd cafe\u{301}')])).toEqual(['snake_case', ' ', '42nd', ' ', 'cafe\u{301}']);
  });

  it('treats a line break as whitespace', () => {
    expect(texts([text('a\n\nb')])).toEqual(['a', '\n\n', 'b']);
  });

  it('keeps one emoji whole, with its variation selector, modifier or joined parts', () => {
    expect(texts([text('\u{1F600}')])).toEqual(['\u{1F600}']);
    expect(texts([text('\u{2764}\u{FE0F}')])).toEqual(['\u{2764}\u{FE0F}']);
    expect(texts([text('\u{1F44D}\u{1F3FD}')])).toEqual(['\u{1F44D}\u{1F3FD}']);
    const family = '\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}';
    expect(texts([text(`${family}!`)])).toEqual([family, '!']);
  });

  it('gives every token the marks of its node', () => {
    const bold = [{ type: 'bold' }];
    expect(tokenize([text('ab cd', bold), text('!')])).toEqual([
      text('ab', bold),
      text(' ', bold),
      text('cd', bold),
      text('!'),
    ]);
  });

  it('never merges a word across differently marked nodes', () => {
    expect(texts([text('he'), text('llo', [{ type: 'bold' }])])).toEqual(['he', 'llo']);
  });

  it('keeps an atom as one token', () => {
    const mention = atom('mention', { id: '1', label: 'Ann' }, [{ type: 'bold' }]);
    expect(tokenize([text('hi '), mention])).toEqual([text('hi'), text(' '), mention]);
  });

  it('returns nothing for empty input and for an empty text node', () => {
    expect(tokenize([])).toEqual([]);
    expect(tokenize([text('')])).toEqual([]);
  });
});
