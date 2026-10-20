import type { ComponentType } from 'react';
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
} from 'lucide-react';
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

export function columnMenuItems(labels: TableLabels, blockId: string, col: number, { cols }: TableShape): TableMenuItem[] {
  const { columnInserted, columnMoved, columnDeleted } = labels;
  const last = col === cols - 1;
  return [
    item('left', labels.insertColumnLeft, ArrowLeftToLine, addColumn(blockId, col), columnInserted),
    item('right', labels.insertColumnRight, ArrowRightToLine, addColumn(blockId, col + 1), columnInserted),
    item('move-left', labels.moveColumnLeft, ArrowLeft, moveColumn(blockId, col, col - 1), columnMoved, { disabled: col === 0 }),
    item('move-right', labels.moveColumnRight, ArrowRight, moveColumn(blockId, col, col + 1), columnMoved, { disabled: last }),
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
