import { describe, expect, it } from 'vitest';
import { applyTransaction, type EditorState } from '../state/editor-state';
import { historyPlugin, redoDepth, undoDepth } from '../state/history';
import { createPluginKey, type PluginSpec } from '../state/plugin';
import { textSelection } from '../state/selection';
import { Transaction } from '../state/transaction';
import { buildState, markdownOf } from '../test-support/build-state';
import { coreCommandFactories, createCommandHelpers } from './chain';
import type { Command } from './command';

const counterKey = createPluginKey<number>('bump-counter');
const counter: PluginSpec<number> = {
  key: counterKey,
  init: () => 0,
  apply: (tr, value) => (tr.getMeta('bump') === true ? value + 1 : value),
};

const bump: Command = (state, dispatch) => {
  dispatch?.(new Transaction(state).setMeta('bump', true));
  return true;
};

function setup(plugins: readonly PluginSpec<unknown>[]) {
  let state: EditorState = buildState(['hello'], { block: 0, offset: 5 }, { plugins });
  const factories = { ...coreCommandFactories, bump: () => bump };
  const helpers = createCommandHelpers(
    () => state,
    (tr) => {
      state = applyTransaction(state, tr);
    },
    factories,
  );
  return { helpers, get: () => state };
}

const caretAt = (offset: number) => {
  const pos = { block: 'b0', region: 'text', offset };
  return textSelection(pos);
};

describe('chained commands and transaction metadata', () => {
  it('keeps the metadata of every part so plugins see what single commands would give them', () => {
    const { helpers, get } = setup([counter]);
    helpers.commands.bump();
    expect(get().pluginState.get(counterKey.name)).toBe(1);
    helpers.chain().bump().toggleMark('bold').run();
    expect(get().pluginState.get(counterKey.name)).toBe(2);
    helpers.chain().toggleMark('bold').bump().run();
    expect(get().pluginState.get(counterKey.name)).toBe(3);
  });

  it('lets a later part win when two parts set the same key', () => {
    let state: EditorState = buildState(['hello'], { block: 0, offset: 5 });
    const seen: unknown[] = [];
    const tag = (value: string): Command => (current, dispatch) => {
      dispatch?.(new Transaction(current).setMeta('tag', value));
      return true;
    };
    const helpers = createCommandHelpers(() => state, (tr) => {
      seen.push(tr.getMeta('tag'));
      state = applyTransaction(state, tr);
    }, { first: () => tag('first'), second: () => tag('second') });
    helpers.chain().first().second().run();
    expect(seen).toEqual(['second']);
  });

  it('keeps redo available when a chain selects and then undoes', () => {
    const { helpers, get } = setup([historyPlugin()]);
    helpers.commands.insertText('!');
    expect(markdownOf(get())).toEqual(['hello!']);
    expect(helpers.chain().setSelection(caretAt(0)).undo().run()).toBe(true);
    expect(markdownOf(get())).toEqual(['hello']);
    expect([undoDepth(get()), redoDepth(get())]).toEqual([0, 1]);
    expect(helpers.commands.redo()).toBe(true);
    expect(markdownOf(get())).toEqual(['hello!']);
  });

  it('keeps undo available when a chain selects and then redoes', () => {
    const { helpers, get } = setup([historyPlugin()]);
    helpers.commands.insertText('!');
    helpers.commands.undo();
    expect(helpers.chain().setSelection(caretAt(0)).redo().run()).toBe(true);
    expect(markdownOf(get())).toEqual(['hello!']);
    expect([undoDepth(get()), redoDepth(get())]).toEqual([1, 0]);
  });

  it('refuses to merge an undo with parts that change the document, and dispatches nothing', () => {
    const { helpers, get } = setup([historyPlugin()]);
    helpers.commands.insertText('!');
    expect(helpers.chain().insertText('?').undo().run()).toBe(false);
    expect(helpers.chain().undo().insertText('?').run()).toBe(false);
    expect(helpers.chain().undo().undo().run()).toBe(false);
    expect(markdownOf(get())).toEqual(['hello!']);
    expect([undoDepth(get()), redoDepth(get())]).toEqual([1, 0]);
  });
});
