import { describe, expect, it } from 'vitest';
import { setBlockType } from '../commands/turn-into';
import { text } from '../model/inline';
import { buildState, markdownOf, run } from '../test-support/build-state';
import { setAttrsStep, setIndentStep } from '../transform/attrs-steps';
import { moveBlocksStep, replaceBlockStep } from '../transform/block-steps';
import { addMarkStep } from '../transform/mark-steps';
import { replaceInlineStep } from '../transform/replace-inline-step';
import type { Step } from '../transform/step';
import { applyTransaction, type EditorState } from './editor-state';
import { historyPlugin, redo, redoDepth, undo, undoDepth } from './history';
import { Transaction, type TransactionOrigin } from './transaction';

const TOGGLE = { id: 't', type: 'TOGGLE', data: { markdown: 'Summary', open: false } };
const IMAGE = { id: 'i', type: 'IMAGE', data: { storageKey: '', alt: '' } };

const typed = (): EditorState => {
  let state = buildState(['', TOGGLE, IMAGE, 'tail'], { block: 0, offset: 0 }, { plugins: [historyPlugin()] });
  for (const [offset, letter] of [...'ab'].entries()) {
    const tr = new Transaction(state, offset * 1000).setOrigin('input');
    state = applyTransaction(state, tr.step(replaceInlineStep('b0', 'text', offset, offset, [text(letter)])));
  }
  return run(state, undo).state;
};

const applied = (state: EditorState, tr: Transaction, steps: Step[]) =>
  applyTransaction(state, steps.reduce((built, step) => built.step(step), tr));
const unrecorded = (state: EditorState, ...steps: Step[]) =>
  applied(state, new Transaction(state, 5000).setMeta('addToHistory', false), steps);
const from = (origin: TransactionOrigin, state: EditorState, ...steps: Step[]) =>
  applied(state, new Transaction(state, 5000).setOrigin(origin), steps);

const stacks = (state: EditorState) => [undoDepth(state), redoDepth(state)];

describe('history across unrecorded changes that move no text', () => {
  it('keeps the typing undoable after a toggle opens without being recorded', () => {
    const state = unrecorded(typed(), setAttrsStep('b1', { open: true }));
    expect(stacks(state)).toEqual([1, 1]);
    const undone = run(state, undo).state;
    expect(markdownOf(undone)[0]).toBe('');
    expect(undone.doc.blocks[1].attrs.open).toBe(true);
    expect(markdownOf(run(run(undone, redo).state, redo).state)[0]).toBe('ab');
  });

  it('keeps the typing undoable after an upload result fills an image', () => {
    const state = unrecorded(typed(), setAttrsStep('b2', { storageKey: 'uploads/k1.png', width: 640 }));
    expect(stacks(state)).toEqual([1, 1]);
    const undone = run(state, undo).state;
    expect(markdownOf(undone)[0]).toBe('');
    expect(undone.doc.blocks[2].attrs.storageKey).toBe('uploads/k1.png');
  });

  it('keeps both stacks through remote marks and a type change that carries the text over', () => {
    const marked = from('remote', typed(), addMarkStep('b3', 'text', 0, 4, { type: 'bold' }));
    expect(stacks(marked)).toEqual([1, 1]);
    let converted: Transaction | null = null;
    setBlockType('TOGGLE')(marked, (tr) => (converted = tr));
    const state = applyTransaction(marked, converted!.setOrigin('reconcile'));
    expect(state.doc.blocks[0].type).toBe('TOGGLE');
    expect(stacks(state)).toEqual([1, 1]);
  });

  it('keeps both stacks when a block is replaced by one with the same text', () => {
    const state = typed();
    const image = state.doc.blocks[2];
    expect(stacks(unrecorded(state, replaceBlockStep({ ...image, attrs: { alt: 'cat' } })))).toEqual([1, 1]);
    const captioned = replaceBlockStep({ ...image, regions: { caption: [text('cat')] } });
    expect(stacks(unrecorded(state, captioned))).toEqual([0, 0]);
  });

  it('still clears both stacks after a remote inline insert', () => {
    expect(stacks(from('remote', typed(), replaceInlineStep('b3', 'text', 0, 0, [text('x')])))).toEqual([0, 0]);
  });

  it('still clears both stacks after a remote block move', () => {
    expect(stacks(from('remote', typed(), moveBlocksStep(3, 1, 1)))).toEqual([0, 0]);
  });

  it('still clears both stacks after an indent change or a neutral step followed by an edit', () => {
    expect(stacks(unrecorded(typed(), setIndentStep('b3', 1)))).toEqual([0, 0]);
    const edit = replaceInlineStep('b3', 'text', 4, 4, [text('!')]);
    expect(stacks(unrecorded(typed(), setAttrsStep('b1', { open: true }), edit))).toEqual([0, 0]);
  });
});
