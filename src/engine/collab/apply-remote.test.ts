import { describe, expect, it, vi } from 'vitest';
import { coreExtensions } from '../extension/core-extensions';
import { defineExtension } from '../extension/define-extension';
import { text } from '../model/inline';
import { redoDepth, undoDepth } from '../state/history';
import { caret, md, range, startEditor } from '../test-support/editor-fixtures';
import { replaceInlineStep } from '../transform/replace-inline-step';
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
