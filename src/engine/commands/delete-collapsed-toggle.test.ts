import { describe, expect, it } from 'vitest';
import { historyPlugin, undo } from '../state/history';
import { buildState, caretOf, markdownOf, run } from '../test-support/build-state';
import { deleteBackward, deleteForward } from './delete-commands';

const toggle = (summary: string, open: boolean, indent = 0) => ({
  id: 't',
  type: 'TOGGLE',
  data: { markdown: summary, open },
  indent,
});
const line = (markdown: string, indent = 0) => ({ id: 'x', type: 'MARKDOWN', data: { markdown }, indent });
const divider = { id: 'd', type: 'DIVIDER', data: {} };

const texts = (state: ReturnType<typeof buildState>) =>
  state.doc.blocks.map((block) => Object.values(block.regions)[0].map((node) => ('text' in node ? node.text : '')).join(''));

describe('Backspace below a collapsed toggle', () => {
  it('joins the line into the summary and never into the hidden child', () => {
    const state = buildState([toggle('Summary', false), line('hidden child', 1), line('after')], { block: 2, offset: 0 });
    const next = run(state, deleteBackward).state;
    expect(texts(next)).toEqual(['Summaryafter', 'hidden child']);
    expect(next.doc.blocks.map((block) => block.indent)).toEqual([0, 1]);
    expect(caretOf(next)).toEqual({ block: 0, offset: 7 });
  });

  it('keeps the children of the joined line below the toggle', () => {
    const state = buildState([toggle('Summary', false), line('hidden', 1), line('after'), line('kid', 1)], {
      block: 2,
      offset: 0,
    });
    const next = run(state, deleteBackward).state;
    expect(texts(next)).toEqual(['Summaryafter', 'hidden', 'kid']);
    expect(next.doc.blocks.map((block) => block.indent)).toEqual([0, 1, 1]);
  });

  it('joins into the outermost closed toggle that hides the block before', () => {
    const blocks = [toggle('Outer', true), toggle('Inner', false, 1), line('hidden', 2), line('after')];
    const next = run(buildState(blocks, { block: 3, offset: 0 }), deleteBackward).state;
    expect(texts(next)).toEqual(['Outer', 'Innerafter', 'hidden']);
    expect(caretOf(next)).toEqual({ block: 1, offset: 5 });
  });

  it('removes an empty line below the toggle and puts the caret at the end of the summary', () => {
    const state = buildState([toggle('Summary', false), line('hidden', 1), line('')], { block: 2, offset: 0 });
    const next = run(state, deleteBackward).state;
    expect(texts(next)).toEqual(['Summary', 'hidden']);
    expect(caretOf(next)).toEqual({ block: 0, offset: 7 });
  });

  it('undoes in one step', () => {
    const state = buildState([toggle('Summary', false), line('hidden', 1), line('after')], { block: 2, offset: 0 }, {
      plugins: [historyPlugin()],
    });
    const back = run(run(state, deleteBackward).state, undo).state;
    expect(texts(back)).toEqual(['Summary', 'hidden', 'after']);
  });

  it('still joins into the block before when the toggle is open or has no children', () => {
    const open = buildState([toggle('Summary', true), line('child', 1), line('after')], { block: 2, offset: 0 });
    expect(texts(run(open, deleteBackward).state)).toEqual(['Summary', 'childafter']);
    const bare = buildState([toggle('Summary', false), line('after')], { block: 1, offset: 0 });
    expect(texts(run(bare, deleteBackward).state)).toEqual(['Summaryafter']);
    expect(markdownOf(run(bare, deleteBackward).state)).toHaveLength(1);
  });
});

describe('Delete at the end of a collapsed toggle', () => {
  const atSummaryEnd = (blocks: Parameters<typeof buildState>[0]) =>
    buildState(blocks, { block: 0, offset: 7 }, { plugins: [historyPlugin()] });

  it('joins the first visible block after the toggle and leaves the hidden child alone', () => {
    const next = run(atSummaryEnd([toggle('Summary', false), line('hidden child', 1), line('after')]), deleteForward);
    expect(texts(next.state)).toEqual(['Summaryafter', 'hidden child']);
    expect(next.state.doc.blocks.map((block) => block.indent)).toEqual([0, 1]);
    expect(caretOf(next.state)).toEqual({ block: 0, offset: 7 });
  });

  it('keeps the children of the joined block below the toggle and undoes in one step', () => {
    const state = atSummaryEnd([toggle('Summary', false), line('hidden', 1), line('after'), line('kid', 1)]);
    const next = run(state, deleteForward).state;
    expect(texts(next)).toEqual(['Summaryafter', 'hidden', 'kid']);
    expect(next.doc.blocks.map((block) => block.indent)).toEqual([0, 1, 1]);
    expect(texts(run(next, undo).state)).toEqual(['Summary', 'hidden', 'after', 'kid']);
  });

  it('does nothing when no block follows the hidden children', () => {
    const state = atSummaryEnd([toggle('Summary', false), line('hidden', 1)]);
    expect(run(state, deleteForward)).toEqual({ ok: false, state, tr: null });
  });

  it('selects a block without text that follows the hidden children', () => {
    const next = run(atSummaryEnd([toggle('Summary', false), line('hidden', 1), divider]), deleteForward).state;
    expect(markdownOf(next)).toHaveLength(3);
    expect(caretOf(next)).toEqual({ node: 2 });
  });

  it('still joins the first child of an open toggle', () => {
    const open = atSummaryEnd([toggle('Summary', true), line('child', 1), line('after')]);
    expect(texts(run(open, deleteForward).state)).toEqual(['Summarychild', 'after']);
  });
});
