import { describe, expect, it, vi } from 'vitest';
import { inlineLength, inlineText, text } from '../model/inline';
import { buildState } from '../test-support/build-state';
import { insertBlocksStep } from '../transform/block-steps';
import * as mapping from '../transform/map-step';
import { replaceDocStep } from '../transform/replace-doc-step';
import { replaceInlineStep } from '../transform/replace-inline-step';
import { splitBlockStep } from '../transform/split-join-steps';
import type { Step } from '../transform/step';
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

type Unrecorded = (state: EditorState, id: string, i: number) => Step;

const written: Unrecorded = (state, id) => atEnd(state, id, ' token');

const added: Unrecorded = (state, id, i) => {
  const index = state.doc.index.get(id)! + 1;
  return insertBlocksStep(index, [{ ...state.doc.blocks[index - 1], id: `added${i}`, regions: { text: [] } }]);
};

const reloaded: Unrecorded = (state, id) => replaceDocStep(written(state, id, 0).apply(state.doc).doc);

const unrecorded = (state: EditorState, step: Step, time: number) =>
  applyTransaction(state, new Transaction(state, time).setOrigin('ai').setMeta('addToHistory', false).step(step));

describe('carrying the history over a stream of unrecorded changes', () => {
  it.each([
    ['text written to it', 0, written],
    ['text written to it', 10, written],
    ['a block added after it', 0, added],
    ['a block added after it', 10, added],
    ['a new document that only changes its text', 0, reloaded],
    ['a new document that only changes its text', 10, reloaded],
  ])('rewrites only the items in a block with %s, with an Enter every %i items', (_change, enterEvery, change) => {
    let state = typed(enterEvery);
    const items = getPluginState(state, historyKey).done;
    const id = state.doc.blocks.find(({ regions }) => inlineText(regions.text).startsWith('block 49'))!.id;
    vi.mocked(mapping.mapStep).mockClear();
    for (let i = 0; i < 500; i++) state = unrecorded(state, change(state, id, i), 300_000 + i * 10);
    expect(undoDepth(state)).toBe(200);
    expect(vi.mocked(mapping.mapStep).mock.calls.length).toBe(500 * 4);
    const done = getPluginState(state, historyKey).done;
    expect(done.filter((item, i) => item === items[i])).toHaveLength(196);
  }, 60_000);
});
