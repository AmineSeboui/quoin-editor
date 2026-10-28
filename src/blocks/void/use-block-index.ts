'use client';

import { useCallback } from 'react';
import type { EditorState } from '../../engine';
import type { ViewController } from '../../view';
import { useEditorState } from '../../view/react/use-editor-state';

/** The block's position in the document, drawing again only when that position changes. */
export function useBlockIndex(controller: ViewController, blockId: string): number {
  const select = useCallback((state: EditorState) => state.doc.index.get(blockId) ?? -1, [blockId]);
  return useEditorState(controller, select);
}
