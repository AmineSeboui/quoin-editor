import type { CommandFactories } from '../commands/chain';
import type { Command } from '../commands/command';
import { createSchema } from '../schema/create-schema';
import type { EditorState } from '../state/editor-state';
import type { Transaction } from '../state/transaction';
import { normalizeKey } from './keymap';
import type { Extension, ResolvedExtensions } from './types';

const DEFAULT_PRIORITY = 100;

function keymapOf(extensions: readonly Extension[], isMac: boolean): Map<string, Command[]> {
  const keymap = new Map<string, Command[]>();
  for (const { keymap: bindings } of extensions) {
    for (const [name, command] of Object.entries(bindings ?? {})) {
      const key = normalizeKey(name, isMac);
      keymap.set(key, [...(keymap.get(key) ?? []), command]);
    }
  }
  return keymap;
}

function commandsOf(extensions: readonly Extension[]): CommandFactories {
  const commands = new Map<string, CommandFactories[string]>();
  for (const { commands: factories } of extensions) {
    for (const [name, factory] of Object.entries(factories ?? {})) {
      if (!commands.has(name)) commands.set(name, factory);
    }
  }
  return Object.fromEntries(commands);
}

export function resolveExtensions(extensions: readonly Extension[], isMac: boolean): ResolvedExtensions {
  const sorted = [...extensions].sort(
    (a, b) => (b.priority ?? DEFAULT_PRIORITY) - (a.priority ?? DEFAULT_PRIORITY),
  );
  return {
    extensions: sorted,
    schema: createSchema({
      blocks: sorted.flatMap((extension) => extension.blocks ?? []),
      marks: sorted.flatMap((extension) => extension.marks ?? []),
      atoms: sorted.flatMap((extension) => extension.atoms ?? []),
    }),
    inputRules: sorted.flatMap((extension) => extension.inputRules ?? []),
    pasteRules: sorted.flatMap((extension) => extension.pasteRules ?? []),
    keymap: keymapOf(sorted, isMac),
    commands: commandsOf(sorted),
    plugins: sorted.flatMap((extension) => extension.plugins ?? []),
    decorations: (state: EditorState) => sorted.flatMap((extension) => extension.decorations?.(state) ?? []),
    filterTransaction: (tr: Transaction, state: EditorState) =>
      sorted.every((extension) => extension.filterTransaction?.(tr, state) !== false),
  };
}
