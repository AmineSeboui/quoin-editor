import { Code, FileText, Image, MessageSquare } from 'lucide-react';
import { defineBlock, type AnyBlockDefinition } from '../registry';
import { legacyDefinitions } from './legacy/legacy-definitions';
import { CalloutPreview, CodePreview, ImagePreview, MarkdownPreview } from './previews';

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
  defineBlock({
    type: 'CODE',
    label: 'Code',
    icon: Code,
    preview: CodePreview,
    initialData: () => ({ language: '', code: '' }),
  }),
  defineBlock({
    type: 'IMAGE',
    label: 'Image',
    icon: Image,
    preview: ImagePreview,
    initialData: () => ({ storageKey: '', alt: '' }),
  }),
  ...legacyDefinitions,
];
