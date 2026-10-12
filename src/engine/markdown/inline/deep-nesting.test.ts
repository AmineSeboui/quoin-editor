import { describe, expect, it } from 'vitest';
import { text } from '../../model/inline';
import type { Inline, Mark } from '../../model/types';
import { parseInline } from './parse-inline';

const BUDGET_MS = 1000;
const b = { type: 'bold' };
const i = { type: 'italic' };
const comment = (id: string) => ({ type: 'comment', attrs: { id } });
const link = (href: string) => ({ type: 'link', attrs: { href } });

function commentSpans(comments: readonly Mark[], body: string): string {
  const opens = comments.map((mark) => `<span data-comment="${mark.attrs?.id}">`).join('');
  return opens + body + '</span>'.repeat(comments.length);
}

function timedParse(input: string): Inline {
  const start = performance.now();
  const result = parseInline(input);
  expect(performance.now() - start).toBeLessThan(BUDGET_MS);
  return result;
}

describe('deeply nested inline markup', () => {
  it('parses thousands of nested strong and emphasis pairs within the budget', () => {
    const input = '*a **a '.repeat(2000) + 'b' + ' a** a*'.repeat(2000);
    const plain = input.replaceAll('*', '');
    expect(timedParse(input)).toEqual([
      text(plain.slice(0, 2), [i]),
      text(plain.slice(2, -2), [b, i]),
      text(plain.slice(-2), [i]),
    ]);
  });

  it('parses ten thousand nested emphasis pairs within the budget', () => {
    const input = '*a '.repeat(10000) + 'b* '.repeat(10000);
    const plain = input.replaceAll('*', '');
    expect(timedParse(input)).toEqual([text(plain.slice(0, -1), [i]), text(' ')]);
  });

  it('pairs one long delimiter run with a hundred thousand closers within the budget', () => {
    const input = '*'.repeat(200001) + 'a**'.repeat(100000);
    expect(timedParse(input)).toEqual([text('*'), text('a'.repeat(100000), [b])]);
  });

  it('leaves tens of thousands of open tags without a matching close literal within the budget', () => {
    const input = '<u>a'.repeat(40000) + '</b>'.repeat(40000);
    expect(timedParse(input)).toEqual([text(input)]);
  });

  it('forms tens of thousands of links after as many open brackets within the budget', () => {
    const input = '['.repeat(50000) + '[a](b)'.repeat(50000);
    expect(timedParse(input)).toEqual([text('['.repeat(50000)), text('a'.repeat(50000), [link('b')])]);
  });

  it('keeps tens of thousands of escaped characters inside hundreds of comment spans within the budget', () => {
    const comments = Array.from({ length: 500 }, (_, n) => comment(`c${n}`));
    const input = commentSpans(comments, 'a\\*'.repeat(20000));
    expect(timedParse(input)).toEqual([text('a*'.repeat(20000), comments)]);
  });

  it('reopens a mark tens of thousands of times inside hundreds of comment spans within the budget', () => {
    const comments = Array.from({ length: 500 }, (_, n) => comment(`c${n}`));
    const input = commentSpans(comments, '<b>a</b>**a**'.repeat(10000));
    expect(timedParse(input)).toEqual([text('a'.repeat(20000), [...comments, b])]);
  });

  it('repeats an autolink tens of thousands of times inside hundreds of comment spans within the budget', () => {
    const comments = Array.from({ length: 500 }, (_, n) => comment(`c${n}`));
    const input = commentSpans(comments, '<https://a.b>'.repeat(20000));
    expect(timedParse(input)).toEqual([text('https://a.b'.repeat(20000), [link('https://a.b'), ...comments])]);
  });

  it('stacks hundreds of nested comment spans within the budget', () => {
    const depth = 600;
    const ids = Array.from({ length: depth }, (_, n) => `c${n}`);
    const input = ids.map((id) => `<span data-comment="${id}">a`).join('') + '</span>'.repeat(depth);
    const expected = ids.map((_, n) => text('a', ids.slice(0, n + 1).map(comment)));
    expect(timedParse(input)).toEqual(expected);
  });
});
