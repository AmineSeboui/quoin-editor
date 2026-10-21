import type { CommandFactories } from '../commands/chain';
import type { Command } from '../commands/command';
import type { Attrs } from '../model/types';
import type { InputRule } from '../rules/input-rule';
import type { AtomSpec, BlockSpec, MarkSpec, Schema } from '../schema/types';
import type { EditorState } from '../state/editor-state';
import type { PluginSpec } from '../state/plugin';
import type { Transaction } from '../state/transaction';

export type Decoration =
  | {
      readonly kind: 'inline';
      readonly block: string;
      readonly region: string;
      readonly from: number;
      readonly to: number;
      readonly attrs: Attrs;
    }
  | {
      readonly kind: 'widget';
      readonly block: string;
      readonly region: string;
      readonly offset: number;
      readonly key: string;
      readonly widget: string;
      readonly attrs: Attrs;
      readonly side?: -1 | 1;
    }
  | { readonly kind: 'block'; readonly block: string; readonly attrs: Attrs };

export type PasteRule = { readonly name: string; match(text: string, state: EditorState): Command | null };

export type Extension = {
  readonly name: string;
  readonly priority?: number;
  readonly blocks?: readonly BlockSpec[];
  readonly marks?: readonly MarkSpec[];
  readonly atoms?: readonly AtomSpec[];
  readonly inputRules?: readonly InputRule[];
  readonly pasteRules?: readonly PasteRule[];
  readonly keymap?: Readonly<Record<string, Command>>;
  readonly commands?: CommandFactories;
  readonly plugins?: readonly PluginSpec<unknown>[];
  readonly decorations?: (state: EditorState) => readonly Decoration[];
  readonly onTransaction?: (tr: Transaction, state: EditorState) => void;
  /**
   * Refuses a transaction before it applies by returning false: the editor drops it whole. Undo and redo, the blocks the
   * host supplies and remote transactions are never filtered.
   */
  readonly filterTransaction?: (tr: Transaction, state: EditorState) => boolean;
  readonly ui?: unknown;
};

export type ResolvedExtensions = {
  readonly extensions: readonly Extension[];
  readonly schema: Schema;
  readonly inputRules: readonly InputRule[];
  readonly pasteRules: readonly PasteRule[];
  readonly keymap: ReadonlyMap<string, readonly Command[]>;
  readonly commands: CommandFactories;
  readonly plugins: readonly PluginSpec<unknown>[];
  decorations(state: EditorState): readonly Decoration[];
  filterTransaction(tr: Transaction, state: EditorState): boolean;
};
