import { textSelection, type Pos } from '../../engine';
import { cellKey } from '../../engine/blocks/table-spec';
import { tableBlock, tableShape, type Cell } from '../../engine/commands/table-shape';
import { isCollapsed } from '../../engine/state/selection';
import type { ViewController } from '../../view';
import { domToPos, posToDom } from '../../view/controller/dom-selection';
import { caretFromPoint } from '../../view/navigation/caret-from-point';
import { caretClientRect, isOnFirstLine, isOnLastLine, lineEdgeRect } from '../../view/navigation/line-edges';
import { neighbourBlock } from '../../view/navigation/neighbour-block';
import { cellPos, headCell } from './table-keys';

const VERTICAL: Readonly<Record<string, -1 | 1>> = { ArrowUp: -1, ArrowDown: 1 };

// The goal column is kept on the controller as the view's own vertical moves keep it, so a run of arrows holds it.
function caretAtGoal(controller: ViewController, blockId: string, cell: Cell, direction: -1 | 1): Pos | null {
  const region = cellKey(...cell);
  const host = controller.registry.get(blockId, region);
  const { goalX } = controller;
  const line = host && lineEdgeRect(host, direction < 0);
  if (!host || !line || goalX === null) return null;
  const box = host.getBoundingClientRect();
  const x = Math.min(Math.max(goalX, box.left), box.right - 1);
  const point = caretFromPoint(host.ownerDocument, x, line.top + line.height / 2);
  const pos = point && domToPos(controller.registry, point.node, point.offset);
  return pos && pos.block === blockId && pos.region === region ? pos : null;
}

const plainArrow = (event: KeyboardEvent): -1 | 1 | undefined =>
  event.altKey || event.ctrlKey || event.metaKey ? undefined : VERTICAL[event.key];

/** The caret's left edge when it is on the first or the last line of its host, as the arrow leaves it, else nothing. */
function caretOnEdgeLine(controller: ViewController, head: Pos, direction: -1 | 1): { left: number | null } | null {
  const host = controller.registry.get(head.block, head.region);
  const point = posToDom(controller.registry, head);
  if (!host || !point || !(direction < 0 ? isOnFirstLine(host, point) : isOnLastLine(host, point))) return null;
  return { left: caretClientRect(point)?.left ?? null };
}

function columnAt(controller: ViewController, blockId: string, row: number, x: number): number {
  const cells = Array.from(controller.blockElement(blockId)?.querySelector('table')?.rows[row]?.cells ?? []);
  const index = cells.findIndex((cell) => x < cell.getBoundingClientRect().right);
  return index === -1 ? Math.max(cells.length - 1, 0) : index;
}

/**
 * ArrowDown from the last line of the block above a table, or ArrowUp from the first line of the block below it, goes
 * into its first or last row, in the column under the caret.
 */
export function enterTable(controller: ViewController, blockId: string, event: KeyboardEvent): boolean {
  const direction = plainArrow(event);
  const { state } = controller.editor;
  const { selection } = state;
  const block = tableBlock(state.doc, blockId);
  if (direction === undefined || event.shiftKey || block === null || selection?.kind !== 'text') return false;
  if (!isCollapsed(selection) || neighbourBlock(state.doc, selection.head.block, direction)?.id !== blockId) return false;
  const caret = caretOnEdgeLine(controller, selection.head, direction);
  if (caret === null) return false;
  controller.goalX ??= caret.left;
  const { rows, cols } = tableShape(block);
  const row = direction > 0 ? 0 : rows - 1;
  const { goalX } = controller;
  const cell: Cell = [row, goalX === null ? (direction > 0 ? 0 : cols - 1) : columnAt(controller, blockId, row, goalX)];
  const pos = caretAtGoal(controller, blockId, cell, direction) ?? cellPos(block, cell, direction < 0);
  controller.dispatch(controller.editor.createTransaction().setSelection(textSelection(pos)));
  return true;
}

/**
 * ArrowUp and ArrowDown from the first or last line of a cell go to the cell above or below, at the same column of
 * text, and with Shift extend the selection there. From the first or the last row they are left to the view, which
 * leaves the table.
 */
export function moveBetweenRows(controller: ViewController, blockId: string, event: KeyboardEvent): boolean {
  const direction = plainArrow(event);
  const { state } = controller.editor;
  const caret = headCell(state);
  if (direction === undefined || caret === null || caret.block.id !== blockId || state.selection?.kind !== 'text') {
    return false;
  }
  const target: Cell = [caret.cell[0] + direction, caret.cell[1]];
  if (target[0] < 0 || target[0] >= caret.shape.rows) return false;
  const edge = caretOnEdgeLine(controller, caret.head, direction);
  if (edge === null) return false;
  controller.goalX ??= edge.left;
  const pos = caretAtGoal(controller, blockId, target, direction) ?? cellPos(caret.block, target, direction < 0);
  const selection = event.shiftKey ? textSelection(state.selection.anchor, pos) : textSelection(pos);
  controller.dispatch(controller.editor.createTransaction().setSelection(selection));
  return true;
}
