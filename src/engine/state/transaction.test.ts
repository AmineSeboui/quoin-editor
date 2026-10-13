import { describe, expect, it } from 'vitest';
import { text } from '../model/inline';
import { replaceInlineStep } from '../transform/replace-inline-step';
import { removeBlocksStep } from '../transform/block-steps';
import { StepError, type Step } from '../transform/step';
import { buildState, caretOf } from '../test-support/build-state';
import { applyTransaction, createState, getPluginState } from './editor-state';
import { createPluginKey } from './plugin';
import { nodeSelection, textSelection } from './selection';
import { Transaction } from './transaction';

const insertAt = (offset: number, value: string) => replaceInlineStep('b0', 'text', offset, offset, [text(value)]);

describe('transactions', () => {
  it('maps the selection through steps', () => {
    const state = buildState(['hello'], { block: 0, offset: 5 });
    const tr = new Transaction(state).step(replaceInlineStep('b0', 'text', 0, 0, [text('>> ')]));
    expect(caretOf(applyTransaction(state, tr))).toEqual({ block: 0, offset: 8 });
  });

  it('takes its time from the clock of the state it is built on, unless given one', () => {
    const { doc, schema } = buildState(['a']);
    const state = createState({ doc, schema, clock: () => 42 });
    expect(new Transaction(state).time).toBe(42);
    expect(new Transaction(state, 7).time).toBe(7);
    expect(new Transaction(applyTransaction(state, new Transaction(state).step(insertAt(0, 'x')))).time).toBe(42);
  });

  it('records the doc before each step', () => {
    const state = buildState(['a', 'b']);
    const tr = new Transaction(state).step(removeBlocksStep(1, 1));
    expect(tr.docs).toEqual([state.doc]);
    expect(tr.docChanged).toBe(true);
  });

  it('keeps stored marks only while nothing changes', () => {
    const state = buildState(['a'], { block: 0, offset: 1 });
    const withMarks = applyTransaction(state, new Transaction(state).setStoredMarks([{ type: 'bold' }]));
    expect(withMarks.storedMarks).toEqual([{ type: 'bold' }]);
    expect(applyTransaction(withMarks, new Transaction(withMarks).setMeta('x', 1)).storedMarks).toEqual([{ type: 'bold' }]);
    const typed = new Transaction(withMarks).step(replaceInlineStep('b0', 'text', 1, 1, [text('b')]));
    expect(applyTransaction(withMarks, typed).storedMarks).toBeNull();
  });

  it('clears the selection when the last block goes', () => {
    const state = buildState(['a'], { block: 0, offset: 0 });
    expect(applyTransaction(state, new Transaction(state).step(removeBlocksStep(0, 1))).selection).toBeNull();
  });

  it('runs plugin state through every transaction', () => {
    const key = createPluginKey<number>('count');
    const plugin = { key, init: () => 0, apply: (_tr: Transaction, n: number) => n + 1 };
    const base = buildState(['a']);
    const state = createState({ doc: base.doc, schema: base.schema, plugins: [plugin] });
    const next = applyTransaction(state, new Transaction(state));
    expect(getPluginState(next, key)).toBe(1);
  });

  it('defaults origin to command and history to on', () => {
    const tr = new Transaction(buildState(['a']));
    expect(tr.origin).toBe('command');
    expect(tr.addToHistory).toBe(true);
    expect(tr.setOrigin('remote').setMeta('addToHistory', false).addToHistory).toBe(false);
  });
});

describe('transaction steps', () => {
  const state = buildState(['hello', 'world'], { block: 0, offset: 2 });

  it('starts from the state with nothing changed', () => {
    const tr = new Transaction(state);
    expect(tr.before).toBe(state);
    expect(tr.doc).toBe(state.doc);
    expect(tr.selection).toBe(state.selection);
    expect(tr.storedMarks).toBe(state.storedMarks);
    expect([tr.docChanged, tr.selectionSet, tr.storedMarksSet]).toEqual([false, false, false]);
    expect([tr.steps, tr.maps, tr.docs]).toEqual([[], [], []]);
  });

  it('keeps the time it was given and otherwise reads the clock', () => {
    expect(new Transaction(state, 42).time).toBe(42);
    expect(new Transaction(state).time).toBeGreaterThan(0);
  });

  it('records each step, its map and the doc it started from', () => {
    const first = insertAt(0, 'a');
    const tr = new Transaction(state).step(first).step(insertAt(0, 'b'));
    expect(tr.steps).toHaveLength(2);
    expect(tr.steps[0]).toBe(first);
    expect(tr.maps).toHaveLength(2);
    expect(tr.docs[0]).toBe(state.doc);
    expect(tr.docs[1].blocks[0].regions.text).toEqual([text('ahello')]);
    expect(tr.doc.blocks[0].regions.text).toEqual([text('bahello')]);
  });

  it('throws a StepError for a step that does not apply and records nothing', () => {
    const tr = new Transaction(state);
    expect(() => tr.step(removeBlocksStep(5, 1))).toThrow(StepError);
    expect(tr.docChanged).toBe(false);
    expect(tr.doc).toBe(state.doc);
  });

  it('reports whether a step could be applied', () => {
    const tr = new Transaction(state);
    expect(tr.maybeStep(removeBlocksStep(5, 1))).toBe(false);
    expect(tr.docChanged).toBe(false);
    expect(tr.maybeStep(insertAt(0, 'a'))).toBe(true);
    expect(tr.docChanged).toBe(true);
  });

  it('lets other errors escape maybeStep', () => {
    const broken: Step = {
      stepType: 'broken',
      apply: () => {
        throw new TypeError('boom');
      },
      invert: () => broken,
      toJSON: () => ({ stepType: 'broken' }),
    };
    expect(() => new Transaction(state).maybeStep(broken)).toThrow(TypeError);
  });

  it('maps positions through the steps from a given step on', () => {
    const tr = new Transaction(state).step(insertAt(0, 'ab')).step(insertAt(0, 'c'));
    const at = { block: 'b0', region: 'text', offset: 1 };
    expect(tr.mapPos(at)).toEqual({ ...at, offset: 4 });
    expect(tr.mapPos(at, 1, 1)).toEqual({ ...at, offset: 2 });
    expect(tr.mapPos({ ...at, offset: 0 }, -1)).toEqual({ ...at, offset: 0 });
    expect(tr.mapPos({ ...at, offset: 0 }, 1)).toEqual({ ...at, offset: 3 });
  });
});

describe('transaction selection and meta', () => {
  const state = buildState(['hello', 'world'], { block: 0, offset: 2 });

  it('uses a selection set after the steps as it is', () => {
    const target = textSelection({ block: 'b1', region: 'text', offset: 1 });
    const tr = new Transaction(state).step(insertAt(0, 'ab')).setSelection(target);
    expect(tr.selection).toBe(target);
    expect(tr.selectionSet).toBe(true);
  });

  it('maps a selection set before a later step', () => {
    const tr = new Transaction(state)
      .setSelection(textSelection({ block: 'b0', region: 'text', offset: 4 }))
      .step(insertAt(0, 'ab'));
    expect(caretOf(applyTransaction(state, tr))).toEqual({ block: 0, offset: 6 });
  });

  it('keeps a node selection on its block through steps elsewhere', () => {
    const nodeState = buildState(['a', 'b'], { node: 1 });
    const tr = new Transaction(nodeState).step(insertAt(0, 'x'));
    expect(tr.selection).toEqual(nodeSelection('b1'));
  });

  it('validates the selection when the transaction is applied', () => {
    const tr = new Transaction(state).setSelection(textSelection({ block: 'b0', region: 'text', offset: 99 }));
    expect(caretOf(applyTransaction(state, tr))).toEqual({ block: 0, offset: 5 });
  });

  it('clears stored marks when only the selection moves, unless they are set again', () => {
    const marked = applyTransaction(state, new Transaction(state).setStoredMarks([{ type: 'italic' }]));
    const moved = new Transaction(marked).setSelection(textSelection({ block: 'b1', region: 'text', offset: 0 }));
    expect(applyTransaction(marked, moved).storedMarks).toBeNull();
    const again = new Transaction(marked)
      .setSelection(textSelection({ block: 'b1', region: 'text', offset: 0 }))
      .setStoredMarks([{ type: 'bold' }]);
    expect(applyTransaction(marked, again).storedMarks).toEqual([{ type: 'bold' }]);
    expect(applyTransaction(marked, new Transaction(marked).setStoredMarks(null)).storedMarks).toBeNull();
  });

  it('keeps stored marks when the selection is set to where it already is', () => {
    const marked = applyTransaction(state, new Transaction(state).setStoredMarks([{ type: 'italic' }]));
    const same = new Transaction(marked).setSelection(textSelection({ block: 'b0', region: 'text', offset: 2 }));
    expect(applyTransaction(marked, same).storedMarks).toEqual([{ type: 'italic' }]);
  });

  it('stores meta values by key', () => {
    const tr = new Transaction(state).setMeta('inputType', 'insertText');
    expect(tr.getMeta<string>('inputType')).toBe('insertText');
    expect(tr.getMeta('missing')).toBeUndefined();
    expect(tr.setOrigin('paste').origin).toBe('paste');
  });
});
