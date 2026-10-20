import { useCallback, useContext, useEffect } from 'react';
import type { BlockMenuState, CanvasUiStore } from '../canvas/ui-store';
import { useQuoin } from '../context';
import type { EditorState, EngineBlock } from '../engine';
import { blockById } from '../engine/model/doc';
import { useLabels } from '../i18n/use-labels';
import type { ViewController } from '../view';
import { useEditorState } from '../view/react/use-editor-state';
import { closeBlockMenu } from './block-menu-state';
import { blockTypeLabel } from './block-type-label';
import { ExtensionBlockNames } from './extension-block-names';

const sameBlocks = (a: readonly EngineBlock[], b: readonly EngineBlock[]) =>
  a.length === b.length && a.every((block, i) => block === b[i]);

function useLiveBlocks(controller: ViewController, blockIds: readonly string[]): EngineBlock[] {
  const select = useCallback(
    (state: EditorState) => blockIds.flatMap((id) => blockById(state.doc, id) ?? []),
    [blockIds],
  );
  return useEditorState(controller, select, sameBlocks);
}

export function useMenuBlocks(
  controller: ViewController,
  store: CanvasUiStore,
  menu: BlockMenuState,
): { blocks: EngineBlock[]; styled: EngineBlock[]; title: string } {
  const labels = useLabels();
  const { blockTypes } = useQuoin();
  const extensionNames = useContext(ExtensionBlockNames);
  const blocks = useLiveBlocks(controller, menu.blockIds);
  const styled = useLiveBlocks(controller, menu.styleIds);
  const gone = blocks.length === 0;

  useEffect(() => {
    if (gone) closeBlockMenu(store);
  }, [gone, store]);

  return { blocks, styled, title: gone ? '' : blockTypeLabel(labels, blocks[0], blockTypes, extensionNames) };
}
