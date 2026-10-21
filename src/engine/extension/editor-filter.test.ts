import { describe, expect, it, vi } from 'vitest';
import { redo, undo, undoInputRule } from '../state/history';
import type { EditorState } from '../state/editor-state';
import type { Transaction } from '../state/transaction';
import { caret, md, startEditor } from '../test-support/editor-fixtures';
import { coreExtensions } from './core-extensions';
import { defineExtension } from './define-extension';

function filtered(filter: (tr: Transaction, state: EditorState) => boolean) {
  const onTransaction = vi.fn();
  const hook = defineExtension({ name: 'gate', filterTransaction: filter });
  const watcher = defineExtension({ name: 'watcher', onTransaction });
  const started = startEditor([md('a', 'xy')], { extensions: [...coreExtensions(), hook, watcher] });
  return { ...started, onTransaction };
}

describe('an extension filtering transactions', () => {
  it('drops a transaction it refuses: no state, no notification, no change and no undo step', () => {
    let open = true;
    const { editor, onChange, onTransaction } = filtered((tr) => open || !tr.docChanged);
    editor.commands.setSelection(caret('a', 2));
    const listener = vi.fn();
    editor.subscribe(listener);
    onTransaction.mockClear();
    open = false;
    const before = editor.state;
    expect(editor.insertText('!')).toBe(true);
    expect(editor.state).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    expect(onTransaction).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    open = true;
    expect(editor.commands.undo()).toBe(false);
    expect(editor.getBlocks()[0].data).toEqual({ markdown: 'xy' });
  });

  it('is handed the transaction and the state it applies to, and lets through what it accepts', () => {
    const filter = vi.fn((_tr: Transaction, _state: EditorState) => true);
    const { editor } = filtered(filter);
    editor.commands.setSelection(caret('a', 2));
    const before = editor.state;
    editor.insertText('!');
    const [tr, state] = filter.mock.calls.at(-1)!;
    expect(state).toBe(before);
    expect(tr.before).toBe(before);
    expect(editor.getBlocks()[0].data).toEqual({ markdown: 'xy!' });
  });

  it('drops a transaction any one extension refuses', () => {
    const accept = defineExtension({ name: 'accept', filterTransaction: () => true });
    const refuse = defineExtension({ name: 'refuse', filterTransaction: (tr) => !tr.docChanged });
    const { editor } = startEditor([md('a', 'xy')], { extensions: [...coreExtensions(), accept, refuse] });
    editor.commands.setSelection(caret('a', 2));
    editor.insertText('!');
    expect(editor.getBlocks()[0].data).toEqual({ markdown: 'xy' });
    expect(editor.state.selection).toEqual(caret('a', 2));
  });

  it('never filters the blocks the host supplies', () => {
    const { editor, onChange } = filtered(() => false);
    expect(editor.setBlocks([md('a', 'from the host')])).toBe(true);
    expect(editor.getBlocks()[0].data).toEqual({ markdown: 'from the host' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('never filters undo and redo', () => {
    let open = true;
    const { editor } = filtered((tr) => open || !tr.docChanged);
    editor.commands.setSelection(caret('a', 2));
    editor.insertText('!');
    open = false;
    expect(undo(editor.state, editor.dispatch)).toBe(true);
    expect(editor.getBlocks()[0].data).toEqual({ markdown: 'xy' });
    expect(redo(editor.state, editor.dispatch)).toBe(true);
    expect(editor.getBlocks()[0].data).toEqual({ markdown: 'xy!' });
  });

  it('never filters the undo of an input rule', () => {
    let open = true;
    const { editor } = filtered((tr) => open || !tr.docChanged);
    editor.commands.setSelection(caret('a', 2));
    editor.insertText('*');
    editor.insertText('*');
    editor.insertText('b');
    editor.insertText('*');
    editor.insertText('*');
    const ruled = editor.getBlocks()[0].data;
    open = false;
    expect(undoInputRule(editor.state, editor.dispatch)).toBe(true);
    expect(editor.getBlocks()[0].data).not.toEqual(ruled);
    expect(editor.getBlocks()[0].data).toEqual({ markdown: 'xy\\*\\*b\\*\\*' });
  });

  it('never filters a remote transaction', () => {
    const { editor } = filtered(() => false);
    const tr = editor.createTransaction().setOrigin('remote');
    editor.dispatch(tr.setSelection(caret('a', 1)));
    expect(editor.state.selection).toEqual(caret('a', 1));
  });

  it('judges a transaction dispatched during a commit against the state that commit produced', () => {
    const states: EditorState[] = [];
    const { editor } = filtered((_tr, state) => {
      states.push(state);
      return true;
    });
    let first: EditorState | null = null;
    editor.subscribe((state) => {
      if (first !== null) return;
      first = state;
      editor.dispatch(editor.createTransaction().setSelection(caret('a', 0)));
    });
    editor.commands.setSelection(caret('a', 1));
    expect(states.at(-1)).toBe(first);
    expect(editor.state.selection).toEqual(caret('a', 0));
  });
});
