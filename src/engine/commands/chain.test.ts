import { describe, expect, it } from 'vitest';
import { buildState, caretOf, markdownOf } from '../test-support/build-state';
import { applyTransaction, type EditorState } from '../state/editor-state';
import { historyPlugin, undoDepth } from '../state/history';
import type { PluginSpec } from '../state/plugin';
import type { Transaction } from '../state/transaction';
import { coreCommandFactories, createCommandHelpers } from './chain';
import type { Command } from './command';
import { insertText } from './insert-text';

describe('command helpers', () => {
  const setup = (plugins: readonly PluginSpec<unknown>[] = []) => {
    let state: EditorState = buildState(['hello'], { anchor: { block: 0, offset: 0 }, head: { block: 0, offset: 5 } }, { plugins });
    let dispatched = 0;
    const last: { tr: Transaction | null } = { tr: null };
    const helpers = createCommandHelpers(() => state, (tr) => {
      dispatched += 1;
      last.tr = tr;
      state = applyTransaction(state, tr);
    }, coreCommandFactories);
    return { helpers, get: () => state, count: () => dispatched, last };
  };

  it('chains commands into one transaction', () => {
    const { helpers, get, count } = setup();
    expect(helpers.chain().toggleMark('bold').setBlockType('MARKDOWN', { kind: 'heading', level: 1 }).run()).toBe(true);
    expect(markdownOf(get())).toEqual(['# **hello**']);
    expect(count()).toBe(1);
  });

  it('dispatches nothing when a chained command fails', () => {
    const { helpers, count } = setup();
    expect(helpers.chain().toggleMark('bold').setLink('javascript:x').run()).toBe(false);
    expect(count()).toBe(0);
  });

  it('answers can() without dispatching', () => {
    const { helpers, count } = setup();
    expect(helpers.can().toggleMark('bold')).toBe(true);
    expect(helpers.can().undo()).toBe(false);
    expect(count()).toBe(0);
  });

  it('runs a bound command straight away', () => {
    const { helpers, get, count } = setup();
    expect(helpers.commands.toggleMark('bold')).toBe(true);
    expect(markdownOf(get())).toEqual(['**hello**']);
    expect(count()).toBe(1);
    expect(helpers.commands.setLink('javascript:x')).toBe(false);
    expect(count()).toBe(1);
  });

  it('runs each chained command against the result of the previous one', () => {
    const { helpers, get } = setup();
    helpers.chain().splitBlock().insertText('x').run();
    expect(markdownOf(get())).toEqual(['', 'x']);
    const doubled = setup();
    doubled.helpers.chain().toggleMark('bold').toggleMark('bold').run();
    expect(markdownOf(doubled.get())).toEqual(['hello']);
  });

  it('carries selection changes and stored marks of the last command', () => {
    const typed = setup();
    typed.helpers.chain().selectBlock().selectAll().run();
    expect(caretOf(typed.get())).toEqual({ blocks: [0, 0] });
    const marked = setup();
    marked.helpers.chain().setSelection(null).toggleMark('bold').run();
    expect(marked.get().storedMarks).toEqual([{ type: 'bold' }]);
    marked.helpers.chain().insertText('x').toggleMark('italic').run();
    expect(marked.get().storedMarks).toEqual([{ type: 'bold' }, { type: 'italic' }]);
  });

  it('sees stored marks set earlier in the same chain', () => {
    const { helpers, get } = setup();
    helpers.chain().setSelection(null).toggleMark('bold').insertText('x').run();
    expect(markdownOf(get())).toEqual(['**x**hello']);
    expect(get().storedMarks).toBeNull();
  });

  it('dispatches nothing for an empty chain or one that only reads', () => {
    const { helpers, count } = setup();
    expect(helpers.chain().run()).toBe(true);
    expect(count()).toBe(0);
    const noop: Command = () => true;
    const custom = createCommandHelpers(() => buildState(['a']), () => undefined, { noop: () => noop });
    expect(custom.chain().noop().run()).toBe(true);
  });

  it('dispatches a single command as it is, keeping its metadata', () => {
    const { helpers, get, last } = setup([historyPlugin()]);
    helpers.chain().toggleMark('bold').run();
    expect(undoDepth(get())).toBe(1);
    helpers.chain().undo().run();
    expect(last.tr?.getMeta('history')).toBe('undo');
    expect(markdownOf(get())).toEqual(['hello']);
    expect(undoDepth(get())).toBe(0);
  });

  it('records a chain as one history step', () => {
    const { helpers, get } = setup([historyPlugin()]);
    helpers.chain().toggleMark('bold').toggleMark('italic').setBlockType('MARKDOWN', { kind: 'quote' }).run();
    expect(markdownOf(get())).toEqual(['> **_hello_**']);
    expect(undoDepth(get())).toBe(1);
    helpers.commands.undo();
    expect(markdownOf(get())).toEqual(['hello']);
  });

  it('keeps one origin, and falls back to command when they differ', () => {
    const { helpers, last } = setup();
    helpers.chain().insertText('a').insertText('b').run();
    expect(last.tr?.origin).toBe('input');
    helpers.chain().insertText('a').toggleMark('bold').run();
    expect(last.tr?.origin).toBe('command');
  });

  it('keeps a chain out of history, or closes the group, when any command asked for it', () => {
    let state: EditorState = buildState(['hello'], { block: 0, offset: 5 }, { plugins: [historyPlugin()] });
    let sent: Transaction | null = null;
    const withMeta = (key: string, value: unknown): Command => (current, dispatch) =>
      insertText('x')(current, (tr) => dispatch?.(tr.setMeta(key, value)));
    const helpers = createCommandHelpers(() => state, (tr) => {
      sent = tr;
      state = applyTransaction(state, tr);
    }, { ...coreCommandFactories, quiet: () => withMeta('addToHistory', false), closing: () => withMeta('closeHistory', true) });
    helpers.chain().quiet().toggleMark('bold').run();
    expect(undoDepth(state)).toBe(0);
    helpers.chain().closing().toggleMark('bold').run();
    expect(sent).not.toBeNull();
    expect((sent as unknown as Transaction).getMeta('closeHistory')).toBe(true);
    expect(undoDepth(state)).toBe(1);
  });

  it('exposes every core command by name', () => {
    expect(Object.keys(coreCommandFactories).sort()).toEqual([
      'clearFormatting', 'deleteBackward', 'deleteBlocks', 'deleteForward', 'deleteSelection', 'deleteToLineEnd',
      'deleteToLineStart', 'deleteWordBackward', 'deleteWordForward', 'duplicateBlocks', 'indent', 'insertAtom',
      'insertBlockAfter', 'insertHardBreak', 'insertMention', 'insertText', 'moveBlocksDown', 'moveBlocksTo',
      'moveBlocksUp', 'outdent', 'redo', 'selectAll', 'selectBlock', 'setAttrs', 'setBlockColor', 'setBlockType',
      'setLink', 'setMark', 'setSelection', 'setTextAlign', 'splitBlock', 'toggleMark', 'toggleTask', 'undo',
      'undoInputRule', 'unsetLink', 'unsetMark',
    ]);
    const state = buildState(['a'], { block: 0, offset: 0 });
    for (const make of Object.values(coreCommandFactories).filter((factory) => factory.length === 0)) {
      expect(typeof (make as () => Command)()(state)).toBe('boolean');
    }
  });
});
