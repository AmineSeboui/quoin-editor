import { afterEach, describe, expect, it, vi } from 'vitest';
import { coreExtensions } from '../extension/core-extensions';
import { text } from '../model/inline';
import { caret, md, mod, startEditor } from '../test-support/editor-fixtures';
import { fakeAdapter } from '../test-support/fake-collaboration-adapter';
import { replaceInlineStep } from '../transform/replace-inline-step';
import { applyRemote } from './apply-remote';
import { collaborationExtension } from './collaboration-extension';
import type { CollaborationAdapter } from './adapter';

const collaborating = (adapter: CollaborationAdapter) =>
  startEditor([md('a', 'hello')], { extensions: [...coreExtensions(), collaborationExtension(adapter)] });

afterEach(() => vi.restoreAllMocks());

describe('the collaboration extension', () => {
  it('connects the editor once it is created and disconnects it when it is destroyed', () => {
    const { adapter, connected, disconnect } = fakeAdapter();
    const { editor } = collaborating(adapter);
    expect(connected).toEqual([editor]);
    expect(disconnect).not.toHaveBeenCalled();
    editor.destroy();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('hands the adapter every local transaction with the state it produced', () => {
    const { adapter, local } = fakeAdapter();
    const onLocalTransaction = vi.spyOn(adapter, 'onLocalTransaction');
    const { editor } = collaborating(adapter);
    editor.commands.setSelection(caret('a', 5));
    editor.insertText('!');
    expect(local.map((tr) => [tr.origin, tr.docChanged])).toEqual([
      ['command', false],
      ['input', true],
    ]);
    expect(onLocalTransaction).toHaveBeenLastCalledWith(local[1], editor.state);
  });

  it('keeps remote, history and host transactions from the adapter', () => {
    const { adapter, local } = fakeAdapter();
    const { editor } = collaborating(adapter);
    applyRemote(editor, [replaceInlineStep('a', 'text', 0, 0, [text('X')])]);
    editor.dispatch(editor.createTransaction().setOrigin('history'));
    editor.dispatch(editor.createTransaction().setOrigin('reconcile'));
    expect(local).toEqual([]);
  });

  it('emits a remote change to the host', () => {
    const { adapter } = fakeAdapter();
    const { editor, onChange } = collaborating(adapter);
    applyRemote(editor, [replaceInlineStep('a', 'text', 5, 5, [text('!')])]);
    expect(onChange).toHaveBeenCalledWith([md('a', 'hello!')]);
  });

  it('undoes and redoes through the adapter history from keys, commands and their dry runs', () => {
    const { adapter, history } = fakeAdapter({ history: true });
    const { editor } = collaborating(adapter);
    editor.commands.setSelection(caret('a', 5));
    editor.insertText('!');
    expect(editor.handleKey(mod('z'))).toBe(true);
    expect(editor.commands.redo()).toBe(true);
    expect(editor.can().undo()).toBe(true);
    expect(history.undo).toHaveBeenCalledTimes(1);
    expect(history.redo).toHaveBeenCalledTimes(1);
    expect(history.canUndo).toHaveBeenCalledTimes(1);
    expect(editor.getBlocks()).toEqual([md('a', 'hello!')]);
  });

  it('leaves undo to the editor when the adapter keeps no history', () => {
    const { adapter } = fakeAdapter();
    const { editor } = collaborating(adapter);
    editor.commands.setSelection(caret('a', 5));
    editor.insertText('!');
    expect(editor.commands.undo()).toBe(true);
    expect(editor.getBlocks()).toEqual([md('a', 'hello')]);
  });

  it('ignores blocks from the host once the shared document is connected, warning in development', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { adapter } = fakeAdapter();
    const { editor, onChange } = collaborating(adapter);
    applyRemote(editor, [replaceInlineStep('a', 'text', 0, 0, [text('X')])]);
    expect(editor.setBlocks([md('b', 'host')])).toBe(false);
    expect(editor.getBlocks()).toEqual([md('a', 'Xhello')]);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/shared document/);
  });

  it('takes the echo of what it emitted without a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { adapter } = fakeAdapter();
    const { editor, onChange } = collaborating(adapter);
    applyRemote(editor, [replaceInlineStep('a', 'text', 0, 0, [text('X')])]);
    expect(editor.setBlocks(onChange.mock.calls[0][0])).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });
});
