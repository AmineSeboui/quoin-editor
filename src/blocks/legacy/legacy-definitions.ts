import { Paperclip } from 'lucide-react';
import { defineBlock, type AnyBlockDefinition } from '../../registry';
import { FileBlockEditor } from '../FileBlockEditor';
import { FilePreview } from '../previews';

/** The 0.4 FILE editor and preview, drawn as a void block until the 1.0 file block replaces it. */
export const legacyDefinitions: AnyBlockDefinition[] = [
  defineBlock({
    type: 'FILE',
    label: 'File',
    icon: Paperclip,
    editor: FileBlockEditor,
    preview: FilePreview,
    initialData: () => ({ storageKey: '', filename: '' }),
  }),
];
