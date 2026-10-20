'use client';

import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent, type Ref } from 'react';
import { setColumnWidth } from '../../engine/commands/table-commands';
import type { ViewController } from '../../view';
import { isComposingKey } from '../../view/input/keydown';
import { NATIVE_INTERACTION } from '../../view/selection/native-interaction';
import type { TableLabels } from './table-labels';
import { tableUiStore } from './table-ui-store';

export const MIN_COLUMN_WIDTH = 48;
export const MAX_COLUMN_WIDTH = 1200;
const STEP = 10;
const LARGE_STEP = 50;

const clampWidth = (px: number) => Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, Math.round(px)));

type Drag = { readonly x: number; readonly widths: readonly number[]; to: number | null };

type ColumnResizerProps = {
  controller: ViewController;
  labels: TableLabels;
  blockId: string;
  col: number;
  /** The widths the columns are drawn at. */
  drawn: readonly number[];
  style: CSSProperties;
  resizerRef?: Ref<HTMLDivElement>;
  /** Called with true while a drag holds the controls on this table, and with false once it ends. */
  onHold(held: boolean): void;
  /** Shift+Tab goes back to the handle of the column. */
  onBack(): void;
};

/**
 * The border after a column, which a drag or the arrows move. A drag shows the width it reaches and writes it once, as
 * one step of history, when it ends.
 */
export function ColumnResizer(props: ColumnResizerProps) {
  const { controller, labels, blockId, col, drawn, style, resizerRef, onHold, onBack } = props;
  const drag = useRef<Drag | null>(null);
  const width = Math.round(drawn[col] ?? 0);
  const store = tableUiStore(controller);
  const write = (px: number, widths: readonly number[]) => {
    if (!controller.readOnly) controller.run(setColumnWidth(blockId, col, px, widths));
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (isComposingKey(controller, event.nativeEvent)) return;
    const step = event.shiftKey ? LARGE_STEP : STEP;
    const tab = event.key === 'Tab' && !event.altKey && !event.ctrlKey && !event.metaKey;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const next = clampWidth(width + (event.key === 'ArrowLeft' ? -step : step));
      if (next !== width) write(next, drawn);
    } else if (tab && event.shiftKey) onBack();
    else if (tab || event.key === 'Escape') controller.focus();
    else return;
    event.preventDefault();
  };
  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { x: event.clientX, widths: [...drawn], to: null };
    onHold(true);
  };
  const onPointerMove = (event: PointerEvent) => {
    const current = drag.current;
    if (current === null) return;
    current.to = clampWidth(current.widths[col] + event.clientX - current.x);
    const widths = current.widths.map((px, i) => (i === col ? (current.to ?? px) : px));
    store.set({ preview: { block: blockId, widths } });
  };
  const stop = () => {
    const current = drag.current;
    drag.current = null;
    store.set({ preview: null });
    onHold(false);
    return current;
  };
  useEffect(
    () => () => {
      if (drag.current !== null) store.set({ preview: null });
    },
    [store],
  );

  const end = () => {
    const ended = stop();
    if (ended?.to != null && ended.to !== Math.round(ended.widths[col])) write(ended.to, ended.widths);
  };

  return (
    <div
      ref={resizerRef}
      role="separator"
      tabIndex={-1}
      aria-orientation="vertical"
      aria-label={labels.resizeColumn(col + 1)}
      aria-valuenow={width}
      aria-valuemin={MIN_COLUMN_WIDTH}
      aria-valuemax={MAX_COLUMN_WIDTH}
      aria-valuetext={labels.columnWidth(width)}
      className="quoin-table-resizer"
      style={style}
      {...{ [NATIVE_INTERACTION]: '' }}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={stop}
    />
  );
}
