import { describe, expect, it, vi } from 'vitest';
import { inlineLength, inlineText, text } from '../model/inline';
import { buildState } from '../test-support/build-state';
import * as mapping from '../transform/map-step';
import { replaceInlineStep } from '../transform/replace-inline-step';
import { splitBlockStep } from '../transform/split-join-steps';
import { applyTransaction, getPluginState, type EditorState } from './editor-state';
import { historyKey, historyPlugin, undoDepth } from './history';
import { Transaction } from './transaction';

vi.mock('../transform/map-step', async (original) => {
  const actual = await original<typeof mapping>();
  return { ...actual, mapStep: vi.fn(actual.mapStep) };
});

const atEnd = (state: EditorState, id: string, value: string) => {
  const end = inlineLength(state.doc.blocks[state.doc.index.get(id)!].regions.text);
  return replaceInlineStep(id, 'text', end, end, [text(value)]);
};

const created = (i: number) => ({
  id: `split${i}`,
  type: 'MARKDOWN',
  attrs: { kind: 'paragraph' },
  indent: 0,
  region: 'text',
});

function typed(enterEvery = 0): EditorState {
  let state = buildState(
    Array.from({ length: 50 }, (_, i) => `block ${i}`),
    { block: 0, offset: 0 },
    { plugins: [historyPlugin()] },
  );
  const ids = state.doc.blocks.map(({ id }) => id);
  for (let i = 0; i < 200; i++) {
    const id = ids[i % 50];
    const enter = enterEvery > 0 && i % enterEvery === 0;
    const step = enter ? splitBlockStep(id, 'text', 2, created(i)) : atEnd(state, id, ' word');
    state = applyTransaction(state, new Transaction(state, i * 1000).setOrigin('input').step(step));
  }
  return state;
}

const streamed = (state: EditorState, id: string, time: number) =>
  applyTransaction(
    state,
    new Transaction(state, time).setOrigin('ai').setMeta('addToHistory', false).step(atEnd(state, id, ' token')),
  );

describe('carrying the history over a stream of unrecorded text changes', () => {
  it.each([
    ['only text', 0],
    ['an Enter every ten items', 10],
  ])('keeps every item and rewrites only those in the block the stream writes to, with %s', (_history, enterEvery) => {
    let state = typed(enterEvery);
    const items = getPluginState(state, historyKey).done;
    const id = state.doc.blocks.find(({ regions }) => inlineText(regions.text).startsWith('block 49'))!.id;
    vi.mocked(mapping.mapStep).mockClear();
    for (let i = 0; i < 500; i++) state = streamed(state, id, 300_000 + i * 10);
    expect(undoDepth(state)).toBe(200);
    expect(vi.mocked(mapping.mapStep).mock.calls.length).toBe(500 * 4);
    const done = getPluginState(state, historyKey).done;
    expect(done.filter((item, i) => item === items[i])).toHaveLength(196);
  });
});
