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
};

const nameIn = (names: Readonly<Record<string, BlockName>>, key: unknown): BlockName | undefined =>
  typeof key === 'string' && Object.hasOwn(names, key) ? names[key] : undefined;

export function blockTypeLabel(labels: QuoinLabels, block: EngineBlock, definitions: AnyBlockDefinition[]): string {
  const { kind, level } = block.attrs;
  if (block.type === 'MARKDOWN' && kind === 'heading') return labels.heading(typeof level === 'number' ? level : 1);
  const name = block.type === 'MARKDOWN' ? nameIn(KIND_NAMES, kind) : nameIn(TYPE_NAMES, block.type);
  if (name !== undefined) return labels.blockNames[name];
  return blockByType(definitions, block.type)?.label ?? labels.unsupportedBlock;
}
