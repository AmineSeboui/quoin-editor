import { describe, expect, it } from 'vitest';
import { text } from '../model/inline';
import { replaceInlineStep } from '../transform/replace-inline-step';
import { buildState, caretOf } from '../test-support/build-state';
import { applyTransaction, createState, getPluginState } from './editor-state';
import { createPluginKey, type PluginSpec } from './plugin';
import { nodeSelection, textSelection } from './selection';
import { Transaction } from './transaction';

const base = () => buildState(['hello', 'world']);

describe('createState', () => {
  it('starts at the beginning of the document with no stored marks', () => {
    const { doc, schema } = base();
    const state = createState({ doc, schema });
    expect(caretOf(state)).toEqual({ block: 0, offset: 0 });
    expect(state.storedMarks).toBeNull();
    expect(state.plugins).toEqual([]);
  });

  it('validates the selection it is given', () => {
    const { doc, schema } = base();
    const state = createState({ doc, schema, selection: textSelection({ block: 'b1', region: 'text', offset: 99 }) });
    expect(caretOf(state)).toEqual({ block: 1, offset: 5 });
    expect(createState({ doc, schema, selection: nodeSelection('b1') }).selection).toEqual(nodeSelection('b1'));
  });

  it('keeps a selection in any document that has blocks and none in one that has not', () => {
    const { doc, schema } = base();
    expect(caretOf(createState({ doc, schema, selection: null }))).toEqual({ block: 0, offset: 0 });
    const empty = buildState([]);
    expect(createState({ doc: empty.doc, schema, selection: nodeSelection('b0') }).selection).toBeNull();
  });

  it('refuses two plugins with one key', () => {
    const key = createPluginKey<number>('twice');
    const plugin: PluginSpec<number> = { key, init: () => 0, apply: (_tr, value) => value };
    const { doc, schema } = base();
    expect(() => createState({ doc, schema, plugins: [plugin, plugin] })).toThrow('duplicate plugin key "twice"');
  });
});

describe('applyTransaction', () => {
  const type = (state: ReturnType<typeof base>) =>
    new Transaction(state).step(replaceInlineStep('b0', 'text', 0, 0, [text('x')]));

  it('takes the document from the transaction and leaves the old state alone', () => {
    const state = base();
    const next = applyTransaction(state, type(state));
    expect(next.doc.blocks[0].regions.text).toEqual([text('xhello')]);
    expect(state.doc.blocks[0].regions.text).toEqual([text('hello')]);
    expect(next.schema).toBe(state.schema);
  });

  it('runs plugins in order, each seeing the old state and the new one', () => {
    const calls: string[] = [];
    const a = createPluginKey<string>('a');
    const b = createPluginKey<string>('b');
    const first: PluginSpec<string> = {
      key: a,
      init: () => 'a0',
      apply(_tr, value, oldState, newState) {
        calls.push(`a ${value} ${oldState.doc === newState.doc}`);
        return 'a1';
      },
    };
    const second: PluginSpec<string> = {
      key: b,
      init: () => 'b0',
      apply(_tr, value, _old, newState) {
        calls.push(`b ${value} ${getPluginState(newState, a)}`);
        return 'b1';
      },
    };
    const { doc, schema } = base();
    const state = createState({ doc, schema, plugins: [first, second] });
    const next = applyTransaction(state, type(state));
    expect(calls).toEqual(['a a0 false', 'b b0 a1']);
    expect([getPluginState(next, a), getPluginState(next, b)]).toEqual(['a1', 'b1']);
    expect([getPluginState(state, a), getPluginState(state, b)]).toEqual(['a0', 'b0']);
  });

  it('refuses a transaction built on another state', () => {
    const state = base();
    const stale = type(state);
    const next = applyTransaction(state, type(state));
    expect(() => applyTransaction(next, stale)).toThrow(
      new RangeError('Applying a mismatched transaction: it was built on another state'),
    );
  });

  it('reads the plugin state of a plugin that is not registered as an error', () => {
    const read = () => getPluginState(base(), createPluginKey<number>('absent'));
    expect(read).toThrow('no plugin registered for "absent"');
  });
});
