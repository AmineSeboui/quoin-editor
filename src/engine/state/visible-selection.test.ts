import { describe, expect, it } from 'vitest';
import { setAttrs } from '../commands/block-style';
import { deleteBackward } from '../commands/delete-commands';
import { runCommands } from '../commands/run-commands';
import { selectAll, setSelection } from '../commands/selection-commands';
import { createEditor } from '../extension/editor';
import { buildState, caretOf, markdownOf, run, type SelectionSpec } from '../test-support/build-state';
import { applyTransaction, type EditorState } from './editor-state';
import { historyPlugin, undo } from './history';
import { blockRangeSelection, textSelection } from './selection';
import { Transaction } from './transaction';

type Blocks = Parameters<typeof buildState>[0];

const toggle = (summary: string, open: boolean, indent = 0) => ({
  id: 't',
  type: 'TOGGLE',
  data: { markdown: summary, open },
  indent,
});
const line = (markdown: string, indent = 0) => ({ id: 'x', type: 'MARKDOWN', data: { markdown }, indent });
const divider = (indent = 0) => ({ id: 'd', type: 'DIVIDER', data: {}, indent });

function selected(blocks: Blocks, spec: SelectionSpec): EditorState {
  const base = buildState(blocks, { block: 0, offset: 0 });
  return applyTransaction(base, new Transaction(base).setSelection(buildState(blocks, spec).selection));
}

// Closes the toggle the way a control on it does: the transaction keeps the selection it had.
function closeToggle(state: EditorState, index: number, addToHistory = true): EditorState {
  const id = state.doc.blocks[index].id;
  const { tr } = runCommands(state, [setSelection(blockRangeSelection(id)), setAttrs({ open: false })]);
  return applyTransaction(state, tr!.setSelection(state.selection).setMeta('addToHistory', addToHistory));
}

describe('a selection inside a closed toggle', () => {
  it('moves to the end of the toggle text when the toggle closes over a caret in a child', () => {
    const state = buildState(['one', toggle('Toggle', true), line('child', 1), 'after'], { block: 2, offset: 5 });
    expect(caretOf(closeToggle(state, 1))).toEqual({ block: 1, offset: 6 });
  });

  it('moves each hidden end of a range to the end of the toggle that hides it', () => {
    const blocks = ['one', toggle('Toggle', false), line('child', 1), 'after'];
    const across = { anchor: { block: 0, offset: 1 }, head: { block: 2, offset: 3 } };
    expect(caretOf(selected(blocks, across))).toEqual({ anchor: { block: 0, offset: 1 }, head: { block: 1, offset: 6 } });
    const inside = { anchor: { block: 2, offset: 1 }, head: { block: 2, offset: 4 } };
    expect(caretOf(selected(blocks, inside))).toEqual({ block: 1, offset: 6 });
  });

  it('goes to the outermost closed toggle when toggles nest', () => {
    const blocks = [toggle('Outer', false), toggle('Inner', false, 1), line('deep', 2)];
    expect(caretOf(selected(blocks, { block: 2, offset: 2 }))).toEqual({ block: 0, offset: 5 });
    expect(caretOf(selected(blocks, { block: 1, offset: 2 }))).toEqual({ block: 0, offset: 5 });
  });

  it('collapses a node selection or a block range inside the hidden children the same way', () => {
    const blocks = ['one', toggle('Toggle', false), divider(1), line('child', 1), 'after'];
    expect(caretOf(selected(blocks, { node: 2 }))).toEqual({ block: 1, offset: 6 });
    expect(caretOf(selected(blocks, { blocks: [2, 3] }))).toEqual({ block: 1, offset: 6 });
  });

  it('keeps a block range that covers the toggle, and moves an end whose toggle the range leaves out', () => {
    const blocks = ['one', toggle('Toggle', false), line('child', 1), 'after'];
    expect(caretOf(selected(blocks, { blocks: [0, 2] }))).toEqual({ blocks: [0, 2] });
    expect(caretOf(selected(blocks, { blocks: [2, 3] }))).toEqual({ blocks: [1, 3] });
    const all = run(run(buildState(blocks, { block: 0, offset: 1 }), selectAll).state, selectAll).state;
    expect(caretOf(all)).toEqual({ blocks: [0, 3] });
  });

  it('leaves a selection inside an open toggle alone', () => {
    const blocks = ['one', toggle('Toggle', true), line('child', 1)];
    expect(caretOf(selected(blocks, { block: 2, offset: 2 }))).toEqual({ block: 2, offset: 2 });
  });

  it('holds when undo puts back a selection that a change made outside history has since hidden', () => {
    const plugins = [historyPlugin()];
    const state = buildState(['one', toggle('Toggle', true), line('child', 1), 'after'], { block: 2, offset: 5 }, { plugins });
    const typed = run(state, deleteBackward).state;
    const closed = closeToggle(typed, 1, false);
    expect(caretOf(closed)).toEqual({ block: 1, offset: 6 });
    const undone = run(closed, undo);
    expect(undone.ok).toBe(true);
    expect(markdownOf(undone.state)).toEqual(['one', '<TOGGLE>', '  child', 'after']);
    expect(caretOf(undone.state)).toEqual({ block: 1, offset: 6 });
  });

  it('holds when the host closes the toggle through its blocks', () => {
    const blocks = [
      { id: 'a', type: 'MARKDOWN', data: { markdown: 'one' } },
      { id: 't', type: 'TOGGLE', data: { markdown: 'Toggle', open: true } },
      { id: 'c', type: 'MARKDOWN', data: { markdown: 'child' }, indent: 1 },
    ];
    const editor = createEditor({ blocks });
    editor.commands.setSelection(textSelection({ block: 'c', region: 'text', offset: 5 }));
    editor.setBlocks(blocks.map((block) => (block.id === 't' ? { ...block, data: { ...block.data, open: false } } : block)));
    expect(editor.state.selection).toEqual(textSelection({ block: 't', region: 'text', offset: 6 }));
    expect(editor.getBlocks()[2].data.markdown).toBe('child');
  });
});
