'use client';

import { memo, useCallback } from 'react';
import type { EditorState } from '../../engine';
import { cellKey } from '../../engine/blocks/table-spec';
import type { ColumnAlign } from '../../engine/commands/table-shape';
import { cellSelection, rangeHasCell } from '../../engine/state/cell-selection';
import { EditableRegion, type ViewController } from '../../view';
import { useEditorState } from '../../view/react/use-editor-state';

type TableCellProps = {
  controller: ViewController;
  blockId: string;
  row: number;
  col: number;
  header: boolean;
  align: ColumnAlign | null;
  label: string;
};

/** One cell: a column header in a header row, a data cell otherwise, with its text typed in place. */
export const TableCell = memo(function TableCell({ controller, blockId, row, col, header, align, label }: TableCellProps) {
  const inRange = useEditorState(
    controller,
    useCallback(
      (state: EditorState) => {
        const range = cellSelection(state);
        return range?.block === blockId && rangeHasCell(range, [row, col]);
      },
      [blockId, row, col],
    ),
  );
  const Cell = header ? 'th' : 'td';
  return (
    <Cell
      scope={header ? 'col' : undefined}
      data-row={row}
      data-col={col}
      data-in-range={inRange ? '' : undefined}
      style={align === null ? undefined : { textAlign: align }}
    >
      <EditableRegion block={blockId} region={cellKey(row, col)} label={label} className="quoin-table-text" />
    </Cell>
  );
});
