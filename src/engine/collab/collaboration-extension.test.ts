import { afterEach, describe, expect, it, vi } from 'vitest';
import { coreExtensions } from '../extension/core-extensions';
import { text } from '../model/inline';
import { caret, md, mod, startEditor } from '../test-support/editor-fixtures';
import { fakeAdapter } from '../test-support/fake-collaboration-adapter';
import { replaceInlineStep } from '../transform/replace-inline-step';
import { applyRemote } from './apply-remote';
import { collaborationExtension } from './collaboration-extension';
import type { CollaborationAdapter } from './adapter';

const withExtension = (adapter: CollaborationAdapter) =>
  startEditor([md('a', 'hello')], { extensions: [...coreExtensions(), collaborationExtension(adapter)] });

function collaborating(adapter: CollaborationAdapter) {
  const started = withExtension(adapter);
  return { ...started, unmount: started.editor.mount() };
}

afterEach(() => vi.restoreAllMocks());

describe('the collaboration extension', () => {
  it('connects the editor when it is mounted, not when it is created', () => {
    const { adapter, connected } = fakeAdapter();
    const { editor } = withExtension(adapter);
    expect(connected).toEqual([]);
    editor.mount();
    expect(connected).toEqual([editor]);
  });

  it('disconnects when the mount ends, or when the editor is destroyed', () => {
    const { adapter, disconnect } = fakeAdapter();
    const { editor, unmount } = collaborating(adapter);
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
    editor.mount();
    editor.destroy();
    expect(disconnect).toHaveBeenCalledTimes(2);
  });

  it('takes blocks from the host while it is not connected', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { adapter } = fakeAdapter();
    const { editor, unmount } = collaborating(adapter);
    unmount();
    expect(editor.setBlocks([md('b', 'host')])).toBe(true);
    expect(editor.getBlocks()).toEqual([md('b', 'host')]);
    expect(warn).not.toHaveBeenCalled();
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

  it('hands the adapter nothing while it is not connected', () => {
    const { adapter, local } = fakeAdapter();
    const { editor } = withExtension(adapter);
    editor.commands.setSelection(caret('a', 5));
    editor.mount()();
    editor.insertText('!');
    expect(local).toEqual([]);
  });

  it('keeps remote and host transactions from the adapter', () => {
    const { adapter, local } = fakeAdapter();
    const { editor } = collaborating(adapter);
    applyRemote(editor, [replaceInlineStep('a', 'text', 0, 0, [text('X')])]);
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
    const { adapter, history, local } = fakeAdapter({ history: true });
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
    expect(local.map((tr) => tr.origin)).not.toContain('history');
  });

  it('runs an undo that applies a remote change, and refuses it inside a chain without throwing', () => {
    const { adapter } = fakeAdapter();
    const { editor } = collaborating({
      ...adapter,
      history: {
        undo: () => (applyRemote(editor, [replaceInlineStep('a', 'text', 0, 1, [])]), true),
        redo: () => false,
        canUndo: () => true,
        canRedo: () => false,
      },
    });
    editor.commands.setSelection(caret('a', 5));
    expect(() => editor.chain().undo().selectAll().run()).not.toThrow();
    expect(() => editor.chain().selectAll().undo().run()).not.toThrow();
    expect(editor.getBlocks()).toEqual([md('a', 'hello')]);
    expect(editor.commands.undo()).toBe(true);
    expect(editor.getBlocks()).toEqual([md('a', 'ello')]);
  });

  it('leaves undo to the editor when the adapter keeps no history, and hands the adapter its undo and redo', () => {
    const { adapter, local } = fakeAdapter();
    const { editor } = collaborating(adapter);
    editor.commands.setSelection(caret('a', 5));
    editor.insertText('!');
    expect(editor.commands.undo()).toBe(true);
    expect(editor.getBlocks()).toEqual([md('a', 'hello')]);
    expect(editor.handleKey(mod('z', { shiftKey: true }))).toBe(true);
    expect(editor.getBlocks()).toEqual([md('a', 'hello!')]);
    const changes = local.filter((tr) => tr.docChanged);
    expect(changes.map((tr) => tr.origin)).toEqual(['input', 'history', 'history']);
    expect(changes[2].doc).toBe(editor.state.doc);
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
