'use client';

import { useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { Plus } from 'lucide-react';
import type { Command, EngineBlock } from '../../engine';
import { addColumn, addRow, setColumnAlign, toggleHeaderRow } from '../../engine/commands/table-commands';
import { columnAligns, tableShape } from '../../engine/commands/table-shape';
import { MenuIcon } from '../../gutter/MenuIcon';
import { keepFocus } from '../../menus/floating/keep-focus';
import {
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from '../../ui/dropdown-menu';
import type { ViewController } from '../../view';
import { isComposingKey } from '../../view/input/keydown';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import { ColumnResizer } from './ColumnResizer';
import { HandleMenu } from './HandleMenu';
import type { TableGeometry, Span } from './table-geometry';
import type { TableLabels } from './table-labels';
import { alignItems, columnMenuItems, rowMenuItems } from './table-menu-items';
import type { TableTarget } from './use-table-target';

export type OpenMenu = 'row' | 'column' | null;

export type TableHandlesProps = {
  controller: ViewController;
  labels: TableLabels;
  block: EngineBlock;
  target: TableTarget;
  geometry: TableGeometry;
  menu: OpenMenu;
  onMenu(menu: OpenMenu): void;
  onHold(held: boolean): void;
  /** Set when Alt+F10 asked for the handles, which take focus once drawn. */
  focusRequested: boolean;
  onFocused(): void;
};

// The controls of the rows sit just before the table's left border, clear of the text of its first column.
const BESIDE = 4;

const end = (span: Span) => span.start + span.size;

/** Where the edge before the span at `edge` is drawn, the edge after the last one at their count, if the table has it. */
function edgeOf(spans: readonly Span[], edge: number | null): number | null {
  if (edge === null || !Number.isInteger(edge) || edge < 0 || edge > spans.length || spans.length === 0) return null;
  return edge === spans.length ? end(spans[edge - 1]) : spans[edge].start;
}
const middle = (span: Span) => span.start + span.size / 2;

const isTab = (event: KeyboardEvent) => event.key === 'Tab' && !event.altKey && !event.ctrlKey && !event.metaKey;

/**
 * The border of every column, which resizes it, the handles of the row and the column the target names, as one
 * toolbar, and the insert button of the edge it names, drawn over the border it may sit on. The arrows move between
 * the two handles, Tab goes on to the column's border, and Escape or Shift+Tab go back to the caret.
 */
export function TableHandles(props: TableHandlesProps) {
  const { controller, labels, block, target, geometry, menu, onMenu, onHold, focusRequested, onFocused } = props;
  const rowHandle = useRef<HTMLButtonElement>(null);
  const columnHandle = useRef<HTMLButtonElement>(null);
  const resizer = useRef<HTMLDivElement>(null);
  const shape = tableShape(block);
  const row = Math.min(target.row, shape.rows - 1);
  const col = Math.min(target.col, shape.cols - 1);
  const align = columnAligns(block, shape.cols)[col];
  const drawn = geometry.cols.map((span) => span.size);
  const { rowEdge, colEdge } = target;
  const rowInsertAt = edgeOf(geometry.rows, rowEdge);
  const columnInsertAt = edgeOf(geometry.cols, colEdge);

  useIsomorphicLayoutEffect(() => {
    if (!focusRequested) return;
    (columnHandle.current ?? rowHandle.current)?.focus();
    onFocused();
  }, [focusRequested, onFocused]);

  const run = (command: Command, done: string) => {
    if (controller.run(command)) controller.announce(done);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const handles = [rowHandle.current, columnHandle.current].filter((handle) => handle !== null);
    const index = handles.indexOf(event.target as HTMLButtonElement);
    if (index === -1 || isComposingKey(controller, event.nativeEvent)) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') handles[(index + 1) % handles.length].focus();
    else if (isTab(event) && !event.shiftKey && resizer.current !== null) resizer.current.focus();
    else if (isTab(event) || event.key === 'Escape') controller.focus();
    else return;
    event.preventDefault();
  };
  const place = (left: number, top: number): CSSProperties => ({ left, top });
  const opener = (kind: 'row' | 'column') => (open: boolean) => onMenu(open ? kind : null);

  return (
    <>
      {geometry.cols.map((span, index) => (
        <ColumnResizer
          key={index}
          controller={controller}
          labels={labels}
          blockId={block.id}
          col={index}
          drawn={drawn}
          style={{ left: end(span), top: geometry.top, height: geometry.height }}
          resizerRef={index === col ? resizer : undefined}
          onHold={onHold}
          onBack={() => (columnHandle.current ?? rowHandle.current)?.focus()}
        />
      ))}
      <div role="toolbar" aria-label={labels.tableControls} className="quoin-table-toolbar" onKeyDown={onKeyDown}>
        {rowInsertAt === null && geometry.rows[row] && (
          <HandleMenu
            controller={controller}
            axis="row"
            label={labels.rowOptions(row + 1)}
            style={place(geometry.left - BESIDE, middle(geometry.rows[row]))}
            items={rowMenuItems(labels, block.id, row, shape)}
            open={menu === 'row'}
            onOpenChange={opener('row')}
            buttonRef={rowHandle}
          >
            {row === 0 && (
              <DropdownMenuCheckboxItem
                checked={block.attrs.header !== false}
                onCheckedChange={(on) => run(toggleHeaderRow(block.id), on ? labels.headerRowOn : labels.headerRowOff)}
              >
                {labels.headerRow}
              </DropdownMenuCheckboxItem>
            )}
          </HandleMenu>
        )}
        {columnInsertAt === null && geometry.cols[col] && (
          <HandleMenu
            controller={controller}
            axis="column"
            label={labels.columnOptions(col + 1)}
            style={place(middle(geometry.cols[col]), geometry.top)}
            items={columnMenuItems(labels, block.id, col, shape)}
            open={menu === 'column'}
            onOpenChange={opener('column')}
            buttonRef={columnHandle}
          >
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={align ?? ''}>
              {alignItems(labels).map(({ value, label, icon, done }) => (
                <DropdownMenuRadioItem
                  key={value}
                  value={value}
                  onSelect={() =>
                    align === value
                      ? run(setColumnAlign(block.id, col, null), labels.alignmentCleared)
                      : run(setColumnAlign(block.id, col, value), done)
                  }
                >
                  <MenuIcon icon={icon} />
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </HandleMenu>
        )}
      </div>
      {rowEdge !== null && rowInsertAt !== null && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={labels.insertRowAt(rowEdge + 1)}
          data-axis="row"
          className="quoin-table-insert"
          style={place(geometry.left - BESIDE, rowInsertAt)}
          onPointerDown={keepFocus}
          onMouseDown={keepFocus}
          onClick={() => run(addRow(block.id, rowEdge), labels.rowInserted)}
        >
          <Plus aria-hidden="true" />
        </button>
      )}
      {colEdge !== null && columnInsertAt !== null && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={labels.insertColumnAt(colEdge + 1)}
          data-axis="column"
          className="quoin-table-insert"
          style={place(columnInsertAt, geometry.top)}
          onPointerDown={keepFocus}
          onMouseDown={keepFocus}
          onClick={() => run(addColumn(block.id, colEdge), labels.columnInserted)}
        >
          <Plus aria-hidden="true" />
        </button>
      )}
    </>
  );
}
