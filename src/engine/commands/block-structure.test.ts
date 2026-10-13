import { describe, expect, it } from 'vitest';
import { historyPlugin, undo } from '../state/history';
import { buildState, caretOf, markdownOf, newIds, run } from '../test-support/build-state';
import { DIVIDER_FIXTURE } from '../test-support/fixtures';
import { deleteBlocks, duplicateBlocks, indent, insertBlockAfter, moveBlocksDown, moveBlocksUp, outdent, toggleTask } from './block-structure';

const tree = () =>
  buildState(
    [
      { id: 'a', type: 'MARKDOWN', data: { markdown: '- a' } },
      { id: 'b', type: 'MARKDOWN', data: { markdown: '- b' } },
      { id: 'c', type: 'MARKDOWN', data: { markdown: '- c' }, indent: 1 },
      { id: 'd', type: 'MARKDOWN', data: { markdown: '- d' } },
    ],
    { block: 1, offset: 0 },
  );

describe('block structure', () => {
  it('indents a block with its children, capped by the previous block', () => {
    const next = run(tree(), indent).state;
    expect(markdownOf(next)).toEqual(['- a', '  - b', '    - c', '- d']);
    expect(run(next, indent).ok).toBe(false);
    expect(markdownOf(run(next, outdent).state)).toEqual(['- a', '- b', '  - c', '- d']);
  });

  it('moves a block with its children', () => {
    expect(markdownOf(run(tree(), moveBlocksDown).state)).toEqual(['- a', '- d', '- b', '  - c']);
    expect(markdownOf(run(tree(), moveBlocksUp).state)).toEqual(['- b', '  - c', '- a', '- d']);
  });

  it('duplicates a block with its children and selects the copy', () => {
    const next = run(tree(), duplicateBlocks({ newId: newIds() })).state;
    expect(markdownOf(next)).toEqual(['- a', '- b', '  - c', '- b', '  - c', '- d']);
    expect(caretOf(next)).toEqual({ block: 3, offset: 0 });
  });

  it('deletes a block with its children', () => {
    const next = run(tree(), deleteBlocks).state;
    expect(markdownOf(next)).toEqual(['- a', '- d']);
    expect(caretOf(next)).toEqual({ block: 0, offset: 1 });
  });

  it('toggles tasks and fills an empty paragraph from the slash menu', () => {
    expect(markdownOf(run(buildState(['- [ ] t'], { block: 0, offset: 0 }), toggleTask).state)).toEqual(['- [x] t']);
    const empty = buildState(['x', ''], { block: 1, offset: 0 });
    expect(markdownOf(run(empty, insertBlockAfter('DIVIDER', undefined, { newId: newIds() })).state)).toEqual(['x', '<DIVIDER>']);
    const full = buildState(['x'], { block: 0, offset: 1 });
    const inserted = run(full, insertBlockAfter('MARKDOWN', { kind: 'heading', level: 1 }, { newId: newIds() })).state;
    expect(markdownOf(inserted)).toEqual(['x', '# ']);
    expect(caretOf(inserted)).toEqual({ block: 1, offset: 0 });
  });
});

const item = (id: string, indent = 0) => ({ id, type: 'MARKDOWN', data: { markdown: `- ${id}` }, indent });

describe('indent and outdent details', () => {
  it('never indents the first block of the document, and reports nothing moved', () => {
    const state = buildState([item('a'), item('b')], { block: 0, offset: 0 });
    expect(run(state, indent).ok).toBe(false);
  });

  it('indents a run of blocks one after another against the block before them', () => {
    const state = buildState([item('a'), item('b'), item('c'), item('d')], { anchor: { block: 1, offset: 0 }, head: { block: 2, offset: 0 } });
    expect(markdownOf(run(state, indent).state)).toEqual(['- a', '  - b', '  - c', '- d']);
  });

  it('leaves a block alone when the cap stops it but moves the rest', () => {
    const state = buildState([item('a'), item('b', 1), item('c'), item('d')], { anchor: { block: 1, offset: 0 }, head: { block: 2, offset: 0 } });
    expect(markdownOf(run(state, indent).state)).toEqual(['- a', '  - b', '  - c', '- d']);
  });

  it('includes descendants outside the selected range', () => {
    const state = buildState([item('a'), item('b'), item('c', 1), item('d', 1)], { block: 1, offset: 0 });
    expect(markdownOf(run(state, indent).state)).toEqual(['- a', '  - b', '    - c', '    - d']);
  });

  it('outdents down to zero and stops there', () => {
    const state = buildState([item('a'), item('b', 1)], { blocks: [0, 1] });
    expect(markdownOf(run(state, outdent).state)).toEqual(['- a', '- b']);
    expect(run(buildState([item('a')], { block: 0, offset: 0 }), outdent).ok).toBe(false);
  });

  it('does nothing without a selection', () => {
    expect(run(buildState([], null), indent).ok).toBe(false);
    expect(run(buildState([], null), outdent).ok).toBe(false);
  });

  it('indents and undoes as one step', () => {
    const state = buildState([item('a'), item('b'), item('c', 1)], { block: 1, offset: 0 }, { plugins: [historyPlugin()] });
    expect(markdownOf(run(run(state, indent).state, undo).state)).toEqual(['- a', '- b', '  - c']);
  });
});

describe('moving blocks', () => {
  it('stops at the edges of the document', () => {
    expect(run(buildState([item('a'), item('b')], { block: 0, offset: 0 }), moveBlocksUp).ok).toBe(false);
    expect(run(buildState([item('a'), item('b')], { block: 1, offset: 0 }), moveBlocksDown).ok).toBe(false);
    expect(run(buildState([item('a'), item('b', 1)], { block: 0, offset: 0 }), moveBlocksDown).ok).toBe(false);
    expect(run(buildState([], null), moveBlocksUp).ok).toBe(false);
  });

  it('hops over the previous sibling together with its children', () => {
    const state = buildState([item('a'), item('x', 1), item('b')], { block: 2, offset: 0 });
    expect(markdownOf(run(state, moveBlocksUp).state)).toEqual(['- b', '- a', '  - x']);
  });

  it('hops over the next sibling together with its children', () => {
    const state = buildState([item('a'), item('b'), item('x', 1), item('c')], { block: 0, offset: 0 });
    expect(markdownOf(run(state, moveBlocksDown).state)).toEqual(['- b', '  - x', '- a', '- c']);
  });

  it('clamps the indent of the moved block to the new previous block, children along', () => {
    const state = buildState([item('a'), item('b', 1), item('c', 2), item('d')], { block: 1, offset: 0 });
    expect(markdownOf(run(state, moveBlocksUp).state)).toEqual(['- b', '  - c', '- a', '- d']);
    const down = buildState([item('a'), item('b'), item('c', 1), item('d', 2)], { block: 3, offset: 0 });
    expect(markdownOf(run(down, moveBlocksUp).state)).toEqual(['- a', '- b', '  - d', '  - c']);
  });

  it('moves a selection of several blocks as one range', () => {
    const state = buildState([item('a'), item('b'), item('c'), item('d')], { anchor: { block: 1, offset: 0 }, head: { block: 2, offset: 0 } });
    expect(markdownOf(run(state, moveBlocksDown).state)).toEqual(['- a', '- d', '- b', '- c']);
    expect(markdownOf(run(state, moveBlocksUp).state)).toEqual(['- b', '- c', '- a', '- d']);
  });

  it('keeps the selection on the moved block and undoes in one step', () => {
    const state = buildState([item('a'), item('b'), item('c')], { block: 1, offset: 1 }, { plugins: [historyPlugin()] });
    const moved = run(state, moveBlocksDown).state;
    expect(caretOf(moved)).toEqual({ block: 2, offset: 1 });
    expect(markdownOf(run(moved, undo).state)).toEqual(['- a', '- b', '- c']);
  });
});

describe('duplicating and deleting blocks', () => {
  it('copies a node selection and a block range, selecting the copy', () => {
    const node = buildState(['a', DIVIDER_FIXTURE, 'c'], { node: 1 });
    const copied = run(node, duplicateBlocks({ newId: newIds() })).state;
    expect(markdownOf(copied)).toEqual(['a', '<DIVIDER>', '<DIVIDER>', 'c']);
    expect(caretOf(copied)).toEqual({ node: 2 });
    const range = buildState(['a', 'b', 'c'], { blocks: [0, 1] });
    const both = run(range, duplicateBlocks({ newId: newIds() })).state;
    expect(markdownOf(both)).toEqual(['a', 'b', 'a', 'b', 'c']);
    expect(caretOf(both)).toEqual({ blocks: [2, 3] });
    expect(both.doc.blocks.map((block) => block.id)).toEqual(['b0', 'b1', 'n0', 'n1', 'b2']);
  });

  it('maps a text selection onto the copy and falls back to generated ids', () => {
    const state = buildState(['abc'], { anchor: { block: 0, offset: 1 }, head: { block: 0, offset: 3 } });
    const next = run(state, duplicateBlocks()).state;
    expect(caretOf(next)).toEqual({ anchor: { block: 1, offset: 1 }, head: { block: 1, offset: 3 } });
    expect(new Set(next.doc.blocks.map((block) => block.id)).size).toBe(2);
    expect(run(buildState([], null), duplicateBlocks()).ok).toBe(false);
  });

  it('deletes the first block into the start of the next, and the last into the end of the previous', () => {
    const first = run(buildState(['a', 'b'], { block: 0, offset: 0 }), deleteBlocks).state;
    expect(markdownOf(first)).toEqual(['b']);
    expect(caretOf(first)).toEqual({ block: 0, offset: 0 });
    const last = run(buildState(['ab', 'c'], { block: 1, offset: 0 }), deleteBlocks).state;
    expect(caretOf(last)).toEqual({ block: 0, offset: 2 });
  });

  it('empties the document and clears the selection when every block goes', () => {
    const state = run(buildState(['a', 'b'], { blocks: [0, 1] }), deleteBlocks).state;
    expect(state.doc.blocks).toEqual([]);
    expect(state.selection).toBeNull();
    expect(run(state, deleteBlocks).ok).toBe(false);
  });

  it('removes a node-selected block', () => {
    expect(markdownOf(run(buildState(['a', DIVIDER_FIXTURE], { node: 1 }), deleteBlocks).state)).toEqual(['a']);
  });
});

describe('tasks and inserted blocks', () => {
  it('checks every task when any is open, unchecks when all are checked, and ignores other blocks', () => {
    const state = buildState(['- [x] a', '- [ ] b', 'plain'], { blocks: [0, 2] });
    const checked = run(state, toggleTask).state;
    expect(markdownOf(checked)).toEqual(['- [x] a', '- [x] b', 'plain']);
    expect(markdownOf(run(checked, toggleTask).state)).toEqual(['- [ ] a', '- [ ] b', 'plain']);
    expect(run(buildState(['plain'], { block: 0, offset: 0 }), toggleTask).ok).toBe(false);
  });

  it('inserts after the subtree of the current block at the same indent', () => {
    const state = buildState([item('a'), item('b', 1), item('c', 1), item('d')], { block: 0, offset: 0 });
    const next = run(state, insertBlockAfter('MARKDOWN', { kind: 'quote' }, { newId: newIds() })).state;
    expect(markdownOf(next)).toEqual(['- a', '  - b', '  - c', '> ', '- d']);
    expect(caretOf(next)).toEqual({ block: 3, offset: 0 });
  });

  it('inserts after a node-selected block and node-selects a void block', () => {
    const state = buildState(['a', DIVIDER_FIXTURE], { node: 1 });
    const next = run(state, insertBlockAfter('DIVIDER', undefined, { newId: newIds() })).state;
    expect(markdownOf(next)).toEqual(['a', '<DIVIDER>', '<DIVIDER>']);
    expect(caretOf(next)).toEqual({ node: 2 });
  });

  it('keeps the id and indent of the empty paragraph it fills, and keeps a non-empty list item', () => {
    const state = buildState([item('a'), { id: 'e', type: 'MARKDOWN', data: { markdown: '' }, indent: 1 }], { block: 1, offset: 0 });
    const next = run(state, insertBlockAfter('CALLOUT', { tone: 'tip' })).state;
    expect(next.doc.blocks[1]).toMatchObject({ id: 'b1', type: 'CALLOUT', indent: 1 });
    expect(caretOf(next)).toEqual({ block: 1, offset: 0 });
    const filled = buildState([{ id: 'e', type: 'MARKDOWN', data: { markdown: '- ' } }], { block: 0, offset: 0 });
    expect(run(filled, insertBlockAfter('DIVIDER', undefined, { newId: newIds() })).state.doc.blocks).toHaveLength(2);
  });

  it('generates an id by default and needs a selection', () => {
    const next = run(buildState(['a'], { block: 0, offset: 1 }), insertBlockAfter('DIVIDER')).state;
    expect(next.doc.blocks[1].id).not.toBe('b0');
    expect(run(buildState([], null), insertBlockAfter('DIVIDER')).ok).toBe(false);
  });

  it('undoes an insert in one step', () => {
    const state = buildState(['a'], { block: 0, offset: 1 }, { plugins: [historyPlugin()] });
    const next = run(state, insertBlockAfter('DIVIDER', undefined, { newId: newIds() })).state;
    expect(markdownOf(run(next, undo).state)).toEqual(['a']);
  });
});
