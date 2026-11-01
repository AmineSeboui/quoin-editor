import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { inlineLength, inlineText, text } from '../model/inline';
import { buildState, run } from '../test-support/build-state';
import { insertBlocksStep, moveBlocksStep, removeBlocksStep } from '../transform/block-steps';
import { addMarkStep } from '../transform/mark-steps';
import { replaceInlineStep } from '../transform/replace-inline-step';
import { joinBlocksStep, splitBlockStep } from '../transform/split-join-steps';
import { StepError, type Step } from '../transform/step';
import { applyTransaction, getPluginState, type EditorState } from './editor-state';
import { historyKey, historyPlugin, redo, undo, type HistoryItem } from './history';
import { Transaction } from './transaction';

const RECORDED = ['type', 'enter', 'join', 'mark', 'paste', 'shift'];
const UNRECORDED = ['insert', 'delete', 'split', 'merge', 'add', 'move', 'remove'];
type Op = { kind: string; a: number; b: number; c: number; value: string };

const op: fc.Arbitrary<Op> = fc.record({
  kind: fc.constantFrom(...RECORDED, ...UNRECORDED, 'undo', 'redo'),
  a: fc.nat(20),
  b: fc.nat(20),
  c: fc.nat(3),
  value: fc.string({ unit: fc.constantFrom('a', 'b'), minLength: 1, maxLength: 3 }),
});

const texts = (state: EditorState) => state.doc.blocks.map((block) => inlineText(block.regions.text));
// Undoing or redoing a recorded move reorders blocks, so then the unrecorded characters are compared as a multiset.
const unrecordedText = (state: EditorState, ordered: boolean) => {
  const characters = [...texts(state).join('').replace(/[^A-Z]/g, '')];
  return (ordered ? characters : characters.sort()).join('');
};

function appliesInOrder(state: EditorState, items: readonly HistoryItem[]): boolean {
  let { doc } = state;
  try {
    for (const item of [...items].reverse()) for (const step of item.steps) doc = step.apply(doc).doc;
    return true;
  } catch (error) {
    if (error instanceof StepError) return false;
    throw error;
  }
}

function stepFor(state: EditorState, { kind, a, b, c, value }: Op, newId: () => string): Step | null {
  const { blocks } = state.doc;
  if (blocks.length === 0) return null;
  const index = a % blocks.length;
  const { id } = blocks[index];
  const next = blocks[index + 1]?.id;
  const length = inlineLength(blocks[index].regions.text);
  const at = b % (length + 1);
  const to = Math.min(length, at + c);
  const created = { id: newId(), type: 'MARKDOWN', attrs: { kind: 'paragraph' }, indent: 0, region: 'text' };
  switch (kind) {
    case 'type':
      return replaceInlineStep(id, 'text', at, at, [text(value)]);
    case 'insert':
      return replaceInlineStep(id, 'text', at, at, [text(value.toUpperCase())]);
    case 'delete':
      return replaceInlineStep(id, 'text', at, to, []);
    case 'mark':
      return to > at ? addMarkStep(id, 'text', at, to, { type: 'bold' }) : null;
    case 'enter':
    case 'split':
      return splitBlockStep(id, 'text', at, created);
    case 'join':
    case 'merge':
      return next === undefined ? null : joinBlocksStep(id, 'text', next, 'text');
    case 'add':
    case 'paste':
      return insertBlocksStep(b % (blocks.length + 1), [{ ...blocks[index], id: newId(), regions: { text: [] } }]);
    case 'move':
    case 'shift':
      return blocks.length > 1 ? moveBlocksStep(index, 1, b % blocks.length) : null;
    default:
      return blocks.length > 1 ? removeBlocksStep(index, 1) : null;
  }
}

function apply(state: EditorState, o: Op, time: number, newId: () => string, ordered: boolean): EditorState {
  if (o.kind === 'undo' || o.kind === 'redo') {
    const after = run(state, o.kind === 'undo' ? undo : redo).state;
    expect(unrecordedText(after, ordered)).toEqual(unrecordedText(state, ordered));
    return after;
  }
  const step = stepFor(state, o, newId);
  if (step === null) return state;
  const tr = new Transaction(state, time).setOrigin('input');
  if (UNRECORDED.includes(o.kind)) tr.setOrigin('command').setMeta('addToHistory', false);
  const next = applyTransaction(state, tr.step(step));
  const { done, undone } = getPluginState(next, historyKey);
  expect(appliesInOrder(next, done) && appliesInOrder(next, undone)).toBe(true);
  return next;
}

const step = (kind: string, a = 0, b = 0): Op => ({ kind, a, b, c: 0, value: 'a' });
// Undoing the paste removes the only block the unrecorded removals left, so the document ends up with no block.
const emptied = [
  step('join'),
  step('remove'),
  step('paste'),
  step('remove', 1),
  step('undo'),
  ...Array.from({ length: 10 }, () => step('type')),
];

describe('history rebased through block level changes made without recording', () => {
  it('keeps both stacks applicable in order, never removes unrecorded text, and redoes every undo', () => {
    fc.assert(
      fc.property(fc.array(op, { minLength: 15, maxLength: 40 }), (ops) => {
        const ordered = !ops.some(({ kind }) => kind === 'shift');
        let ids = 0;
        const newId = () => `n${ids++}`;
        let time = 0;
        let state = buildState(['', 'q', 'rs'], { block: 0, offset: 0 }, { plugins: [historyPlugin()] });
        for (const o of ops) state = apply(state, o, (time += 1000), newId, ordered);
        const before = texts(state);
        const undoOp = { kind: 'undo', a: 0, b: 0, c: 0, value: '' };
        let undos = 0;
        for (; undos < 60 && run(state, undo).ok; undos++) {
          state = apply(state, undoOp, (time += 1000), newId, ordered);
        }
        for (let i = 0; i < undos; i++) {
          expect(run(state, redo).ok).toBe(true);
          state = apply(state, { ...undoOp, kind: 'redo' }, (time += 1000), newId, ordered);
        }
        expect(texts(state)).toEqual(before);
      }),
      { numRuns: 500, examples: [[emptied]] },
    );
  });
});
