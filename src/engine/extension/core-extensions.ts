import { coreBlockSpecs } from '../blocks/core-specs';
import { coreCommandFactories, type CommandFactories } from '../commands/chain';
import { insertSlice } from '../clipboard/insert-slice';
import { pasteLinkOverSelection } from '../clipboard/paste-link';
import { loneUrl } from '../clipboard/paste-url';
import { blockInputRules } from '../rules/block-rules';
import { insertTextWithRules } from '../rules/input-rule';
import { markInputRules } from '../rules/mark-rules';
import { typographyRules } from '../rules/typography';
import { coreAtomSpecs } from '../schema/core-atoms';
import { coreMarkSpecs } from '../schema/core-marks';
import { historyPlugin, redo, undo } from '../state/history';
import { coreKeymap } from './core-keymap';
import { defineExtension } from './define-extension';
import type { Extension, PasteRule } from './types';

export const coreCommands = {
  ...coreCommandFactories,
  insertSlice,
  pasteLinkOverSelection,
  insertTextWithRules,
} satisfies CommandFactories;

export type CoreCommands = typeof coreCommands;

export type CoreExtensionOptions = {
  typography?: { dashes?: 'em' | 'en' | 'none' } | false;
  newId?: () => string;
};

const linkOverSelection: PasteRule = {
  name: 'link-over-selection',
  match: (text) => (loneUrl(text, 'linkable') === null ? null : pasteLinkOverSelection(text)),
};

export function coreExtensions(options: CoreExtensionOptions = {}): Extension[] {
  const typography = options.typography
    ? [defineExtension({ name: 'typography', inputRules: typographyRules(options.typography) })]
    : [];
  return [
    defineExtension({
      name: 'core',
      blocks: coreBlockSpecs,
      marks: coreMarkSpecs,
      atoms: coreAtomSpecs,
      commands: coreCommands,
      pasteRules: [linkOverSelection],
    }),
    defineExtension({
      name: 'history',
      plugins: [historyPlugin()],
      keymap: { 'Mod-z': undo, 'Mod-Shift-z': redo, 'Mod-y': redo },
    }),
    defineExtension({ name: 'editing-keys', keymap: coreKeymap(options) }),
    defineExtension({ name: 'markdown-shortcuts', inputRules: [...blockInputRules, ...markInputRules] }),
    ...typography,
  ];
}
