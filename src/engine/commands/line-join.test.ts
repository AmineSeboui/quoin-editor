import { describe, expect, it } from 'vitest';
import type { Transaction } from '../state/transaction';
import { buildState, type SelectionSpec } from '../test-support/build-state';
import { DIVIDER_FIXTURE } from '../test-support/fixtures';
import { deleteBlocks } from './block-structure';
import type { Command } from './command';
import { deleteAtEnd, deleteAtStart } from './delete-at-boundary';
import { deleteBackward, deleteSelection } from './delete-commands';
import { LINE_JOIN } from './line-join';

type Entry = Parameters<typeof buildState>[0][number];

function dispatched(blocks: Entry[], selection: SelectionSpec, command: Command): Transaction {
  const sent: Transaction[] = [];
  expect(command(buildState(blocks, selection), (tr) => sent.push(tr))).toBe(true);
  expect(sent).toHaveLength(1);
  return sent[0];
}

const closedToggle: Entry = { id: 'unused', type: 'TOGGLE', data: { markdown: 'Summary', open: false } };
const child: Entry = { id: 'unused', type: 'MARKDOWN', data: { markdown: 'hidden' }, indent: 1 };

describe('the line join mark', () => {
  it.each<[string, Entry[], SelectionSpec]>([
    ['merges a line into the one above', ['one', 'two'], { block: 1, offset: 0 }],
    ['drops an empty line after a divider', ['one', DIVIDER_FIXTURE, ''], { block: 2, offset: 0 }],
    ['joins a line into a closed toggle', [closedToggle, child, 'line'], { block: 2, offset: 0 }],
    ['joins an empty line into a closed toggle', [closedToggle, child, ''], { block: 2, offset: 0 }],
  ])('is on what deleteAtStart dispatches when it %s', (_case, blocks, caret) => {
    expect(dispatched(blocks, caret, deleteAtStart).getMeta(LINE_JOIN)).toBe(true);
  });

  it.each<[string, Entry[], SelectionSpec]>([
    ['merges the next line into this one', ['one', 'two'], { block: 0, offset: 3 }],
    ['drops an empty line before a divider', ['', DIVIDER_FIXTURE, 'two'], { block: 0, offset: 0 }],
  ])('is on what deleteAtEnd dispatches when it %s', (_case, blocks, caret) => {
    expect(dispatched(blocks, caret, deleteAtEnd).getMeta(LINE_JOIN)).toBe(true);
  });

  it('is on what Backspace dispatches at the start of a line', () => {
    expect(dispatched(['one', 'two'], { block: 1, offset: 0 }, deleteBackward).getMeta(LINE_JOIN)).toBe(true);
  });

  it('is not on a text range deleted across whole blocks', () => {
    const range = { anchor: { block: 0, offset: 1 }, head: { block: 2, offset: 1 } };
    const tr = dispatched(['one', DIVIDER_FIXTURE, 'two'], range, deleteSelection);
    expect(tr.steps.map((step) => step.stepType)).toContain('removeBlocks');
    expect(tr.getMeta(LINE_JOIN)).toBeUndefined();
  });

  it('is not on selected blocks deleted whole', () => {
    expect(dispatched(['one', DIVIDER_FIXTURE, 'two'], { node: 1 }, deleteBlocks).getMeta(LINE_JOIN)).toBeUndefined();
  });
});
