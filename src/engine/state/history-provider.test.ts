import { describe, expect, it, vi } from 'vitest';
import { coreExtensions } from '../extension/core-extensions';
import { defineExtension } from '../extension/define-extension';
import { caret, md, mod, startEditor } from '../test-support/editor-fixtures';
import { HISTORY_PROVIDER, redo, undo, type HistoryProvider } from './history';
import { createPluginKey } from './plugin';

function provided(answer: boolean) {
  const provider = { undo: vi.fn((_dryRun: boolean) => answer), redo: vi.fn((_dryRun: boolean) => answer) };
  const key = createPluginKey<HistoryProvider>(HISTORY_PROVIDER);
  const plugin = { key, init: () => provider, apply: (_: unknown, value: HistoryProvider) => value };
  const extension = defineExtension({ name: 'provider', plugins: [plugin] });
  const { editor } = startEditor([md('a', 'x')], { extensions: [...coreExtensions(), extension] });
  editor.commands.setSelection(caret('a', 1));
  editor.insertText('y');
  return { editor, provider };
}

describe('undo and redo with a history kept elsewhere', () => {
  it('go through the provider from the keymap, the commands and a command run on its own', () => {
    const { editor, provider } = provided(true);
    expect(editor.handleKey(mod('z'))).toBe(true);
    expect(editor.commands.undo()).toBe(true);
    expect(undo(editor.state, editor.dispatch)).toBe(true);
    expect(editor.handleKey(mod('z', { shiftKey: true }))).toBe(true);
    expect(editor.handleKey(mod('y'))).toBe(true);
    expect(redo(editor.state, editor.dispatch)).toBe(true);
    expect(provider.undo.mock.calls).toEqual([[false], [false], [false]]);
    expect(provider.redo.mock.calls).toEqual([[false], [false], [false]]);
    expect(editor.getBlocks()).toEqual([md('a', 'xy')]);
  });

  it('ask the provider whether they can run without running them', () => {
    const { editor, provider } = provided(false);
    expect(editor.can().undo()).toBe(false);
    expect(editor.can().redo()).toBe(false);
    expect(provider.undo.mock.calls).toEqual([[true]]);
    expect(provider.redo.mock.calls).toEqual([[true]]);
  });

  it('report what the provider did, and leave the editor history alone when it has nothing', () => {
    const { editor } = provided(false);
    expect(editor.commands.undo()).toBe(false);
    expect(editor.handleKey(mod('z'))).toBe(false);
    expect(editor.getBlocks()).toEqual([md('a', 'xy')]);
  });
});
