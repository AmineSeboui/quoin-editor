import { describe, expect, it } from 'vitest';
import type { Transaction } from '../state/transaction';
import { buildState, type SelectionSpec } from '../test-support/build-state';
import { DIVIDER_FIXTURE } from '../test-support/fixtures';
import { duplicateBlocks, insertBlockAfter } from './block-structure';
import type { Command } from './command';
import { LINE_SPLIT } from './line-split';
import { splitBlock } from './split-block';

type Entry = Parameters<typeof buildState>[0][number];

function dispatched(blocks: Entry[], selection: SelectionSpec, command: Command): Transaction {
  const sent: Transaction[] = [];
  expect(command(buildState(blocks, selection), (tr) => sent.push(tr))).toBe(true);
  expect(sent).toHaveLength(1);
  return sent[0];
}

describe('the line split mark', () => {
  it.each<[string, Entry[], SelectionSpec]>([
    ['opens a line above the caret', ['one'], { block: 0, offset: 0 }],
    ['splits a line in two', ['one'], { block: 0, offset: 1 }],
    ['opens a line after a selected divider', ['one', DIVIDER_FIXTURE], { node: 1 }],
  ])('is on what Enter dispatches when it %s', (_case, blocks, selection) => {
    expect(dispatched(blocks, selection, splitBlock()).getMeta(LINE_SPLIT)).toBe(true);
  });

  it.each<[string, Command]>([
    ['inserts', insertBlockAfter('DIVIDER')],
    ['copies', duplicateBlocks()],
  ])('is not on a block a command %s', (_case, command) => {
    expect(dispatched(['one'], { block: 0, offset: 3 }, command).getMeta(LINE_SPLIT)).toBeUndefined();
  });
});
