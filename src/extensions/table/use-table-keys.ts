'use client';

import { useEffect } from 'react';
import { typeOverCells } from '../../engine/commands/cell-commands';
import { cellSelection } from '../../engine/state/cell-selection';
import type { KeyInterceptor, ViewController } from '../../view';
import { isComposingKey } from '../../view/input/keydown';
import { enterTable, moveBetweenRows } from './vertical-cell-move';
import { interceptKeys } from '../../view/input/intercept-keys';

const printable = (event: KeyboardEvent): boolean => [...event.key].length === 1 && !event.ctrlKey && !event.metaKey;

// A cell range is held by the selection sink, so a key typed over it reaches the editor only as keydown, where the
// text would otherwise replace the cells in reading order rather than as a rectangle.
function typeOver(controller: ViewController, blockId: string, event: KeyboardEvent): boolean {
  if (cellSelection(controller.editor.state)?.block !== blockId || !printable(event)) return false;
  return controller.run(typeOverCells(event.key));
}

/**
 * The keys of a table that need its layout: the arrows between its rows and into it from the blocks around it, and a
 * key typed over a cell range.
 */
export function useTableKeys(controller: ViewController, blockId: string, editable: boolean): void {
  useEffect(() => {
    if (!editable) return;
    const intercept: KeyInterceptor = (event) => {
      if (isComposingKey(controller, event)) return false;
      const handled =
        typeOver(controller, blockId, event) ||
        moveBetweenRows(controller, blockId, event) ||
        enterTable(controller, blockId, event);
      if (handled) event.preventDefault();
      return handled;
    };
    return interceptKeys(controller, intercept);
  }, [controller, blockId, editable]);
}
