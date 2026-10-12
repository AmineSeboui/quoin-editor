import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

describe('fast-check', () => {
  it('runs properties', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(s.split('').join('')).toBe(s);
      }),
    );
  });
});
