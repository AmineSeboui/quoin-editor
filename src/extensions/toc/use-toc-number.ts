import { useCallback } from 'react';
import type { EditorState } from '../../engine';
import type { ViewController } from '../../view';
import { useEditorState } from '../../view/react/use-editor-state';
import { perDoc } from './per-doc';

const tocIds = perDoc(({ doc }) => doc.blocks.flatMap((block) => (block.type === 'TOC' ? [block.id] : [])));

/** Where the block comes among the tables of contents of the document, counted from 1. */
export function useTocNumber(controller: ViewController, blockId: string): number {
  const select = useCallback((state: EditorState) => tocIds(state).indexOf(blockId) + 1, [blockId]);
  return useEditorState(controller, select);
}
