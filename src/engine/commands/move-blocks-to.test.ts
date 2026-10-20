import { describe, expect, it } from 'vitest';
import { createEditor } from '../extension/editor';
import { historyPlugin, undo } from '../state/history';
import { buildState, caretOf, markdownOf, run } from '../test-support/build-state';
import { movedBlockIds, moveBlocksTo } from './move-blocks-to';

const ids = (state: ReturnType<typeof buildState>) => state.doc.blocks.map((block) => block.id);
const line = (markdown: string, indent = 0) => ({ id: '', type: 'MARKDOWN', data: { markdown }, indent });

describe('moveBlocksTo', () => {
  it('moves a parent with its child below the next sibling, keeping ids and selecting the moved blocks', () => {
    const state = buildState([line('- a'), line('- child', 1), line('- b'), line('- c')], { block: 0, offset: 1 });
    const moved = run(state, moveBlocksTo(['b0'], 1, 0));
    expect(moved.ok).toBe(true);
    expect(markdownOf(moved.state)).toEqual(['- b', '- a', '  - child', '- c']);
    expect(ids(moved.state)).toEqual(['b2', 'b0', 'b1', 'b3']);
    expect(caretOf(moved.state)).toEqual({ blocks: [1, 2] });
  });

  it('nests the block under a list item at indent 1', () => {
    const state = buildState(['para', '- item', 'other']);
    const moved = run(state, moveBlocksTo(['b0'], 1, 1)).state;
    expect(markdownOf(moved)).toEqual(['- item', '  para', 'other']);
  });

  it('shifts the nested blocks of the moved range by the indent of its first block', () => {
    const state = buildState([line('- a'), line('- child', 1), line('- b')]);
    const moved = run(state, moveBlocksTo(['b0'], 1, 1)).state;
    expect(markdownOf(moved)).toEqual(['- b', '  - a', '    - child']);
  });

  it('clamps an impossible indent to one level below the block before it, and to 0 at the top', () => {
    const state = buildState([line('- item'), line('- nested', 1), line('para'), line('tail')]);
    expect(markdownOf(run(state, moveBlocksTo(['b2'], 2, 7)).state)).toEqual([
      '- item',
      '  - nested',
      '    para',
      'tail',
    ]);
    expect(markdownOf(run(state, moveBlocksTo(['b2'], 0, 3)).state)).toEqual(['para', '- item', '  - nested', 'tail']);
    expect(markdownOf(run(state, moveBlocksTo(['b3'], 1, -2)).state)).toEqual(['- item', 'tail', '  - nested', 'para']);
  });

  it('lifts the blocks after the drop that the moved range would leave too deep', () => {
    const state = buildState([line('- a'), line('- b', 1), line('- c', 2), line('m')]);
    expect(markdownOf(run(state, moveBlocksTo(['b3'], 2, 0)).state)).toEqual(['- a', '  - b', 'm', '  - c']);
  });

  it('gathers separate blocks into one range in document order', () => {
    const state = buildState(['one', 'two', 'three', 'four', 'five']);
    const moved = run(state, moveBlocksTo(['b3', 'b1'], 3, 0)).state;
    expect(markdownOf(moved)).toEqual(['one', 'three', 'five', 'two', 'four']);
    expect(caretOf(moved)).toEqual({ blocks: [3, 4] });
  });

  it('is one undoable step', () => {
    const before = buildState(
      [line('- a'), line('- child', 1), line('- b'), line('para')],
      { block: 3, offset: 2 },
      { plugins: [historyPlugin()] },
    );
    const moved = run(before, moveBlocksTo(['b0'], 2, 1)).state;
    const undone = run(moved, undo).state;
    expect(undone.doc.blocks).toEqual(before.doc.blocks);
    expect(caretOf(undone)).toEqual(caretOf(before));
  });

  it('changes nothing and reports false when the blocks are already there', () => {
    const state = buildState([line('- a'), line('- child', 1), line('b')]);
    expect(run(state, moveBlocksTo(['b0'], 0, 0))).toMatchObject({ ok: false, tr: null });
    expect(run(state, moveBlocksTo(['b1'], 1, 1))).toMatchObject({ ok: false, tr: null });
  });

  it('reports false for a block it cannot find or a place outside the document', () => {
    const state = buildState(['a', 'b']);
    expect(run(state, moveBlocksTo(['missing'], 0, 0)).ok).toBe(false);
    expect(run(state, moveBlocksTo([], 0, 0)).ok).toBe(false);
    expect(run(state, moveBlocksTo(['b0'], 2, 0)).ok).toBe(false);
    expect(run(state, moveBlocksTo(['b0'], -1, 0)).ok).toBe(false);
  });

  it('names the blocks a move takes, nested blocks included, in document order', () => {
    const { doc } = buildState([line('- a'), line('- child', 1), line('b'), line('c')]);
    expect(movedBlockIds(doc, ['b3', 'b0'])).toEqual(['b0', 'b1', 'b3']);
    expect(movedBlockIds(doc, ['b1', 'nope'])).toBeNull();
  });

  it('is a command of every editor', () => {
    const editor = createEditor({
      blocks: [
        { id: 'a', type: 'MARKDOWN', data: { markdown: 'one' } },
        { id: 'b', type: 'MARKDOWN', data: { markdown: 'two' } },
      ],
    });
    expect(editor.commands.moveBlocksTo(['a'], 1, 0)).toBe(true);
    expect(editor.getBlocks().map((block) => block.id)).toEqual(['b', 'a']);
  });
});
