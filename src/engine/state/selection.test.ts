import { describe, expect, it } from 'vitest';
import { text } from '../model/inline';
import { removeBlocksStep } from '../transform/block-steps';
import { replaceInlineStep } from '../transform/replace-inline-step';
import { buildState } from '../test-support/build-state';
import { DIVIDER_FIXTURE } from '../test-support/fixtures';
import {
  blockRangeSelection,
  defaultSelection,
  endOf,
  isCollapsed,
  mapSelection,
  nodeSelection,
  primaryRegion,
  sameSelection,
  selectedBlockIds,
  selectionRange,
  startOf,
  textSelection,
  validateSelection,
} from './selection';

const p = (block: string, offset: number) => ({ block, region: 'text', offset });

describe('selection helpers', () => {
  const state = buildState(['one', 'two', DIVIDER_FIXTURE, 'four']);

  it('orders a backward range', () => {
    expect(selectionRange(state.doc, textSelection(p('b1', 2), p('b0', 1)))).toEqual({ from: p('b0', 1), to: p('b1', 2) });
  });

  it('lists the blocks a selection touches', () => {
    expect(selectedBlockIds(state.doc, textSelection(p('b0', 1), p('b3', 0)))).toEqual(['b0', 'b1', 'b2', 'b3']);
    expect(selectedBlockIds(state.doc, { kind: 'blocks', anchor: 'b3', head: 'b1' })).toEqual(['b1', 'b2', 'b3']);
  });

  it('clamps offsets and turns text positions in void blocks into node selections', () => {
    expect(validateSelection(state.doc, state.schema, textSelection(p('b0', 99)))).toEqual(textSelection(p('b0', 3)));
    expect(validateSelection(state.doc, state.schema, textSelection(p('b2', 0)))).toEqual({ kind: 'node', block: 'b2' });
    expect(validateSelection(state.doc, state.schema, textSelection(p('zz', 0)))).toEqual(textSelection(p('b0', 0)));
  });

  it('has no selection in an empty document', () => {
    const empty = buildState([]);
    expect(defaultSelection(empty.doc, empty.schema)).toBeNull();
    expect(empty.selection).toBeNull();
  });

  it('has no text range for node and block selections and no blocks for none', () => {
    expect(selectionRange(state.doc, nodeSelection('b2'))).toBeNull();
    expect(selectionRange(state.doc, blockRangeSelection('b0', 'b1'))).toBeNull();
    expect(selectionRange(state.doc, null)).toBeNull();
    expect(selectedBlockIds(state.doc, nodeSelection('b2'))).toEqual(['b2']);
    expect(selectedBlockIds(state.doc, null)).toEqual([]);
  });

  it('builds selections with the head defaulting to the anchor', () => {
    expect(textSelection(p('b0', 1))).toEqual({ kind: 'text', anchor: p('b0', 1), head: p('b0', 1) });
    expect(blockRangeSelection('b1')).toEqual({ kind: 'blocks', anchor: 'b1', head: 'b1' });
  });

  it('tells collapsed and equal selections apart', () => {
    expect(isCollapsed(textSelection(p('b0', 1)))).toBe(true);
    expect(isCollapsed(textSelection(p('b0', 1), p('b0', 2)))).toBe(false);
    expect(isCollapsed(nodeSelection('b2'))).toBe(false);
    expect(isCollapsed(null)).toBe(false);
    expect(sameSelection(textSelection(p('b0', 1)), textSelection(p('b0', 1)))).toBe(true);
    expect(sameSelection(textSelection(p('b0', 1)), textSelection(p('b0', 2)))).toBe(false);
    expect(sameSelection(nodeSelection('b2'), nodeSelection('b2'))).toBe(true);
    expect(sameSelection(nodeSelection('b2'), nodeSelection('b1'))).toBe(false);
    expect(sameSelection(blockRangeSelection('b0', 'b1'), blockRangeSelection('b0', 'b1'))).toBe(true);
    expect(sameSelection(blockRangeSelection('b0', 'b1'), nodeSelection('b0'))).toBe(false);
    expect(sameSelection(null, null)).toBe(true);
    expect(sameSelection(null, nodeSelection('b0'))).toBe(false);
  });

  it('finds the primary region of each kind of block', () => {
    const rich = buildState([
      'one',
      { id: 'x', type: 'CALLOUT', data: { tone: 'info', body: 'hi' } },
      { id: 'x', type: 'TABLE', data: { rows: [['a', 'b']] } },
      DIVIDER_FIXTURE,
    ]);
    const regions = rich.doc.blocks.map((block) => primaryRegion(rich.schema, block));
    expect(regions).toEqual(['text', 'body', 'cell:0:0', null]);
  });

  it('starts and ends a block at its primary region or node-selects a void block', () => {
    expect(startOf(state.doc, state.schema, 'b1')).toEqual(textSelection(p('b1', 0)));
    expect(endOf(state.doc, state.schema, 'b1')).toEqual(textSelection(p('b1', 3)));
    expect(startOf(state.doc, state.schema, 'b2')).toEqual(nodeSelection('b2'));
    expect(endOf(state.doc, state.schema, 'b2')).toEqual(nodeSelection('b2'));
    expect(() => startOf(state.doc, state.schema, 'zz')).toThrow();
  });

  it('selects a void first block as a node', () => {
    const divided = buildState([DIVIDER_FIXTURE, 'a']);
    expect(defaultSelection(divided.doc, divided.schema)).toEqual(nodeSelection('b0'));
  });
});

describe('validateSelection', () => {
  const table = { id: 'x', type: 'TABLE', data: { rows: [['a', 'b']] } };
  const state = buildState(['one', table, DIVIDER_FIXTURE]);
  const validate = (selection: Parameters<typeof validateSelection>[2]) =>
    validateSelection(state.doc, state.schema, selection);

  it('keeps a valid selection as it is', () => {
    const selection = textSelection(p('b0', 1), p('b0', 2));
    expect(validate(selection)).toBe(selection);
    expect(validate(nodeSelection('b2'))).toEqual(nodeSelection('b2'));
    expect(validate(blockRangeSelection('b0', 'b2'))).toEqual(blockRangeSelection('b0', 'b2'));
  });

  it('turns a missing region into the primary region at offset zero', () => {
    const cell = { block: 'b1', region: 'cell:0:0', offset: 0 };
    expect(validate(textSelection({ block: 'b1', region: 'text', offset: 4 }))).toEqual(textSelection(cell));
    expect(validate(textSelection({ block: 'b0', region: 'nope', offset: 2 }))).toEqual(textSelection(p('b0', 0)));
  });

  it('clamps a negative offset and clamps both ends of a range', () => {
    expect(validate(textSelection(p('b0', -3), p('b0', 50)))).toEqual(textSelection(p('b0', 0), p('b0', 3)));
  });

  it('node-selects the void block when either end is in it', () => {
    expect(validate(textSelection(p('b0', 1), p('b2', 0)))).toEqual(nodeSelection('b2'));
    expect(validate(textSelection(p('b2', 0), p('b0', 1)))).toEqual(nodeSelection('b2'));
  });

  it('turns a node selection that lands on a text block into a caret at its start', () => {
    expect(validate(nodeSelection('b0'))).toEqual(textSelection(p('b0', 0)));
  });

  it('falls back to the default selection for missing blocks and a missing selection', () => {
    expect(validate(null)).toEqual(textSelection(p('b0', 0)));
    expect(validate(nodeSelection('zz'))).toEqual(textSelection(p('b0', 0)));
    expect(validate(blockRangeSelection('b0', 'zz'))).toEqual(textSelection(p('b0', 0)));
    expect(validate(textSelection(p('b0', 1), p('zz', 0)))).toEqual(textSelection(p('b0', 0)));
  });

  it('has no selection in an empty document', () => {
    const empty = buildState([]);
    expect(validateSelection(empty.doc, empty.schema, nodeSelection('b0'))).toBeNull();
    expect(validateSelection(empty.doc, empty.schema, null)).toBeNull();
  });
});

describe('mapSelection', () => {
  const state = buildState(['abcd', 'efgh', 'ijkl']);
  const insert = (offset: number) => replaceInlineStep('b0', 'text', offset, offset, [text('XY')]).apply(state.doc).map;
  const range = (anchor: number, head: number) => textSelection(p('b0', anchor), p('b0', head));

  it('moves a caret past text inserted at the caret', () => {
    expect(mapSelection(range(2, 2), insert(2), state.doc)).toEqual(range(4, 4));
  });

  it('moves the anchor of a forward selection past text inserted at its start', () => {
    expect(mapSelection(range(1, 3), insert(1), state.doc)).toEqual(range(3, 5));
  });

  it('keeps the anchor of a backward selection before text inserted at its end', () => {
    expect(mapSelection(range(3, 1), insert(3), state.doc)).toEqual(range(3, 1));
    expect(mapSelection(range(3, 1), insert(1), state.doc)).toEqual(range(3 + 2, 3));
  });

  it('treats the anchor as forward when no document is given', () => {
    expect(mapSelection(range(3, 1), insert(3))).toEqual(range(5, 1));
  });

  it('returns the same selection when nothing moves', () => {
    const selection = range(1, 2);
    expect(mapSelection(selection, insert(3), state.doc)).toBe(selection);
    expect(mapSelection(nodeSelection('b1'), insert(3), state.doc)).toEqual(nodeSelection('b1'));
  });

  it('moves node and block selections off removed blocks', () => {
    const { map } = removeBlocksStep(1, 1).apply(state.doc);
    expect(mapSelection(nodeSelection('b1'), map)).toEqual(nodeSelection('b2'));
    expect(mapSelection(blockRangeSelection('b1', 'b2'), map, state.doc)).toEqual(blockRangeSelection('b2', 'b2'));
    expect(mapSelection(blockRangeSelection('b1', 'b0'), map, state.doc)).toEqual(blockRangeSelection('b0', 'b0'));
  });
});
