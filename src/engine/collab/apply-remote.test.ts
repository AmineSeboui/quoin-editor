import { describe, expect, it, vi } from 'vitest';
import { coreExtensions } from '../extension/core-extensions';
import { defineExtension } from '../extension/define-extension';
import { text } from '../model/inline';
import { redoDepth, undoDepth } from '../state/history';
import { caret, md, range, startEditor } from '../test-support/editor-fixtures';
import { removeBlocksStep } from '../transform/block-steps';
import { replaceInlineStep } from '../transform/replace-inline-step';
import { splitBlockStep } from '../transform/split-join-steps';
import { applyRemote } from './apply-remote';

const insertAt = (offset: number, value: string) => replaceInlineStep('a', 'text', offset, offset, [text(value)]);

describe('applyRemote', () => {
  it('carries the local caret over a remote insertion before it', () => {
    const { editor } = startEditor([md('a', 'hello')]);
    editor.commands.setSelection(caret('a', 3));
    applyRemote(editor, [insertAt(0, 'XY'), insertAt(1, 'Z')]);
    expect(editor.getBlocks()).toEqual([md('a', 'XZYhello')]);
    expect(editor.state.selection).toEqual(caret('a', 6));
  });

  it('leaves a caret before the remote insertion where it was', () => {
    const { editor } = startEditor([md('a', 'hello')]);
    editor.commands.setSelection(caret('a', 1));
    applyRemote(editor, [insertAt(4, 'XY')]);
    expect(editor.state.selection).toEqual(caret('a', 1));
  });

  it('keeps the local caret before a remote insertion exactly at it', () => {
    const { editor } = startEditor([md('a', 'hello')]);
    editor.commands.setSelection(caret('a', 5));
    applyRemote(editor, [insertAt(5, ' Zed')]);
    expect(editor.getBlocks()).toEqual([md('a', 'hello Zed')]);
    expect(editor.state.selection).toEqual(caret('a', 5));
  });

  it('keeps the local caret in its block through a remote split exactly at it', () => {
    const { editor } = startEditor([md('a', 'hello')]);
    editor.commands.setSelection(caret('a', 2));
    const created = { id: 'b', type: 'MARKDOWN', attrs: {}, indent: 0, region: 'text' };
    applyRemote(editor, [splitBlockStep('a', 'text', 2, created)]);
    expect(editor.getBlocks()).toEqual([md('a', 'he'), md('b', 'llo')]);
    expect(editor.state.selection).toEqual(caret('a', 2));
  });

  it('keeps remote insertions at either end of a local range outside it', () => {
    const { editor } = startEditor([md('a', 'hello')]);
    editor.commands.setSelection(range('a', 1, 4));
    applyRemote(editor, [insertAt(4, 'Y'), insertAt(1, 'X')]);
    expect(editor.getBlocks()).toEqual([md('a', 'hXellYo')]);
    expect(editor.state.selection).toEqual(range('a', 2, 5));
  });

  it('collapses a local range a remote change replaces whole before what replaced it', () => {
    const { editor } = startEditor([md('a', 'hello')]);
    editor.commands.setSelection(range('a', 1, 4));
    applyRemote(editor, [replaceInlineStep('a', 'text', 0, 5, [text('XY')])]);
    expect(editor.state.selection).toEqual(caret('a', 0));
  });

  it('moves a local caret or range in a block a remote change removes to the start of the block after it', () => {
    const { editor } = startEditor([md('a', 'one'), md('b', 'two'), md('c', 'six'), md('d', 'ten')]);
    editor.commands.setSelection(range('b', 1, 2));
    applyRemote(editor, [removeBlocksStep(1, 1)]);
    expect(editor.state.selection).toEqual(caret('c', 0));
    editor.commands.setSelection(caret('c', 2));
    applyRemote(editor, [removeBlocksStep(1, 1)]);
    expect(editor.state.selection).toEqual(caret('d', 0));
  });

  it('commits one remote transaction kept out of the history', () => {
    const seen = vi.fn();
    const { editor } = startEditor([md('a', 'hello')]);
    editor.subscribe((_, tr) => seen(tr?.origin, tr?.addToHistory, tr?.steps.length));
    applyRemote(editor, [insertAt(0, 'X'), insertAt(0, 'Y')]);
    expect(seen.mock.calls).toEqual([['remote', false, 2]]);
    expect(undoDepth(editor.state)).toBe(0);
    expect(redoDepth(editor.state)).toBe(0);
  });

  it('is not refused by a filter', () => {
    const refuse = defineExtension({ name: 'refuse', filterTransaction: () => false });
    const { editor } = startEditor([md('a', 'hello')], { extensions: [...coreExtensions(), refuse] });
    applyRemote(editor, [insertAt(0, 'X')]);
    expect(editor.getBlocks()).toEqual([md('a', 'Xhello')]);
  });

  it('takes a valid selection it is given in place of the mapped one', () => {
    const { editor } = startEditor([md('a', 'hello')]);
    editor.commands.setSelection(caret('a', 3));
    applyRemote(editor, [insertAt(0, 'X')], range('a', 0, 2));
    expect(editor.state.selection).toEqual(range('a', 0, 2));
  });

  it('maps the local selection when the one it is given does not fit the new document', () => {
    const { editor } = startEditor([md('a', 'hello')]);
    editor.commands.setSelection(caret('a', 3));
    applyRemote(editor, [insertAt(0, 'X')], caret('gone', 0));
    expect(editor.state.selection).toEqual(caret('a', 4));
    applyRemote(editor, [insertAt(0, 'Y')], null);
    expect(editor.state.selection).toEqual(caret('a', 5));
  });
});
