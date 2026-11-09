import type { ComponentType } from 'react';
import type { InlineDirection } from '../../ui/direction';
import type { Command } from '../../engine';
import {
  addColumn,
  addRow,
  moveColumn,
  moveRow,
  removeColumn,
  removeRow,
} from '../../engine/commands/table-commands';
import type { ColumnAlign, TableShape } from '../../engine/commands/table-shape';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowDownToLine,
  ArrowLeft,
  ArrowLeftToLine,
  ArrowRight,
  ArrowRightToLine,
  ArrowUp,
  ArrowUpToLine,
  Trash,
} from '../../icons';
import type { TableLabels } from './table-labels';

type Icon = ComponentType<{ className?: string }>;

export type TableMenuItem = {
  readonly id: string;
  readonly label: string;
  readonly icon: Icon;
  readonly command: Command;
  /** What is announced once the item has run. */
  readonly done: string;
  readonly disabled?: boolean;
  readonly destructive?: boolean;
};

const item = (
  id: string,
  label: string,
  icon: Icon,
  command: Command,
  done: string,
  options: { disabled?: boolean; destructive?: boolean } = {},
): TableMenuItem => ({ id, label, icon, command, done, ...options });

export function rowMenuItems(labels: TableLabels, blockId: string, row: number, { rows }: TableShape): TableMenuItem[] {
  const { rowInserted, rowMoved, rowDeleted } = labels;
  return [
    item('above', labels.insertRowAbove, ArrowUpToLine, addRow(blockId, row), rowInserted),
    item('below', labels.insertRowBelow, ArrowDownToLine, addRow(blockId, row + 1), rowInserted),
    item('up', labels.moveRowUp, ArrowUp, moveRow(blockId, row, row - 1), rowMoved, { disabled: row === 0 }),
    item('down', labels.moveRowDown, ArrowDown, moveRow(blockId, row, row + 1), rowMoved, { disabled: row === rows - 1 }),
    item('delete', labels.deleteRow, Trash, removeRow(blockId, row), rowDeleted, { disabled: rows === 1, destructive: true }),
  ];
}

/**
 * The menu names sides of the screen, and the wording stays physical wherever the page runs. Where it runs right to
 * left the columns are drawn the other way round, so the column on the left of this one is the one *after* it in the
 * document: the indices turn round, and so do the edges a move stops at, while the labels and the icons do not.
 */
export function columnMenuItems(
  labels: TableLabels,
  blockId: string,
  col: number,
  { cols }: TableShape,
  direction: InlineDirection = 'ltr',
): TableMenuItem[] {
  const { columnInserted, columnMoved, columnDeleted } = labels;
  const onTheRight = direction === 'rtl' ? col - 1 : col + 1;
  const onTheLeft = direction === 'rtl' ? col + 1 : col - 1;
  const first = col === 0;
  const last = col === cols - 1;
  const [leftEdge, rightEdge] = direction === 'rtl' ? [last, first] : [first, last];
  return [
    item('left', labels.insertColumnLeft, ArrowLeftToLine, addColumn(blockId, direction === 'rtl' ? col + 1 : col), columnInserted),
    item('right', labels.insertColumnRight, ArrowRightToLine, addColumn(blockId, direction === 'rtl' ? col : col + 1), columnInserted),
    item('move-left', labels.moveColumnLeft, ArrowLeft, moveColumn(blockId, col, onTheLeft), columnMoved, { disabled: leftEdge }),
    item('move-right', labels.moveColumnRight, ArrowRight, moveColumn(blockId, col, onTheRight), columnMoved, { disabled: rightEdge }),
    item('delete', labels.deleteColumn, Trash, removeColumn(blockId, col), columnDeleted, {
      disabled: cols === 1,
      destructive: true,
    }),
  ];
}

export type AlignItem = {
  readonly value: ColumnAlign;
  readonly label: string;
  readonly icon: Icon;
  /** What is announced once the column takes the alignment. */
  readonly done: string;
};

export const alignItems = (labels: TableLabels): AlignItem[] => [
  { value: 'left', label: labels.alignLeft, icon: AlignLeft, done: labels.alignedLeft },
  { value: 'center', label: labels.alignCenter, icon: AlignCenter, done: labels.alignedCenter },
  { value: 'right', label: labels.alignRight, icon: AlignRight, done: labels.alignedRight },
];
