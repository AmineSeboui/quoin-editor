'use client';

import { useEffect } from 'react';
import { typeOverCells } from '../../engine/commands/cell-commands';
import { cellSelection } from '../../engine/state/cell-selection';
import type { KeyInterceptor, ViewController } from '../../view';
import { isComposingKey } from '../../view/input/keydown';
import { enterTable, moveBetweenRows } from './vertical-cell-move';
import { interceptKeys } from '../../view/input/intercept-keys';

const printable = (event: KeyboardEvent): boolean => [...event.key].length === 1 && !event.ctrlKey && !event.metaKey;

// A key typed over a cell range replaces it as typed text, with no input rule run on the cell it lands in.
function typeOver(controller: ViewController, event: KeyboardEvent): boolean {
  if (cellSelection(controller.editor.state) === null || !printable(event)) return false;
  return controller.run(typeOverCells(event.key));
}

/**
 * The keys of the tables of a canvas that need their layout: the arrows between the rows of a table and into one from
 * the blocks around it, and a key typed over a cell range.
 */
export function useTableKeys(controller: ViewController, editable: boolean): void {
  useEffect(() => {
    if (!editable) return;
    const intercept: KeyInterceptor = (event) => {
      if (isComposingKey(controller, event)) return false;
      const handled = typeOver(controller, event) || moveBetweenRows(controller, event) || enterTable(controller, event);
      if (handled) event.preventDefault();
      return handled;
    };
    return interceptKeys(controller, intercept);
  }, [controller, editable]);
}
