'use client';

import { useRef, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import { useLabels } from '../../i18n/use-labels';
import { bubblePart } from '../../menus/bubble/bubble-part';
import type { ViewController } from '../../view';
import { isComposingKey } from '../../view/input/keydown';
import { NATIVE_INTERACTION } from '../../view/selection/native-interaction';
import { setBlockAttrs } from '../text/set-block-attrs';
import { keyedWidth, MAX_WIDTH, MIN_WIDTH, snapWidth } from './resize-width';
import { useDrawnWidth } from './use-drawn-width';

type Drag = { x: number; width: number; block: number; grows: number; to: number | null };

type ResizeHandlesProps = {
  blockId: string;
  controller: ViewController;
  frame: RefObject<HTMLDivElement | null>;
  percent: number | undefined;
  centred: boolean;
  onPreview(percent: number | null): void;
};

/**
 * A width slider on each side of a picture. The arrows step the width, and a drag shows the width it reaches and writes
 * it once, as one step of history, when it ends. Focus on a slider keeps the toolbar of the image, as focus in it does.
 */
export function ResizeHandles({ blockId, controller, frame, percent, centred, onPreview }: ResizeHandlesProps) {
  const labels = useLabels();
  const drag = useRef<Drag | null>(null);
  const drawn = useDrawnWidth(frame, percent === undefined);
  const value = percent ?? drawn;
  const write = (widthPercent: number) => setBlockAttrs(controller, blockId, { widthPercent });

  const onKeyDown = (event: KeyboardEvent) => {
    if (isComposingKey(controller, event.nativeEvent)) return;
    const next = keyedWidth(event.key, value);
    if (event.key === 'Escape') controller.focus();
    else if (next === null) return;
    else if (next !== percent) write(next);
    event.preventDefault();
  };
  const onPointerDown = (side: -1 | 1) => (event: PointerEvent) => {
    const box = frame.current;
    const block = box?.parentElement?.clientWidth ?? 0;
    if (event.button !== 0 || box === null || block === 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { x: event.clientX, width: box.offsetWidth, block, grows: side * (centred ? 2 : 1), to: null };
  };
  const onPointerMove = (event: PointerEvent) => {
    const current = drag.current;
    if (current === null) return;
    current.to = snapWidth(((current.width + (event.clientX - current.x) * current.grows) / current.block) * 100);
    onPreview(current.to);
  };
  const stop = () => {
    const to = drag.current?.to ?? null;
    drag.current = null;
    onPreview(null);
    return to;
  };
  const end = () => {
    const to = stop();
    if (to !== null && to !== percent) write(to);
  };

  const handle = (side: -1 | 1) => (
    <div
      role="slider"
      tabIndex={-1}
      aria-label={side < 0 ? labels.resizeFromLeft : labels.resizeFromRight}
      aria-valuemin={MIN_WIDTH}
      aria-valuemax={MAX_WIDTH}
      aria-valuenow={value}
      aria-valuetext={labels.widthValue(value)}
      data-side={side}
      className="quoin-image-handle"
      {...{ [NATIVE_INTERACTION]: '' }}
      {...bubblePart(controller)}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown(side)}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={stop}
    />
  );
  return (
    <>
      {handle(-1)}
      {handle(1)}
    </>
  );
}
