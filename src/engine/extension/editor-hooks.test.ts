import { describe, expect, it, vi } from 'vitest';
import type { Command } from '../commands/command';
import { createPluginKey, type PluginSpec } from '../state/plugin';
import { createEditor } from './editor';
import { coreExtensions } from './core-extensions';
import { defineExtension } from './define-extension';
import { caret, md, range, startEditor } from '../test-support/editor-fixtures';
import type { Decoration } from './types';

describe('createEditor notifications', () => {
  it('notifies subscribers with the new state and the transaction until they unsubscribe', () => {
    const { editor } = startEditor([md('a', 'x')]);
    const listener = vi.fn();
    const stop = editor.subscribe(listener);
    editor.commands.setSelection(caret('a', 1));
    editor.insertText('!');
    expect(listener).toHaveBeenCalledTimes(2);
    const [state, tr] = listener.mock.calls[1];
    expect(state).toBe(editor.state);
    expect(tr.docChanged).toBe(true);
    stop();
    editor.insertText('?');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('runs subscribers, extension hooks and the option hook before onChange', () => {
    const order: string[] = [];
    const hook = defineExtension({ name: 'hook', onTransaction: () => order.push('extension') });
    const { editor } = startEditor([md('a', 'x')], {
      extensions: [...coreExtensions(), hook],
      onTransaction: () => order.push('option'),
      onChange: () => order.push('change'),
    });
    editor.subscribe(() => order.push('subscriber'));
    editor.commands.setSelection(caret('a', 1));
    order.length = 0;
    editor.insertText('!');
    expect(order).toEqual(['subscriber', 'extension', 'option', 'change']);
  });

  it('does not emit for a transaction that only moves the selection', () => {
    const { editor, onChange } = startEditor([md('a', 'xyz')]);
    editor.commands.setSelection(caret('a', 2));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('stops dispatching after destroy', () => {
    const { editor, onChange } = startEditor([md('a', 'x')]);
    const listener = vi.fn();
    editor.subscribe(listener);
    editor.commands.setSelection(caret('a', 1));
    listener.mockClear();
    editor.destroy();
    expect(editor.insertText('!')).toBe(true);
    expect(listener).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(editor.getBlocks()).toEqual([md('a', 'x')]);
  });

  it('stamps transactions it creates with the clock it was given', () => {
    const { editor } = startEditor([md('a', 'x')], { now: () => 1234 });
    expect(editor.createTransaction().time).toBe(1234);
    expect(editor.createTransaction().before).toBe(editor.state);
  });

  it('dispatches a transaction it was handed', () => {
    const { editor, onChange } = startEditor([md('a', 'x')]);
    editor.dispatch(editor.createTransaction().setSelection(caret('a', 1)));
    expect(editor.state.selection).toEqual(caret('a', 1));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('createEditor extensions', () => {
  it('lets a lower priority extension replace a core block, mark and atom spec', () => {
    const replaced = defineExtension({
      name: 'replaced',
      priority: 10,
      blocks: [{ ...startEditor([]).editor.schema.blocks.get('DIVIDER')!, flow: 'text' as const }],
      marks: [{ type: 'bold', rank: 2, inclusive: false }],
      atoms: [{ type: 'mention', toMarkdown: () => null, plainText: () => 'M' }],
    });
    const { editor } = startEditor([md('a', 'x')], { extensions: [...coreExtensions(), replaced] });
    expect(editor.schema.blocks.get('DIVIDER')?.flow).toBe('text');
    expect(editor.schema.marks.get('bold')?.inclusive).toBe(false);
    expect(editor.schema.atoms.get('mention')?.plainText({})).toBe('M');
  });

  it('adds commands, and the first definition of a name wins', () => {
    const calls: string[] = [];
    const named = (label: string) => () => ((): boolean => (calls.push(label), true));
    const first = defineExtension({ name: 'first', priority: 200, commands: { ping: named('first') } });
    const second = defineExtension({ name: 'second', commands: { ping: named('second'), pong: named('pong') } });
    const { editor } = startEditor([md('a', 'x')], { extensions: [...coreExtensions(), second, first] });
    const commands = editor.commands as unknown as Record<string, () => boolean>;
    expect(commands.ping()).toBe(true);
    expect(commands.pong()).toBe(true);
    expect(calls).toEqual(['first', 'pong']);
  });

  it('keeps extension plugin state in step with transactions', () => {
    const plugin: PluginSpec<number> = {
      key: createPluginKey<number>('counter'),
      init: () => 0,
      apply: (tr, value) => (tr.docChanged ? value + 1 : value),
    };
    const counter = defineExtension({ name: 'counter', plugins: [plugin] });
    const { editor } = startEditor([md('a', 'x')], { extensions: [...coreExtensions(), counter] });
    editor.commands.setSelection(caret('a', 1));
    editor.insertText('1');
    editor.insertText('2');
    expect(editor.state.pluginState.get('counter')).toBe(2);
  });

  it('collects decorations from every extension for the current state', () => {
    const inline = (from: number): Decoration => ({
      kind: 'inline',
      block: 'a',
      region: 'text',
      from,
      to: from + 1,
      attrs: {},
    });
    const block: Decoration = { kind: 'block', block: 'a', attrs: { x: '1' } };
    const decorate = defineExtension({ name: 'decorate', decorations: (state) => [inline(state.doc.blocks.length)] });
    const more = defineExtension({ name: 'more', decorations: () => [block] });
    const { editor } = startEditor([md('a', 'xyz')], { extensions: [...coreExtensions(), decorate, more] });
    expect(editor.decorations()).toEqual([inline(1), block]);
  });

  it('binds keys from an extension next to the core ones', () => {
    const run = vi.fn<Command>(() => true);
    const bound = defineExtension({ name: 'bound', keymap: { 'Mod-k': run } });
    const { editor } = startEditor([md('a', 'x')], { extensions: [...coreExtensions(), bound] });
    expect(editor.handleKey({ key: 'k', altKey: false, ctrlKey: false, metaKey: true, shiftKey: false })).toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('adds typography rules only when asked for', () => {
    const typeIn = (extensions: ReturnType<typeof coreExtensions>) => {
      const { editor } = startEditor([md('a', '')], { extensions });
      editor.insertText('a...');
      return editor.getBlocks()[0].data.markdown;
    };
    expect(typeIn(coreExtensions())).toBe('a...');
    expect(typeIn(coreExtensions({ typography: false }))).toBe('a...');
    expect(typeIn(coreExtensions({ typography: {} }))).toBe('a\u2026');
  });

  it('uses the id source for blocks created by keys and rules', () => {
    const { editor } = startEditor([md('a', 'x')]);
    editor.commands.setSelection(caret('a', 1));
    editor.handleKey({ key: 'Enter', altKey: false, ctrlKey: false, metaKey: false, shiftKey: false });
    expect(editor.state.doc.blocks.map((block) => block.id)).toEqual(['a', 'n1']);
  });

  it('detects the platform when it is not told', () => {
    const editor = createEditor({ blocks: [md('a', 'x')] });
    editor.commands.setSelection(range('a', 0, 1));
    expect(editor.handleKey({ key: 'b', altKey: false, ctrlKey: true, metaKey: false, shiftKey: false })).toBe(true);
  });
});
