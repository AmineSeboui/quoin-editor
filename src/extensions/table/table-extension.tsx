'use client';

import { defineExtension, type Extension, type PasteRule } from '../../engine';
import { typeOverCells } from '../../engine/commands/cell-commands';
import { cellSelection, cellSelectionPlugin } from '../../engine/state/cell-selection';
import type { BlockRenderProps, ViewController } from '../../view';
import type { ExtensionUI } from '../ui-types';
import { TableBlock } from './TableBlock';
import { TableControls } from './TableControls';
import { tableKeymap } from './table-keys';
import { resolveTableLabels, type TableLabels } from './table-labels';
import { tableSlashItem } from './table-slash-item';

export type TableOptions = {
  /** Every string the feature shows or speaks, English by default. A key left out stays English. */
  labels?: Partial<TableLabels>;
};

// Above the core keys, so that Tab moves between cells instead of indenting the table.
const ABOVE_CORE_KEYS = 200;

// Text pasted over a cell range replaces the range, in its first cell, rather than the cells in reading order.
const pasteOverCells: PasteRule = {
  name: 'table-cells',
  match: (text, state) => (cellSelection(state) === null ? null : typeOverCells(text.replace(/\r\n?/g, '\n'))),
};

/**
 * Tables: the TABLE block typed in place, with a slash command that inserts one, keys that move between cells, handles
 * whose menus insert, move and delete rows and columns, column borders that resize, and cell ranges selected by a drag.
 */
export function tableExtension(options: TableOptions = {}): Extension {
  const labels = resolveTableLabels(options.labels);
  const TableRenderer = (props: BlockRenderProps) => <TableBlock {...props} labels={labels} />;
  const TableOverlay = ({ controller }: { controller: ViewController }) => (
    <TableControls controller={controller} labels={labels} />
  );
  const ui: ExtensionUI = {
    slashItems: [tableSlashItem(labels)],
    renderers: { TABLE: TableRenderer },
    blockNames: { TABLE: labels.table },
    overlays: [TableOverlay],
  };
  return defineExtension({
    name: 'table',
    priority: ABOVE_CORE_KEYS,
    plugins: [cellSelectionPlugin],
    keymap: tableKeymap,
    pasteRules: [pasteOverCells],
    ui,
  });
}
