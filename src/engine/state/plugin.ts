import type { EditorState } from './editor-state';
import type { Transaction } from './transaction';

export type PluginKey<T> = { readonly name: string; readonly __value?: T };

export function createPluginKey<T>(name: string): PluginKey<T> {
  return { name };
}

export type PluginSpec<T> = {
  readonly key: PluginKey<T>;
  init(state: EditorState): T;
  apply(tr: Transaction, value: T, oldState: EditorState, newState: EditorState): T;
};
