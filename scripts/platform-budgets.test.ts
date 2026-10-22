// @vitest-environment node
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { describeBuilt } from '../test/support/built-dist';
import { addedGzip } from './measure-size.mjs';
import { incrementalBudget, packageEntries } from './package-entries.mjs';

const root = resolve(__dirname, '..');
const budgetOf = (name: string) => {
  const { total, added } = packageEntries.find((entry) => entry.name === name)!;
  return { total, added };
};

// The collaboration adapter and the presence drawn with it, which a host loads together. The plan's figure rather than a
// measure plus 4 percent: about 2 percent above the 11,765 B they added together when they landed.
const COLLABORATION = 12_000;

describe('the budgets of the platform entries', () => {
  it('hold the collaboration, comments and AI entries to what each added to the main entry when it landed', () => {
    expect(['yjs', 'presence', 'comments', 'ai'].map(budgetOf)).toEqual([
      { added: incrementalBudget(8_044) },
      { added: incrementalBudget(4_305) },
      { added: incrementalBudget(6_547) },
      { added: incrementalBudget(8_338) },
    ]);
  });
});

describeBuilt('the built collaboration entries', ['index.js', 'yjs.js', 'presence.js'], () => {
  it('add no more than 12 KB to the main entry together', async () => {
    expect(await addedGzip(root, ['yjs', 'presence'])).toBeLessThanOrEqual(COLLABORATION);
  });
});
