'use client';

// The whole main entry, for the reason src/table.ts gives.
import './index';

export { QuoinSource, type QuoinSourceProps } from './extensions/source/QuoinSource';
export { useEditorSource, type EditorSource } from './extensions/source/use-editor-source';
export { blockLines, type LineSpan } from './extensions/source/source-lines';
export { englishSourceLabels, type SourceLabels } from './extensions/source/source-labels';
