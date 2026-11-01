import { describe, expect, it } from 'vitest';
import { createDoc } from '../model/doc';
import { text } from '../model/inline';
import { buildState, markdownOf, run } from '../test-support/build-state';
import { insertBlocksStep, moveBlocksStep, removeBlocksStep } from '../transform/block-steps';
import { replaceDocStep } from '../transform/replace-doc-step';
import { replaceInlineStep } from '../transform/replace-inline-step';
import type { Step } from '../transform/step';
import { applyTransaction, getPluginState, type EditorState } from './editor-state';
import {
  HISTORY_PROVIDER,
  historyKey,
  historyPlugin,
  redo,
  redoDepth,
  undo,
  undoDepth,
  type HistoryProvider,
} from './history';
import { createPluginKey, type PluginSpec } from './plugin';
import { Transaction, type TransactionOrigin } from './transaction';

const insert = (block: string, offset: number, value: string) =>
  replaceInlineStep(block, 'text', offset, offset, [text(value)]);
const remove = (block: string, from: number, to: number) => replaceInlineStep(block, 'text', from, to, []);

const provider: PluginSpec<HistoryProvider> = {
  key: createPluginKey<HistoryProvider>(HISTORY_PROVIDER),
  init: () => ({ undo: () => false, redo: () => false }),
  apply: (_tr, value) => value,
};

const start = (blocks: string[], withProvider = false) =>
  buildState(blocks, { block: 0, offset: 0 }, { plugins: [historyPlugin(), ...(withProvider ? [provider] : [])] });

let clock = 0;
const recorded = (state: EditorState, ...steps: Step[]) =>
  applyTransaction(
    state,
    steps.reduce((tr, step) => tr.step(step), new Transaction(state, (clock += 1000)).setOrigin('input')),
  );
const unrecorded = (state: EditorState, step: Step, origin: TransactionOrigin = 'command') =>
  applyTransaction(
    state,
    new Transaction(state, (clock += 1000)).setOrigin(origin).setMeta('addToHistory', false).step(step),
  );

const undone = (state: EditorState) => run(state, undo).state;
const redone = (state: EditorState) => run(state, redo).state;
const stacks = (state: EditorState) => [undoDepth(state), redoDepth(state)];

describe('history through a change made without recording', () => {
  it('undoes typing after an unrecorded insert earlier in the same block, and redoes it after the insert', () => {
    const typed = recorded(start(['Hello', 'tail']), insert('b0', 5, 'abc'));
    const state = unrecorded(typed, insert('b0', 0, 'XY'));
    expect(stacks(state)).toEqual([1, 0]);
    const back = undone(state);
    expect(markdownOf(back)).toEqual(['XYHello', 'tail']);
    expect(markdownOf(redone(back))).toEqual(['XYHelloabc', 'tail']);
  });

  it('undoes only the typing after an unrecorded insert in another block', () => {
    const typed = recorded(start(['Hello', 'tail']), insert('b0', 5, 'abc'));
    const state = unrecorded(typed, insert('b1', 0, 'XY'));
    expect(markdownOf(undone(state))).toEqual(['Hello', 'XYtail']);
  });

  it('drops the undo step whose text an unrecorded deletion removed, and an older one still undoes', () => {
    let state = recorded(start(['Hello']), insert('b0', 0, 'zz'));
    state = recorded(state, insert('b0', 7, 'abc'));
    expect(undoDepth(state)).toBe(2);
    state = unrecorded(state, remove('b0', 6, 10));
    expect(markdownOf(state)).toEqual(['zzHell']);
    expect(undoDepth(state)).toBe(1);
    expect(markdownOf(undone(state))).toEqual(['Hell']);
  });

  it('drops an item when only its later step cannot be rewritten, and still maps an older one past it', () => {
    let state = recorded(start(['Hello', 'tail']), insert('b1', 4, 'q'));
    state = recorded(state, insert('b0', 5, 'abc'), insert('b1', 0, 'def'));
    state = unrecorded(state, remove('b0', 5, 8));
    expect(markdownOf(state)).toEqual(['Hello', 'deftailq']);
    expect(undoDepth(state)).toBe(1);
    expect(markdownOf(undone(state))).toEqual(['Hello', 'deftail']);
  });

  it('keeps an item in a block nothing newer touched as it is, and rewrites the one the change reaches', () => {
    let state = recorded(start(['Hello', 'tail']), insert('b1', 4, 'q'));
    state = recorded(state, insert('b0', 5, 'abc'));
    const [older, newer] = getPluginState(state, historyKey).done;
    state = unrecorded(state, insert('b0', 0, 'XY'));
    const done = getPluginState(state, historyKey).done;
    expect(done[0]).toBe(older);
    expect(done[1]).not.toBe(newer);
    expect(markdownOf(undone(undone(state)))).toEqual(['XYHello', 'tail']);
  });

  it('lets an error other than a step that cannot apply through', () => {
    const state = recorded(start(['Hello']), insert('b0', 5, 'abc'));
    const broken: Step = {
      ...insert('b0', 0, 'z'),
      apply: () => {
        throw new TypeError('broken');
      },
    };
    const history = getPluginState(state, historyKey);
    const withBroken: EditorState = {
      ...state,
      pluginState: new Map(state.pluginState).set(historyKey.name, {
        ...history,
        done: [{ ...history.done[0], steps: [broken] }],
      }),
    };
    expect(() => unrecorded(withBroken, insert('b0', 0, 'XY'))).toThrow(TypeError);
  });

  it('never deletes text inserted without recording inside the typed range', () => {
    const typed = recorded(start(['']), insert('b0', 0, 'abc'));
    const state = unrecorded(typed, insert('b0', 1, 'X'));
    expect(markdownOf(state)).toEqual(['aXbc']);
    expect(markdownOf(undone(state))).toContain('aXbc');
    expect(undoDepth(state)).toBe(0);
  });

  it('maps an older undo step through the newer one, so it cannot reach text inserted between them', () => {
    let state = recorded(start(['']), insert('b0', 0, 'abc'));
    state = recorded(state, insert('b0', 0, 'de'));
    state = unrecorded(state, insert('b0', 3, 'X'));
    expect(markdownOf(state)).toEqual(['deaXbc']);
    state = undone(state);
    expect(markdownOf(state)).toEqual(['aXbc']);
    expect(markdownOf(undone(state))).toEqual(['aXbc']);
  });

  it('keeps both stacks through an unrecorded block insert and block removal elsewhere', () => {
    let state = recorded(start(['one', 'two', 'three']), insert('b0', 3, '!'));
    state = recorded(state, insert('b2', 5, '?'));
    state = undone(state);
    expect(stacks(state)).toEqual([1, 1]);
    const added = unrecorded(state, insertBlocksStep(0, [{ ...state.doc.blocks[1], id: 'new' }]));
    expect(stacks(added)).toEqual([1, 1]);
    const removed = unrecorded(added, removeBlocksStep(2, 1));
    expect(stacks(removed)).toEqual([1, 1]);
    expect(markdownOf(redone(removed))).toEqual(['two', 'one!', 'three?']);
    expect(markdownOf(undone(removed))).toEqual(['two', 'one', 'three']);
  });

  it('puts a removed block back beside its neighbour after an unrecorded block insert before it', () => {
    let state = recorded(start(['one', 'two', 'three']), removeBlocksStep(1, 1));
    state = unrecorded(state, insertBlocksStep(0, [{ ...state.doc.blocks[0], id: 'new' }]));
    expect(markdownOf(undone(state))).toEqual(['one', 'one', 'two', 'three']);
    expect(undone(state).doc.blocks.map((block) => block.id)).toEqual(['new', 'b0', 'b1', 'b2']);
  });

  it('moves blocks back to their place after an unrecorded block insert', () => {
    let state = recorded(start(['one', 'two', 'three']), moveBlocksStep(0, 1, 2));
    state = unrecorded(state, insertBlocksStep(1, [{ ...state.doc.blocks[0], id: 'new' }]));
    expect(undone(state).doc.blocks.map((block) => block.id)).toEqual(['b0', 'b1', 'new', 'b2']);
  });

  it('drops a block removal whose block changed without recording', () => {
    let state = recorded(start(['one', 'two']), insertBlocksStep(1, [{ ...start(['x']).doc.blocks[0], id: 'n' }]));
    state = unrecorded(state, insert('n', 0, 'X'));
    expect(undoDepth(state)).toBe(0);
  });

  it.each<TransactionOrigin>(['remote', 'reconcile'])('rebases a %s change without a history provider', (origin) => {
    const typed = recorded(start(['Hello']), insert('b0', 5, 'abc'));
    const state = unrecorded(typed, insert('b0', 0, 'XY'), origin);
    expect(markdownOf(undone(state))).toEqual(['XYHello']);
  });

  it('carries the typing over a reconcile that replaces the whole document', () => {
    const typed = recorded(start(['Hello', 'tail']), insert('b0', 5, 'abc'));
    const [hello] = typed.doc.blocks;
    const loaded = createDoc([{ ...hello, regions: { text: [text('XYHelloabc')] } }, { ...hello, id: 'n' }]);
    const state = unrecorded(typed, replaceDocStep(loaded), 'reconcile');
    expect(markdownOf(undone(state))).toEqual(['XYHello', 'Helloabc']);
  });

  it.each<TransactionOrigin>(['remote', 'reconcile'])('clears both stacks on a %s change with a provider', (origin) => {
    let state = recorded(start(['Hello'], true), insert('b0', 5, 'abc'));
    state = recorded(state, insert('b0', 0, 'q'));
    const changed = unrecorded(state, insert('b0', 0, 'XY'), origin);
    expect(stacks(changed)).toEqual([0, 0]);
  });

  it('starts a new undo group after a rebase', () => {
    let state = start(['']);
    state = applyTransaction(state, new Transaction(state, 0).setOrigin('input').step(insert('b0', 0, 'a')));
    state = applyTransaction(
      state,
      new Transaction(state, 100).setOrigin('remote').setMeta('addToHistory', false).step(insert('b0', 1, 'X')),
    );
    state = applyTransaction(state, new Transaction(state, 200).setOrigin('input').step(insert('b0', 2, 'b')));
    expect(undoDepth(state)).toBe(2);
    expect(markdownOf(undone(state))).toEqual(['aX']);
  });
});
