'use client';

import { useEffect } from 'react';
import { deleteCellContents } from '../../engine/commands/cell-commands';
import { cellSelection } from '../../engine/state/cell-selection';
import type { ViewController } from '../../view';
import { handleCopy } from '../../view/clipboard/clipboard-events';

/**
 * A cut of a cell range copies as the editor does, then empties the cells of the range, where the editor's own cut
 * would empty the cells between its two ends in reading order. It is heard before the editor's, which it stops.
 */
export function useCutCells(controller: ViewController): void {
  useEffect(() => {
    const root = controller.root;
    if (root === null) return;
    const onCut = (event: ClipboardEvent) => {
      if (controller.readOnly || cellSelection(controller.editor.state) === null) return;
      event.stopPropagation();
      handleCopy(controller, event, false);
      controller.run(deleteCellContents);
    };
    root.addEventListener('cut', onCut, true);
    return () => root.removeEventListener('cut', onCut, true);
  }, [controller]);
}
