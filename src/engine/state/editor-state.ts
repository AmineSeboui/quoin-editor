import type { EngineDoc, Mark, Selection } from '../model/types';
import type { Schema } from '../schema/types';
import type { PluginKey, PluginSpec } from './plugin';
import { defaultSelection, sameSelection, validateSelection } from './selection';
import type { Transaction } from './transaction';

export type EditorState = {
  readonly doc: EngineDoc;
  readonly selection: Selection | null;
  readonly storedMarks: readonly Mark[] | null;
  readonly schema: Schema;
  readonly plugins: readonly PluginSpec<unknown>[];
  readonly pluginState: ReadonlyMap<string, unknown>;
};

export function createState(config: {
  doc: EngineDoc;
  schema: Schema;
  selection?: Selection | null;
  plugins?: readonly PluginSpec<unknown>[];
}): EditorState {
  const { doc, schema, plugins = [] } = config;
  const requested = config.selection === undefined ? defaultSelection(doc, schema) : config.selection;
  const pluginState = new Map<string, unknown>();
  const state: EditorState = {
    doc,
    schema,
    selection: validateSelection(doc, schema, requested),
    storedMarks: null,
    plugins,
    pluginState,
  };
  for (const plugin of plugins) {
    if (pluginState.has(plugin.key.name)) throw new Error(`duplicate plugin key "${plugin.key.name}"`);
    pluginState.set(plugin.key.name, plugin.init(state));
  }
  return state;
}

export function applyTransaction(state: EditorState, tr: Transaction): EditorState {
  const selection = validateSelection(tr.doc, state.schema, tr.selection);
  const unchanged = !tr.docChanged && sameSelection(state.selection, selection);
  const storedMarks = tr.storedMarksSet ? tr.storedMarks : unchanged ? state.storedMarks : null;
  const next: EditorState = { ...state, doc: tr.doc, selection, storedMarks };
  if (state.plugins.length === 0) return next;
  const pluginState = new Map(state.pluginState);
  const updated: EditorState = { ...next, pluginState };
  for (const plugin of state.plugins) {
    const { name } = plugin.key;
    pluginState.set(name, plugin.apply(tr, state.pluginState.get(name), state, updated));
  }
  return updated;
}

export function getPluginState<T>(state: EditorState, key: PluginKey<T>): T {
  if (!state.pluginState.has(key.name)) throw new Error(`no plugin registered for "${key.name}"`);
  return state.pluginState.get(key.name) as T;
}
