import { describe, expect, it } from 'vitest';
import { inlineText } from '../model/inline';
import { buildState, caretOf, markdownOf, newIds, run } from '../test-support/build-state';
import { caret, md, startEditor } from '../test-support/editor-fixtures';
import { DIVIDER_FIXTURE } from '../test-support/fixtures';
import { insertText } from './insert-text';
import { applyTransaction } from '../state/editor-state';
import { Transaction } from '../state/transaction';

describe('insertText', () => {
  it('inserts at the caret with the marks before it', () => {
    const state = buildState(['**ab**c'], { block: 0, offset: 2 });
    const next = run(state, insertText('X')).state;
    expect(markdownOf(next)).toEqual(['**abX**c']);
    expect(caretOf(next)).toEqual({ block: 0, offset: 3 });
  });

  it('uses stored marks first', () => {
    const state = buildState(['ab'], { block: 0, offset: 2 });
    const marked = applyTransaction(state, new Transaction(state).setStoredMarks([{ type: 'italic' }]));
    expect(markdownOf(run(marked, insertText('c')).state)).toEqual(['ab*c*']);
  });

  it('does not extend a link at its end', () => {
    const state = buildState(['[ab](https://x.y)'], { block: 0, offset: 2 });
    expect(markdownOf(run(state, insertText('c')).state)).toEqual(['[ab](https://x.y)c']);
  });

  it('replaces a selection across blocks', () => {
    const state = buildState(['hello', 'mid', 'world'], { anchor: { block: 0, offset: 2 }, head: { block: 2, offset: 3 } });
    const next = run(state, insertText('Y')).state;
    expect(markdownOf(next)).toEqual(['heYld']);
    expect(caretOf(next)).toEqual({ block: 0, offset: 3 });
  });

  it('replaces a selection across two cells inside their own cells', () => {
    const table = { id: 't', type: 'TABLE', data: { rows: [['abcdef', 'ghijkl']] } };
    const selection = { anchor: { block: 0, offset: 1 }, head: { block: 0, region: 'cell:0:1', offset: 5 } };
    const { state } = run(buildState([table], selection), insertText('X'));
    const cells = ['cell:0:0', 'cell:0:1'].map((key) => inlineText(state.doc.blocks[0].regions[key]));
    expect(cells).toEqual(['aX', 'l']);
    expect(caretOf(state)).toEqual({ block: 0, offset: 2 });
  });

  it('creates a paragraph in an empty document', () => {
    const next = run(buildState([], null), insertText('a', { newId: newIds() })).state;
    expect(markdownOf(next)).toEqual(['a']);
    expect(caretOf(next)).toEqual({ block: 0, offset: 1 });
  });

  it('replaces a node selection with a paragraph', () => {
    const next = run(buildState(['x', DIVIDER_FIXTURE], { node: 1 }), insertText('a', { newId: newIds() })).state;
    expect(markdownOf(next)).toEqual(['x', 'a']);
  });

  it('replaces a block-range selection with a paragraph where the first block was', () => {
    const state = buildState(['x', DIVIDER_FIXTURE, DIVIDER_FIXTURE, 'y'], { blocks: [2, 1] });
    const next = run(state, insertText('a', { newId: newIds() })).state;
    expect(markdownOf(next)).toEqual(['x', 'a', 'y']);
    expect(caretOf(next)).toEqual({ block: 1, offset: 1 });
  });

  it('keeps the indent of the block a node selection replaced', () => {
    const state = buildState([{ ...DIVIDER_FIXTURE, indent: 2 }], { node: 0 });
    const next = run(state, insertText('a', { newId: newIds() })).state;
    expect(next.doc.blocks.map((block) => block.indent)).toEqual([2]);
    expect(markdownOf(next)).toEqual(['    a']);
  });

  it('replaces a selection inside a block and carries the marks around it', () => {
    const state = buildState(['a**bcd**e'], { anchor: { block: 0, offset: 2 }, head: { block: 0, offset: 3 } });
    expect(markdownOf(run(state, insertText('X')).state)).toEqual(['a**bXd**e']);
  });

  it('uses the origin it was given, command by default', () => {
    const state = buildState(['a'], { block: 0, offset: 1 });
    expect(run(state, insertText('b')).tr?.origin).toBe('command');
    expect(run(state, insertText('b', { origin: 'input' })).tr?.origin).toBe('input');
  });

  it('is an undo step of its own next to typed text, while typed text through it groups', () => {
    const { editor } = startEditor([md('a', '')]);
    editor.commands.setSelection(caret('a', 0));
    editor.insertText('a');
    editor.insertText('b');
    insertText('X')(editor.state, (tr) => editor.dispatch(tr));
    insertText('c', { origin: 'input' })(editor.state, (tr) => editor.dispatch(tr));
    editor.commands.undo();
    expect(editor.getBlocks()).toEqual([md('a', 'abX')]);
    editor.commands.undo();
    expect(editor.getBlocks()).toEqual([md('a', 'ab')]);
    editor.commands.undo();
    expect(editor.getBlocks()).toEqual([md('a', '')]);
  });

  it('counts the inserted text in UTF-16 units for the caret', () => {
    const state = buildState(['a'], { block: 0, offset: 1 });
    expect(caretOf(run(state, insertText('\u{1F44D}')).state)).toEqual({ block: 0, offset: 3 });
  });

  it('does nothing for an empty string', () => {
    const state = buildState(['a'], { block: 0, offset: 1 });
    expect(run(state, insertText('')).ok).toBe(false);
  });

  it('only reports whether it applies when no dispatch is given', () => {
    const state = buildState(['a'], { block: 0, offset: 1 });
    expect(insertText('b')(state)).toBe(true);
  });
});
