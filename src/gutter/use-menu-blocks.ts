import { useCallback, useEffect } from 'react';
import type { CanvasUiStore } from '../canvas/ui-store';
import { useQuoin } from '../context';
import type { EditorState, EngineBlock } from '../engine';
import { blockById } from '../engine/model/doc';
import { useLabels } from '../i18n/use-labels';
import type { ViewController } from '../view';
import { useEditorState } from '../view/react/use-editor-state';
import { closeBlockMenu } from './block-menu-state';
import { blockTypeLabel } from './block-type-label';

const sameBlocks = (a: readonly EngineBlock[], b: readonly EngineBlock[]) =>
  a.length === b.length && a.every((block, i) => block === b[i]);

/**
 * The blocks an open menu was opened for that the document still holds, and the name of the first, which heads the
 * menu. A block removed meanwhile drops out, and the menu closes once none is left.
 */
export function useMenuBlocks(
  controller: ViewController,
  store: CanvasUiStore,
  blockIds: readonly string[],
): { blocks: EngineBlock[]; title: string } {
  const labels = useLabels();
  const { blockTypes } = useQuoin();
  const select = useCallback(
    (state: EditorState) => blockIds.flatMap((id) => blockById(state.doc, id) ?? []),
    [blockIds],
  );
  const blocks = useEditorState(controller, select, sameBlocks);
  const gone = blocks.length === 0;

  useEffect(() => {
    if (gone) closeBlockMenu(store);
  }, [gone, store]);

  return { blocks, title: gone ? '' : blockTypeLabel(labels, blocks[0], blockTypes) };
}
