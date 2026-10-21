import type { EngineBlock } from '../engine';
import type { BlockName, QuoinLabels } from '../i18n/labels';
import { blockByType, type AnyBlockDefinition } from '../registry';

const KIND_NAMES: Readonly<Record<string, BlockName>> = {
  paragraph: 'text',
  bullet: 'bulletedList',
  ordered: 'numberedList',
  task: 'todoList',
  quote: 'quote',
};

const TYPE_NAMES: Readonly<Record<string, BlockName>> = {
  CALLOUT: 'callout',
  TOGGLE: 'toggle',
  DIVIDER: 'divider',
  CODE: 'code',
  IMAGE: 'image',
  FILE: 'file',
};

const nameIn = <T>(names: Readonly<Record<string, T>>, key: unknown): T | undefined =>
  typeof key === 'string' && Object.hasOwn(names, key) ? names[key] : undefined;

/** The type of a block in words: a core type in the labels, then a type an extension draws by the name it gives. */
export function blockTypeLabel(
  labels: QuoinLabels,
  block: EngineBlock,
  definitions: AnyBlockDefinition[],
  extensionNames: Readonly<Record<string, string>> = {},
): string {
  const { kind, level } = block.attrs;
  if (block.type === 'MARKDOWN' && kind === 'heading') return labels.heading(typeof level === 'number' ? level : 1);
  const name = block.type === 'MARKDOWN' ? nameIn(KIND_NAMES, kind) : nameIn(TYPE_NAMES, block.type);
  if (name !== undefined) return labels.blockNames[name];
  return nameIn(extensionNames, block.type) ?? blockByType(definitions, block.type)?.label ?? labels.unsupportedBlock;
}
