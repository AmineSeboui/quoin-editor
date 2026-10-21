'use client';

import { useCallback, useEffect } from 'react';
import type { EditorState } from '../../engine';
import type { ViewController } from '../../view';
import { useEditorState } from '../../view/react/use-editor-state';
import { headCell } from './table-keys';

/** Brings the cell the caret moves into into view, sideways in the table's own scroller and down the page. */
export function useRevealCell(controller: ViewController, blockId: string): void {
  const region = useEditorState(
    controller,
    useCallback(
      (state: EditorState) => {
        const caret = headCell(state);
        return caret?.block.id === blockId ? caret.head.region : null;
      },
      [blockId],
    ),
  );
  useEffect(() => {
    const host = region === null ? undefined : controller.registry.get(blockId, region);
    const root = controller.root;
    if (!host || !root?.contains(root.ownerDocument.activeElement)) return;
    host.closest('td, th')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [controller, blockId, region]);
}
