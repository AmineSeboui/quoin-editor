import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { playTokenRun, tokenRun } from './test-support/token-runs';

describe('clients that type, split and join one document at once', () => {
  it('keep every original letter and every typed token exactly once, and converge', () => {
    fc.assert(
      fc.property(tokenRun, (run) => {
        expect(playTokenRun(run)).toBeNull();
      }),
      { seed: 20261021, numRuns: 500 },
    );
  }, 60_000);
});
