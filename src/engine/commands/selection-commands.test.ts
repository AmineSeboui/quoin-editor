import { describe, expect, it } from 'vitest';
import { blockRangeSelection } from '../state/selection';
import { buildState, caretOf, run } from '../test-support/build-state';
import { DIVIDER_FIXTURE } from '../test-support/fixtures';
import { selectAll, selectBlock, setSelection } from './selection-commands';

describe('selection commands', () => {
  it('selects the region first, then every block', () => {
    const start = buildState(['hello', 'world'], { block: 0, offset: 2 });
    const region = run(start, selectAll).state;
    expect(caretOf(region)).toEqual({ anchor: { block: 0, offset: 0 }, head: { block: 0, offset: 5 } });
    expect(caretOf(run(region, selectAll).state)).toEqual({ blocks: [0, 1] });
  });

  it('selects every block from a range of blocks, a node or several blocks of text', () => {
    const blocks = buildState(['a', 'b', 'c'], { blocks: [1, 1] });
    expect(caretOf(run(blocks, selectAll).state)).toEqual({ blocks: [0, 2] });
    expect(caretOf(run(buildState(['a', DIVIDER_FIXTURE, 'c'], { node: 1 }), selectAll).state)).toEqual({ blocks: [0, 2] });
    const across = buildState(['abc', 'def', 'ghi'], { anchor: { block: 0, offset: 1 }, head: { block: 1, offset: 1 } });
    expect(caretOf(run(across, selectAll).state)).toEqual({ blocks: [0, 2] });
  });

  it('goes straight to every block from an empty region', () => {
    expect(caretOf(run(buildState(['', 'x'], { block: 0, offset: 0 }), selectAll).state)).toEqual({ blocks: [0, 1] });
  });

  it('selects the region the head is in, backwards selections included', () => {
    const backwards = buildState(['hello'], { anchor: { block: 0, offset: 4 }, head: { block: 0, offset: 1 } });
    expect(caretOf(run(backwards, selectAll).state)).toEqual({ anchor: { block: 0, offset: 0 }, head: { block: 0, offset: 5 } });
    const full = buildState(['hello'], { anchor: { block: 0, offset: 5 }, head: { block: 0, offset: 0 } });
    expect(caretOf(run(full, selectAll).state)).toEqual({ blocks: [0, 0] });
  });

  it('selects the region of a table cell', () => {
    const state = buildState([{ id: 't', type: 'TABLE', data: { rows: [['abc', 'x']], header: false } }], {
      block: 0,
      region: 'cell:0:1',
      offset: 0,
    });
    expect(caretOf(run(state, selectAll).state)).toEqual({
      anchor: { block: 0, region: 'cell:0:1', offset: 0 },
      head: { block: 0, region: 'cell:0:1', offset: 1 },
    });
  });

  it('does nothing in an empty document', () => {
    expect(run(buildState([], null), selectAll).ok).toBe(false);
    expect(run(buildState([], null), selectBlock).ok).toBe(false);
  });

  it('selects the block of the head with selectBlock', () => {
    const state = buildState(['a', 'b', 'c'], { anchor: { block: 0, offset: 0 }, head: { block: 1, offset: 1 } });
    expect(caretOf(run(state, selectBlock).state)).toEqual({ blocks: [1, 1] });
    expect(caretOf(run(buildState([DIVIDER_FIXTURE, 'b'], { node: 0 }), selectBlock).state)).toEqual({ blocks: [0, 0] });
    expect(caretOf(run(buildState(['a', 'b', 'c'], { blocks: [0, 2] }), selectBlock).state)).toEqual({ blocks: [2, 2] });
  });

  it('sets any selection and falls back to the default for null', () => {
    const state = buildState(['a', 'b'], { block: 1, offset: 1 });
    expect(caretOf(run(state, setSelection(blockRangeSelection('b0', 'b1'))).state)).toEqual({ blocks: [0, 1] });
    expect(caretOf(run(state, setSelection(null)).state)).toEqual({ block: 0, offset: 0 });
    expect(setSelection(null)(state)).toBe(true);
  });
});
