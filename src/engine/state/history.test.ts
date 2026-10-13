import { describe, expect, it } from 'vitest';
import { inlineText, text } from '../model/inline';
import { replaceInlineStep } from '../transform/replace-inline-step';
import { buildState, caretOf, markdownOf, run } from '../test-support/build-state';
import { applyTransaction, getPluginState } from './editor-state';
import {
  closeHistory,
  historyKey,
  historyPlugin,
  redo,
  redoDepth,
  undo,
  undoDepth,
  undoInputRule,
  type HistoryState,
} from './history';
import { nodeSelection, textSelection } from './selection';
import { Transaction, type TransactionOrigin } from './transaction';
import type { EditorState } from './editor-state';

const typeAt = (state: EditorState, offset: number, value: string, time: number, origin: TransactionOrigin = 'input') =>
  applyTransaction(
    state,
    new Transaction(state, time).setOrigin(origin).step(replaceInlineStep('b0', 'text', offset, offset, [text(value)])),
  );

const withHistory = (state: EditorState, history: HistoryState): EditorState => ({
  ...state,
  pluginState: new Map(state.pluginState).set(historyKey.name, history),
});

const ruleTransaction = (state: EditorState, from: number, to: number, undoText: string, time = 0) =>
  new Transaction(state, time)
    .setOrigin('input')
    .setMeta('inputRule', { undoText })
    .step(replaceInlineStep('b0', 'text', from, to, []));

describe('history', () => {
  const start = (options?: Parameters<typeof historyPlugin>[0]) =>
    buildState([''], { block: 0, offset: 0 }, { plugins: [historyPlugin(options)] });

  it('groups quick typing in one region into one undo step', () => {
    let state = typeAt(start(), 0, 'a', 0);
    state = typeAt(state, 1, 'b', 100);
    state = typeAt(state, 2, 'c', 1000);
    expect(undoDepth(state)).toBe(2);
    state = run(state, undo).state;
    expect(markdownOf(state)).toEqual(['ab']);
    state = run(state, undo).state;
    expect(markdownOf(state)).toEqual(['']);
    expect(caretOf(state)).toEqual({ block: 0, offset: 0 });
    expect(redoDepth(state)).toBe(2);
    state = run(run(state, redo).state, redo).state;
    expect(markdownOf(state)).toEqual(['abc']);
  });

  it('starts a new group after closeHistory', () => {
    let state = typeAt(start(), 0, 'a', 0);
    state = applyTransaction(state, closeHistory(new Transaction(state, 10)));
    state = typeAt(state, 1, 'b', 20);
    expect(undoDepth(state)).toBe(2);
  });

  it('keeps a transaction closed with closeHistory out of the previous and the next group', () => {
    let state = typeAt(start(), 0, 'a', 0);
    state = applyTransaction(
      state,
      closeHistory(
        new Transaction(state, 10).setOrigin('input').step(replaceInlineStep('b0', 'text', 1, 1, [text('b')])),
      ),
    );
    expect(undoDepth(state)).toBe(2);
    expect(undoDepth(typeAt(state, 2, 'c', 20))).toBe(3);
  });

  it('clears both stacks on a remote change or a reconcile', () => {
    let state = run(typeAt(typeAt(start(), 0, 'a', 0), 1, 'b', 1000), undo).state;
    expect([undoDepth(state), redoDepth(state)]).toEqual([1, 1]);
    const remote = applyTransaction(
      state,
      new Transaction(state, 2000).setOrigin('remote').step(replaceInlineStep('b0', 'text', 0, 0, [text('r')])),
    );
    expect([undoDepth(remote), redoDepth(remote)]).toEqual([0, 0]);
    state = applyTransaction(
      state,
      new Transaction(state, 2000).setOrigin('reconcile').step(replaceInlineStep('b0', 'text', 0, 0, [text('x')])),
    );
    expect([undoDepth(state), redoDepth(state)]).toEqual([0, 0]);
    expect(run(state, undo).ok).toBe(false);
  });

  it('clears both stacks when a document change opts out of history or comes from history unrecorded', () => {
    const state = run(typeAt(typeAt(start(), 0, 'a', 0), 1, 'b', 1000), undo).state;
    const change = (tr: Transaction) =>
      applyTransaction(state, tr.step(replaceInlineStep('b0', 'text', 1, 1, [text('c')])));
    const optedOut = change(new Transaction(state, 2000).setMeta('addToHistory', false));
    expect([undoDepth(optedOut), redoDepth(optedOut)]).toEqual([0, 0]);
    const historyOrigin = change(new Transaction(state, 2000).setOrigin('history'));
    expect([undoDepth(historyOrigin), redoDepth(historyOrigin)]).toEqual([0, 0]);
  });

  it('keeps both stacks through transactions that change no document, whatever their origin', () => {
    const state = run(typeAt(typeAt(start(), 0, 'a', 0), 1, 'b', 1000), undo).state;
    const caret = textSelection({ block: 'b0', region: 'text', offset: 0 });
    const unchanged = [
      new Transaction(state, 2000).setOrigin('remote').setSelection(caret),
      new Transaction(state, 2000).setOrigin('reconcile').setMeta('addToHistory', false),
      new Transaction(state, 2000).setMeta('addToHistory', false).setStoredMarks([{ type: 'bold' }]),
    ];
    for (const tr of unchanged) {
      const next = applyTransaction(state, tr);
      expect([undoDepth(next), redoDepth(next)]).toEqual([1, 1]);
    }
  });

  it('starts a new group when the caret is in another block or region', () => {
    let state = buildState(['', ''], { block: 0, offset: 0 }, { plugins: [historyPlugin()] });
    state = typeAt(state, 0, 'a', 0);
    state = applyTransaction(
      state,
      new Transaction(state, 10).setSelection(textSelection({ block: 'b1', region: 'text', offset: 0 })),
    );
    state = applyTransaction(
      state,
      new Transaction(state, 20).setOrigin('input').step(replaceInlineStep('b1', 'text', 0, 0, [text('b')])),
    );
    expect(undoDepth(state)).toBe(2);
  });

  it('only merges input transactions', () => {
    let state = typeAt(start(), 0, 'a', 0, 'command');
    state = typeAt(state, 1, 'b', 10, 'command');
    expect(undoDepth(state)).toBe(2);
    state = typeAt(start(), 0, 'a', 0, 'command');
    expect(undoDepth(typeAt(state, 1, 'b', 10))).toBe(2);
  });

  it('honours the group delay option', () => {
    const typed = (options?: Parameters<typeof historyPlugin>[0]) =>
      typeAt(typeAt(start(options), 0, 'a', 0), 1, 'b', 100);
    expect(undoDepth(typed())).toBe(1);
    expect(undoDepth(typed({ groupDelay: 50 }))).toBe(2);
  });

  it('keeps only the most recent items up to the depth', () => {
    let state = start({ depth: 2 });
    ['a', 'b', 'c'].forEach((letter, i) => {
      state = typeAt(state, i, letter, i * 1000);
    });
    expect(undoDepth(state)).toBe(2);
    state = run(run(state, undo).state, undo).state;
    expect(markdownOf(state)).toEqual(['a']);
    expect(run(state, undo).ok).toBe(false);
  });

  it('clears the redo stack when something new is typed', () => {
    let state = typeAt(start(), 0, 'a', 0);
    state = run(state, undo).state;
    expect(redoDepth(state)).toBe(1);
    state = typeAt(state, 0, 'b', 10000);
    expect(redoDepth(state)).toBe(0);
    expect(run(state, redo).ok).toBe(false);
  });

  it('restores the selection that preceded the change', () => {
    let state = buildState(
      ['hello'],
      { anchor: { block: 0, offset: 0 }, head: { block: 0, offset: 5 } },
      { plugins: [historyPlugin()] },
    );
    state = applyTransaction(
      state,
      new Transaction(state, 0).setOrigin('command').step(replaceInlineStep('b0', 'text', 0, 5, [text('x')])),
    );
    expect(caretOf(state)).toEqual({ block: 0, offset: 1 });
    state = run(state, undo).state;
    expect(markdownOf(state)).toEqual(['hello']);
    expect(caretOf(state)).toEqual({ anchor: { block: 0, offset: 0 }, head: { block: 0, offset: 5 } });
    state = run(state, redo).state;
    expect(markdownOf(state)).toEqual(['x']);
  });

  it('tags undo and redo transactions and records nothing for them', () => {
    let state = typeAt(start(), 0, 'a', 0);
    const undone = run(state, undo);
    expect(undone.tr?.origin).toBe('history');
    expect(undone.tr?.getMeta('history')).toBe('undo');
    expect(undoDepth(undone.state)).toBe(0);
    state = undone.state;
    const redone = run(state, redo);
    expect(redone.tr?.getMeta('history')).toBe('redo');
    expect([undoDepth(redone.state), redoDepth(redone.state)]).toEqual([1, 0]);
  });

  it('does not merge typing into an item that was redone', () => {
    let state = run(typeAt(start(), 0, 'a', 0), undo).state;
    state = run(state, redo).state;
    expect(undoDepth(typeAt(state, 1, 'b', 10))).toBe(2);
  });

  it('reports availability without dispatching', () => {
    const state = typeAt(start(), 0, 'a', 0);
    expect(undo(state)).toBe(true);
    expect(redo(state)).toBe(false);
    expect(undoDepth(state)).toBe(1);
  });

  it('drops an item the document no longer accepts and undoes the one below it', () => {
    const typed = typeAt(typeAt(start(), 0, 'a', 0), 1, 'b', 1000);
    const history = getPluginState(typed, historyKey);
    const unapplicable = { ...history.done[1], steps: [replaceInlineStep('b0', 'text', 5, 6, [])] };
    const state = withHistory(typed, { ...history, done: [history.done[0], unapplicable] });
    const undone = run(state, undo);
    expect(undone.ok).toBe(true);
    expect(markdownOf(undone.state)).toEqual(['b']);
    expect([undoDepth(undone.state), redoDepth(undone.state)]).toEqual([0, 1]);
    expect(markdownOf(run(undone.state, redo).state)).toEqual(['ab']);
  });

  it('refuses to undo when no item applies any more, without dispatching', () => {
    const typed = typeAt(start(), 0, 'abc', 0);
    const history = getPluginState(typed, historyKey);
    const state = withHistory(typed, {
      ...history,
      done: [{ ...history.done[0], steps: [replaceInlineStep('b0', 'text', 5, 6, [])] }],
    });
    expect(run(state, undo)).toEqual({ ok: false, state, tr: null });
    expect(undo(state)).toBe(false);
  });

  it('does nothing in a state without the history plugin', () => {
    const state = buildState(['a'], { block: 0, offset: 0 });
    expect([undo(state), redo(state), undoInputRule(state)]).toEqual([false, false, false]);
    expect([undoDepth(state), redoDepth(state)]).toEqual([0, 0]);
  });
});

describe('input rule reversal', () => {
  const heading = () => buildState([{ paragraph: '#' }], { block: 0, offset: 1 }, { plugins: [historyPlugin()] });
  const ruledHeading = () => {
    const state = heading();
    return applyTransaction(state, ruleTransaction(state, 0, 1, ' '));
  };

  it('undoes an input rule back to the typed text', () => {
    let state = heading();
    const rule = new Transaction(state, 0)
      .setOrigin('input')
      .setMeta('inputRule', { undoText: ' ' })
      .step(replaceInlineStep('b0', 'text', 0, 1, []));
    state = applyTransaction(state, rule);
    expect(run(state, undoInputRule).ok).toBe(true);
    const reversed = run(state, undoInputRule).state;
    expect(markdownOf(reversed)).toEqual(['\\#&#32;']);
    expect(inlineText(reversed.doc.blocks[0].regions.text)).toBe('# ');
  });

  it('records the whole transaction and the caret from before it', () => {
    const state = ruledHeading();
    const record = getPluginState(state, historyKey).lastInputRule;
    expect(record?.undoText).toBe(' ');
    expect(record?.at).toEqual({ block: 'b0', region: 'text', offset: 1 });
    expect(record?.steps).toHaveLength(1);
  });

  it('leaves the caret after the typed characters', () => {
    const state = run(ruledHeading(), undoInputRule).state;
    expect(caretOf(state)).toEqual({ block: 0, offset: 2 });
  });

  it('reverses a rule that rewrote several characters', () => {
    const before = buildState([{ paragraph: '*a' }], { block: 0, offset: 2 }, { plugins: [historyPlugin()] });
    const rule = new Transaction(before, 0)
      .setOrigin('input')
      .setMeta('inputRule', { undoText: '*' })
      .step(replaceInlineStep('b0', 'text', 0, 2, [text('A')]));
    const state = run(applyTransaction(before, rule), undoInputRule).state;
    expect(markdownOf(state)).toEqual(['\\*a\\*']);
    expect(caretOf(state)).toEqual({ block: 0, offset: 3 });
  });

  it('is one history item that undoing brings the rule back from', () => {
    let state = ruledHeading();
    state = run(state, undoInputRule).state;
    expect(undoDepth(state)).toBe(2);
    expect(markdownOf(run(state, undo).state)).toEqual(['']);
  });

  it('only applies right after the rule', () => {
    expect(run(heading(), undoInputRule).ok).toBe(false);
    const ruled = ruledHeading();
    expect(undoInputRule(ruled)).toBe(true);
    const typed = typeAt(ruled, 0, 'x', 10);
    expect(getPluginState(typed, historyKey).lastInputRule).toBeNull();
    expect(run(typed, undoInputRule).ok).toBe(false);
    const reversed = run(ruled, undoInputRule).state;
    expect(getPluginState(reversed, historyKey).lastInputRule).toBeNull();
  });

  it('records nothing for a rule that replaced a range', () => {
    const before = buildState(
      [{ paragraph: '#a' }],
      { anchor: { block: 0, offset: 0 }, head: { block: 0, offset: 2 } },
      { plugins: [historyPlugin()] },
    );
    const state = applyTransaction(before, ruleTransaction(before, 0, 2, '#'));
    expect(getPluginState(state, historyKey).lastInputRule).toBeNull();
    expect(undoDepth(state)).toBe(1);
  });

  it('forgets the record once the selection moves, but not when it is set to where it already is', () => {
    const ruled = ruledHeading();
    const same = applyTransaction(ruled, new Transaction(ruled, 5).setSelection(ruled.selection));
    expect(undoInputRule(same)).toBe(true);
    const moved = applyTransaction(ruled, new Transaction(ruled, 5).setSelection(nodeSelection('b0')));
    expect(undoInputRule(moved)).toBe(false);
    expect(getPluginState(moved, historyKey).lastInputRule).toBeNull();
  });

  it('keeps the record through a transaction that changes no document', () => {
    const ruled = ruledHeading();
    const moved = applyTransaction(ruled, new Transaction(ruled, 5).setMeta('x', 1));
    expect(undoInputRule(moved)).toBe(true);
  });
});
