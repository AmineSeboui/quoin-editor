import { describe, expect, it } from 'vitest';
import { text } from '../../model/inline';
import type { Inline } from '../../model/types';
import { parseInline } from './parse-inline';

const BUDGET_MS = 1000;
const b = { type: 'bold' };
const i = { type: 'italic' };
const comment = (id: string) => ({ type: 'comment', attrs: { id } });

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

  it('stacks hundreds of nested comment spans within the budget', () => {
    const depth = 600;
    const ids = Array.from({ length: depth }, (_, n) => `c${n}`);
    const input = ids.map((id) => `<span data-comment="${id}">a`).join('') + '</span>'.repeat(depth);
    const expected = ids.map((_, n) => text('a', ids.slice(0, n + 1).map(comment)));
    expect(timedParse(input)).toEqual(expected);
  });
});
