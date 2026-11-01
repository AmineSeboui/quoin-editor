import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { inlineLength, inlineText, text } from '../model/inline';
import { buildState, run } from '../test-support/build-state';
import { insertBlocksStep } from '../transform/block-steps';
import { replaceInlineStep } from '../transform/replace-inline-step';
import { applyTransaction, type EditorState } from './editor-state';
import { historyPlugin, redo, redoDepth, undo, undoDepth } from './history';
import { Transaction } from './transaction';

type Write = { block: number; at: number; value: string; time: number };
type Op =
  | ({ kind: 'type' | 'rule' } & Write)
  | ({ kind: 'insert' } & Write)
  | { kind: 'delete'; block: number; at: number; length: number }
  | { kind: 'undo' }
  | { kind: 'redo' }
  | { kind: 'aside' };

const op: fc.Arbitrary<Op> = fc.oneof(
  fc.record({
    kind: fc.constantFrom('type' as const, 'rule' as const),
    block: fc.nat(2),
    at: fc.nat(),
    value: fc.string({ unit: fc.constantFrom('a', 'b', 'c'), minLength: 1, maxLength: 3 }),
    time: fc.nat(800),
  }),
  fc.record({
    kind: fc.constant('insert' as const),
    block: fc.nat(2),
    at: fc.nat(),
    value: fc.string({ unit: fc.constantFrom('X', 'Y'), minLength: 1, maxLength: 2 }),
    time: fc.constant(0),
  }),
  fc.record({ kind: fc.constant('delete' as const), block: fc.nat(2), at: fc.nat(), length: fc.nat(4) }),
  fc.constantFrom<Op>({ kind: 'undo' }, { kind: 'redo' }, { kind: 'aside' }),
);

const texts = (state: EditorState) => state.doc.blocks.map((block) => inlineText(block.regions.text));
const unrecordedText = (state: EditorState) => texts(state).map((value) => value.replace(/[a-z]/g, ''));
const depths = (state: EditorState) => [undoDepth(state), redoDepth(state)];

function aside(state: EditorState): EditorState {
  const { blocks } = state.doc;
  const added = { ...blocks[0], id: `z${blocks.length}`, regions: { text: [text('X')] } };
  const tr = new Transaction(state).setMeta('addToHistory', false).step(insertBlocksStep(blocks.length, [added]));
  const after = applyTransaction(state, tr);
  expect(depths(after)).toEqual(depths(state));
  return after;
}

function apply(state: EditorState, step: Op, clock: { now: number }): EditorState {
  if (step.kind === 'undo' || step.kind === 'redo') {
    const after = run(state, step.kind === 'undo' ? undo : redo).state;
    expect(unrecordedText(after)).toEqual(unrecordedText(state));
    return after;
  }
  if (step.kind === 'aside') return aside(state);
  const block = state.doc.blocks[step.block];
  const length = inlineLength(block.regions.text);
  const at = step.at % (length + 1);
  if (step.kind === 'delete') {
    const tr = new Transaction(state, (clock.now += 1000)).setMeta('addToHistory', false);
    const to = Math.min(length, at + step.length);
    return applyTransaction(state, tr.step(replaceInlineStep(block.id, 'text', at, to, [])));
  }
  const tr = new Transaction(state, (clock.now += step.time));
  if (step.kind === 'insert') tr.setMeta('addToHistory', false);
  else tr.setOrigin('input');
  tr.step(replaceInlineStep(block.id, 'text', at, at, [text(step.value)]));
  const last = at + step.value.length;
  if (step.kind === 'rule') tr.step(replaceInlineStep(block.id, 'text', last - 1, last, [text('c')]));
  return applyTransaction(state, tr);
}

describe('history rebased through changes made without recording', () => {
  it('never removes unrecorded text, keeps every item over a change elsewhere, and redoes every undo', () => {
    fc.assert(
      fc.property(fc.array(op, { maxLength: 30 }), (ops) => {
        const clock = { now: 0 };
        let state = buildState(['', 'q', 'rs'], { block: 0, offset: 0 }, { plugins: [historyPlugin()] });
        for (const step of ops) state = apply(state, step, clock);
        const before = texts(state);
        let undos = 0;
        while (undos < 50 && run(state, undo).ok) {
          state = apply(state, { kind: 'undo' }, clock);
          undos += 1;
        }
        for (let i = 0; i < undos; i++) {
          expect(run(state, redo).ok).toBe(true);
          state = apply(state, { kind: 'redo' }, clock);
        }
        expect(texts(state)).toEqual(before);
      }),
      { numRuns: 300 },
    );
  });
});
