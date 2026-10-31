// @vitest-environment node
import { expect, it } from 'vitest';
import type { QuoinBlock } from '../model/quoin-block';
import { diffBlocks } from './diff-blocks';

const BLOCKS = 5_000;
const BUDGET_MS = 3_000;

const document = (prefix: string): QuoinBlock[] =>
  Array.from({ length: BLOCKS }, (_, at) => ({
    id: `${prefix}${at}`,
    type: 'MARKDOWN',
    data: { markdown: `${prefix} paragraph ${at}` },
  }));

const fastest = (run: () => unknown) => {
  let best = Infinity;
  for (let attempt = 0; attempt < 3; attempt++) {
    const start = performance.now();
    run();
    best = Math.min(best, performance.now() - start);
  }
  return best;
};

it('diffs two fully different documents of 5,000 blocks without ids in common within its budget', () => {
  const before = document('old');
  const after = document('new');
  const diff = diffBlocks(before, after);
  expect(diff.filter((d) => d.op === 'delete')).toHaveLength(BLOCKS);
  expect(diff.filter((d) => d.op === 'insert')).toHaveLength(BLOCKS);
  expect(fastest(() => diffBlocks(before, after))).toBeLessThan(BUDGET_MS);
}, 60_000);
