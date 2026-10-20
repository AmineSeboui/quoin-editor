'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EditorState } from '../../engine';
import { tableBlock, tableShape } from '../../engine/commands/table-shape';
import type { ViewController } from '../../view';
import { useEditorState } from '../../view/react/use-editor-state';
import { CONTROLS_SLOT } from './controls-slot';
import { edgeNear, measureTable, spanAt } from './table-geometry';
import { headCell } from './table-keys';

/** The table the controls are drawn for, the row and column they act on, and the edge an insert button sits on. */
export type TableTarget = {
  readonly block: string;
  readonly row: number;
  readonly col: number;
  readonly rowEdge: number | null;
  readonly colEdge: number | null;
};

// The insert buttons offer themselves along the left and top edges of a table, within this many pixels of the line
// between two rows or two columns.
const EDGE_ZONE = 24;
const EDGE_REACH = 8;
const VIEWPORT = { left: 0, top: 0 } as DOMRect;

const CONTROLS = `[${CONTROLS_SLOT}]`;

export const sameTarget = (a: TableTarget | null, b: TableTarget | null): boolean =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.block === b.block &&
    a.row === b.row &&
    a.col === b.col &&
    a.rowEdge === b.rowEdge &&
    a.colEdge === b.colEdge);

/** The cell holding the head of the selection, for the controls Alt+F10 reaches from it. */
export function caretTarget(state: EditorState): TableTarget | null {
  const caret = headCell(state);
  return caret && { block: caret.block.id, row: caret.cell[0], col: caret.cell[1], rowEdge: null, colEdge: null };
}

function pointerTarget(controller: ViewController, event: PointerEvent): TableTarget | null {
  const blockId = controller.blockAt(event.target as Node);
  const block = blockId === undefined ? null : tableBlock(controller.editor.state.doc, blockId);
  const table = block && controller.blockElement(block.id)?.querySelector('table');
  if (!block || !table) return null;
  const geometry = measureTable(table, VIEWPORT);
  const { clientX: x, clientY: y } = event;
  const row = spanAt(geometry.rows, y);
  const col = spanAt(geometry.cols, x);
  if (row < 0 || col < 0) return null;
  const rowEdge = x < geometry.left + EDGE_ZONE ? edgeNear(geometry.rows, y, EDGE_REACH) : null;
  const colEdge = y < geometry.top + EDGE_ZONE ? edgeNear(geometry.cols, x, EDGE_REACH) : null;
  return { block: block.id, row, col, rowEdge, colEdge };
}

type Focus = 'none' | 'editor' | 'controls';

// What the pointer was over, with the shape of its table then: an edge it rested on means nothing once rows or columns
// have come or gone under a pointer that has not moved since.
type Hover = { readonly target: TableTarget; readonly shape: string | null };

function shapeOf(state: EditorState, blockId: string): string | null {
  const block = tableBlock(state.doc, blockId);
  if (block === null) return null;
  const { rows, cols } = tableShape(block);
  return `${rows}x${cols}`;
}

function focusOf(root: HTMLElement): Focus {
  const active = root.ownerDocument.activeElement;
  if (active === null || !root.contains(active)) return 'none';
  return active.closest(CONTROLS) === null ? 'editor' : 'controls';
}

/**
 * The cell the controls are drawn for: the one a menu or a drag holds, else the one under a fine pointer, else the one
 * holding the caret while focus is in the editor. With focus in the controls, the caret's cell comes first, so moving
 * the pointer over another table never takes the controls from under the focus.
 */
export function useTableTarget(controller: ViewController, held: TableTarget | null): TableTarget | null {
  const [hovered, setHovered] = useState<Hover | null>(null);
  const [focus, setFocus] = useState<Focus>('none');
  const caret = useEditorState(controller, caretTarget, sameTarget);
  const hoveredBlock = hovered?.target.block ?? null;
  const shape = useEditorState(
    controller,
    useCallback((state: EditorState) => (hoveredBlock === null ? null : shapeOf(state, hoveredBlock)), [hoveredBlock]),
  );
  const pointed = hovered !== null && hovered.shape === shape ? hovered.target : null;

  useEffect(() => {
    const root = controller.root;
    if (root === null) return;
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const target = pointerTarget(controller, event);
      const next = target && { target, shape: shapeOf(controller.editor.state, target.block) };
      setHovered((current) =>
        current !== null && next !== null && sameTarget(current.target, next.target) && current.shape === next.shape
          ? current
          : next,
      );
    };
    const onPointerLeave = () => setHovered(null);
    const onFocusChange = () => setFocus(focusOf(root));
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as Element | null;
      setFocus(next !== null && root.contains(next) ? (next.closest(CONTROLS) ? 'controls' : 'editor') : 'none');
    };
    setFocus(focusOf(root));
    root.addEventListener('pointermove', onPointerMove);
    root.addEventListener('pointerleave', onPointerLeave);
    root.addEventListener('focusin', onFocusChange);
    root.addEventListener('focusout', onFocusOut);
    return () => {
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerleave', onPointerLeave);
      root.removeEventListener('focusin', onFocusChange);
      root.removeEventListener('focusout', onFocusOut);
    };
  }, [controller]);

  if (held !== null) return held;
  if (focus === 'controls') return caret ?? pointed;
  return pointed ?? (focus === 'editor' ? caret : null);
}
