'use client';

import { useEffect, type RefObject } from 'react';
import { blockById } from '../../engine/model/doc';
import type { ViewController } from '../../view';
import { cellPos } from './table-keys';

function cellOf(element: Element): [number, number] | null {
  const row = element.getAttribute('data-row');
  const col = element.getAttribute('data-col');
  return element.matches('td, th') && row !== null && col !== null ? [Number(row), Number(col)] : null;
}

/**
 * A press on a cell outside its text, in its padding or below a shorter text, puts the caret at the end of that text
 * instead of starting a selection of the whole table.
 */
export function useCellPress(
  controller: ViewController,
  blockId: string,
  table: RefObject<HTMLElement | null>,
  editable: boolean,
): void {
  useEffect(() => {
    const element = table.current;
    if (!editable || element === null) return;
    const onPointerDown = (event: PointerEvent) => {
      const cell = event.button === 0 && event.pointerType !== 'touch' ? cellOf(event.target as Element) : null;
      const block = cell && blockById(controller.editor.state.doc, blockId);
      if (!cell || !block) return;
      event.preventDefault();
      event.stopPropagation();
      controller.focus(cellPos(block, cell, true));
    };
    element.addEventListener('pointerdown', onPointerDown);
    return () => element.removeEventListener('pointerdown', onPointerDown);
  }, [controller, blockId, table, editable]);
}
