import { FileText, MessageSquare } from 'lucide-react';
import { defineBlock, type AnyBlockDefinition } from '../registry';
import { legacyDefinitions } from './legacy/legacy-definitions';
import { CalloutPreview, MarkdownPreview } from './previews';

/** The block types Quoin ships with. Spread them alongside your own definitions. */
export const coreBlocks: AnyBlockDefinition[] = [
  defineBlock({
    type: 'MARKDOWN',
    label: 'Markdown',
    icon: FileText,
    preview: MarkdownPreview,
    initialData: () => ({ markdown: '' }),
  }),
  defineBlock({
    type: 'CALLOUT',
    label: 'Callout',
    icon: MessageSquare,
    preview: CalloutPreview,
    initialData: () => ({ tone: 'info', body: '' }),
  }),
  ...legacyDefinitions,
];
