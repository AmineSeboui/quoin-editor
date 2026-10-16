import type { ComponentType } from 'react';
import { Image, Minus, Paperclip } from 'lucide-react';
import { insertBlockAfter, type BlockAttrs } from '../../engine';
import { attrsForData } from '../../blocks/void/block-data';
import type { SlashGroup, SlashItem } from '../../extensions/ui-types';
import { turnIntoTargets } from '../../gutter/turn-into-targets';
import type { QuoinLabels, SlashBlockCommand } from '../../i18n/labels';
import { paletteBlocks, type AnyBlockDefinition } from '../../registry';
import { replaceTrigger } from '../suggestion/replace-trigger';

type Details = { group: SlashGroup; keywords: readonly string[]; shortcut?: string };

// Listed group by group, Basic, Lists, Media then Advanced, so the full menu reads in the order of its headings.
const DETAILS: Readonly<Record<SlashBlockCommand, Details>> = {
  text: { group: 'basic', keywords: ['paragraph', 'plain'], shortcut: 'Mod-Alt-0' },
  heading1: { group: 'basic', keywords: ['h1', 'title', '#'], shortcut: 'Mod-Alt-1' },
  heading2: { group: 'basic', keywords: ['h2', 'subtitle', '##'], shortcut: 'Mod-Alt-2' },
  heading3: { group: 'basic', keywords: ['h3', 'subheading', '###'], shortcut: 'Mod-Alt-3' },
  quote: { group: 'basic', keywords: ['blockquote', 'citation', '>'] },
  divider: { group: 'basic', keywords: ['hr', 'rule', 'separator', 'line', '---'] },
  callout: { group: 'basic', keywords: ['note', 'info', 'tip', 'warning', 'admonition'] },
  bulletedList: { group: 'lists', keywords: ['ul', 'bullet', 'unordered', '-'], shortcut: 'Mod-Shift-8' },
  numberedList: { group: 'lists', keywords: ['ol', 'ordered', 'numbers', '1.'], shortcut: 'Mod-Shift-7' },
  todoList: { group: 'lists', keywords: ['todo', 'task', 'checkbox', 'checklist'], shortcut: 'Mod-Shift-9' },
  toggle: { group: 'lists', keywords: ['collapse', 'details', 'accordion', 'list'] },
  image: { group: 'media', keywords: ['picture', 'photo', 'img'] },
  file: { group: 'media', keywords: ['attachment', 'upload', 'document'] },
  code: { group: 'advanced', keywords: ['snippet', 'pre', 'program', '```'] },
};

/** The block types the built-in commands insert, which the registry's own commands leave out. */
const BUILT_IN_TYPES: ReadonlySet<string> = new Set(['MARKDOWN', 'CALLOUT', 'TOGGLE', 'DIVIDER', 'CODE', 'IMAGE', 'FILE']);

type Insertion = { label: string; icon: ComponentType<{ className?: string }>; type: string; attrs: BlockAttrs };

function insertionItem(id: SlashBlockCommand, insertion: Insertion, labels: QuoinLabels): SlashItem {
  const { label, icon, type, attrs } = insertion;
  return {
    id,
    title: label,
    description: labels.slashDescriptions[id],
    icon,
    ...DETAILS[id],
    run: ({ controller, range }) => {
      replaceTrigger(controller, range, insertBlockAfter(type, attrs));
    },
  };
}

export function builtInSlashItems(labels: QuoinLabels): SlashItem[] {
  const { blockNames } = labels;
  const insertions: Partial<Record<SlashBlockCommand, Insertion>> = {
    divider: { label: blockNames.divider, icon: Minus, type: 'DIVIDER', attrs: {} },
    image: { label: blockNames.image, icon: Image, type: 'IMAGE', attrs: {} },
    file: { label: blockNames.file, icon: Paperclip, type: 'FILE', attrs: {} },
  };
  for (const target of turnIntoTargets(labels)) insertions[target.id as SlashBlockCommand] = target;
  return (Object.keys(DETAILS) as SlashBlockCommand[]).flatMap((id) => {
    const insertion = insertions[id];
    return insertion === undefined ? [] : [insertionItem(id, insertion, labels)];
  });
}

/** A command under Custom for each registered block type the palette offers and no built-in command inserts. */
export function blockTypeSlashItems(definitions: AnyBlockDefinition[]): SlashItem[] {
  return paletteBlocks(definitions)
    .filter((definition) => !BUILT_IN_TYPES.has(definition.type))
    .map((definition) => ({
      id: `block:${definition.type}`,
      title: definition.label,
      group: 'custom',
      icon: definition.icon,
      run: ({ controller, range }) => {
        const attrs = attrsForData(controller, definition.type, definition.initialData?.());
        replaceTrigger(controller, range, insertBlockAfter(definition.type, attrs));
      },
    }));
}
