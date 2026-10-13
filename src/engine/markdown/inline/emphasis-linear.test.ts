import { describe, expect, it } from 'vitest';
import { parseInline } from './parse-inline';

const bestOf = (runs: number, work: () => void) => {
  let best = Infinity;
  for (let run = 0; run < runs; run++) {
    const start = performance.now();
    work();
    best = Math.min(best, performance.now() - start);
  }
  return best;
};

describe('emphasis matching', () => {
  it('stays linear when closers keep failing and pairs with other keys keep cutting the opener stack', () => {
    const input = (n: number) => ' _a'.repeat(n) + 'a* a_ '.repeat(n);
    parseInline(input(2000));
    const small = bestOf(5, () => parseInline(input(20000)));
    const large = bestOf(5, () => parseInline(input(40000)));
    expect(large).toBeLessThan(5000);
    expect(large / small).toBeLessThan(3);
  });
});
