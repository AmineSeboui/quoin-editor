import { describe, expect, it, vi } from 'vitest';
import { inlineLength, text } from '../model/inline';
import { buildState } from '../test-support/build-state';
import * as mapping from '../transform/map-step';
import { replaceInlineStep } from '../transform/replace-inline-step';
import { applyTransaction, getPluginState, type EditorState } from './editor-state';
import { historyKey, historyPlugin, undoDepth } from './history';
import { Transaction } from './transaction';

vi.mock('../transform/map-step', async (original) => {
  const actual = await original<typeof mapping>();
  return { ...actual, mapStep: vi.fn(actual.mapStep) };
});

const atEnd = (state: EditorState, index: number, value: string) => {
  const block = state.doc.blocks[index];
  const end = inlineLength(block.regions.text);
  return replaceInlineStep(block.id, 'text', end, end, [text(value)]);
};

function typed(): EditorState {
  let state = buildState(
    Array.from({ length: 50 }, (_, i) => `block ${i}`),
    { block: 0, offset: 0 },
    { plugins: [historyPlugin()] },
  );
  for (let i = 0; i < 200; i++) {
    const tr = new Transaction(state, i * 1000).setOrigin('input').step(atEnd(state, i % 50, ' word'));
    state = applyTransaction(state, tr);
  }
  return state;
}

const streamed = (state: EditorState, index: number, time: number) =>
  applyTransaction(
    state,
    new Transaction(state, time).setOrigin('ai').setMeta('addToHistory', false).step(atEnd(state, index, ' token')),
  );

describe('carrying the history over a stream of unrecorded text changes', () => {
  it('keeps every item and rewrites only those in the block the stream writes to', () => {
    let state = typed();
    const items = getPluginState(state, historyKey).done;
    vi.mocked(mapping.mapStep).mockClear();
    for (let i = 0; i < 500; i++) state = streamed(state, 49, 300_000 + i * 10);
    expect(undoDepth(state)).toBe(200);
    expect(vi.mocked(mapping.mapStep).mock.calls.length).toBe(500 * 4);
    const done = getPluginState(state, historyKey).done;
    expect(done.filter((item, i) => item === items[i])).toHaveLength(196);
  });
});
