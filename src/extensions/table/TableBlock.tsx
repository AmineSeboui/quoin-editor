'use client';

import { useRef } from 'react';
import { columnAligns, storedWidths, tableShape } from '../../engine/commands/table-shape';
import { FOCUS_RING } from '../../ui/focus';
import type { BlockRenderProps } from '../../view';
import { useReadOnly } from '../../view/react/use-read-only';
import { CONTROLS_SLOT } from './controls-slot';
import { TableCell } from './TableCell';
import type { TableLabels } from './table-labels';
import { useWidthPreview } from './table-ui-store';
import { useCellPress } from './use-cell-press';
import { useRevealCell } from './use-reveal-cell';
import { useTableKeys } from './use-table-keys';

const indexes = (from: number, to: number) => Array.from({ length: Math.max(to - from, 0) }, (_, i) => from + i);

type TableBlockProps = BlockRenderProps & { labels: TableLabels };

/**
 * A table as a native table: a header row of column headers when the block has one, then its rows, every cell typed in
 * place. It scrolls sideways inside its block when it is wider than the line, and keeps the widths its columns were
 * given, or else fits them to their text.
 */
export function TableBlock({ block, controller, labels }: TableBlockProps) {
  const readOnly = useReadOnly(controller);
  const table = useRef<HTMLTableElement>(null);
  const { rows, cols } = tableShape(block);
  const header = block.attrs.header !== false && rows > 0;
  const aligns = columnAligns(block, cols);
  const preview = useWidthPreview(controller, block.id);
  const widths = preview?.length === cols ? preview : storedWidths(block, cols);
  useTableKeys(controller, block.id, !readOnly);
  useCellPress(controller, block.id, table, !readOnly);
  useRevealCell(controller, block.id);

  const row = (index: number) => (
    <tr key={index}>
      {indexes(0, cols).map((col) => (
        <TableCell
          key={col}
          controller={controller}
          blockId={block.id}
          row={index}
          col={col}
          header={header && index === 0}
          align={aligns[col]}
          label={labels.cell(index + 1, col + 1)}
        />
      ))}
    </tr>
  );
  const scroller = readOnly ? { role: 'region', 'aria-label': labels.table, tabIndex: 0 } : undefined;

  return (
    <div contentEditable={false} className="quoin-table" data-readonly={readOnly ? '' : undefined}>
      <div className={`quoin-table-scroll ${readOnly ? FOCUS_RING : ''}`} {...scroller}>
        <table
          ref={table}
          aria-label={readOnly ? undefined : labels.table}
          style={widths === null ? undefined : { width: widths.reduce((sum, width) => sum + width, 0), tableLayout: 'fixed' }}
        >
          {widths !== null && (
            <colgroup>
              {widths.map((width, col) => (
                <col key={col} style={{ width }} />
              ))}
            </colgroup>
          )}
          {header && <thead>{row(0)}</thead>}
          {rows > (header ? 1 : 0) && <tbody>{indexes(header ? 1 : 0, rows).map(row)}</tbody>}
        </table>
        {!readOnly && <div className="quoin-table-controls" {...{ [CONTROLS_SLOT]: '' }} />}
      </div>
    </div>
  );
}
