'use client';

import { defineExtension, type Extension } from '../../engine';
import { cellSelectionPlugin } from '../../engine/state/cell-selection';
import type { BlockRenderProps, ViewController } from '../../view';
import type { ExtensionUI } from '../ui-types';
import { TableBlock } from './TableBlock';
import { TableControls } from './TableControls';
import { pasteOverCells } from './paste-over-cells';
import { tableKeymap } from './table-keys';
import { resolveTableLabels, type TableLabels } from './table-labels';
import { tableSlashItem } from './table-slash-item';

export type TableOptions = {
  /** Every string the feature shows or speaks, English by default. A key left out stays English. */
  labels?: Partial<TableLabels>;
};

// Above the core keys, so that Tab moves between cells instead of indenting the table.
const ABOVE_CORE_KEYS = 200;

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
