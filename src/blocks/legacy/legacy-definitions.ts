import { Code, Image, Paperclip } from 'lucide-react';
import { defineBlock, type AnyBlockDefinition } from '../../registry';
import { CodeBlockEditor } from '../CodeBlockEditor';
import { FileBlockEditor } from '../FileBlockEditor';
import { ImageBlockEditor } from '../ImageBlockEditor';
import { CodePreview, FilePreview, ImagePreview } from '../previews';

/** The 0.4 CODE, IMAGE and FILE editors and previews, drawn as void blocks until their 1.0 blocks replace them. */
export const legacyDefinitions: AnyBlockDefinition[] = [
  defineBlock({
    type: 'CODE',
    label: 'Code',
    icon: Code,
    editor: CodeBlockEditor,
    preview: CodePreview,
    initialData: () => ({ language: '', code: '' }),
  }),
  defineBlock({
    type: 'IMAGE',
    label: 'Image',
    icon: Image,
    editor: ImageBlockEditor,
    preview: ImagePreview,
    initialData: () => ({ storageKey: '', alt: '' }),
  }),
  defineBlock({
    type: 'FILE',
    label: 'File',
    icon: Paperclip,
    editor: FileBlockEditor,
    preview: FilePreview,
    initialData: () => ({ storageKey: '', filename: '' }),
  }),
];
