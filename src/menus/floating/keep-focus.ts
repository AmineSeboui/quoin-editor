import type { MouseEvent, PointerEvent } from 'react';

/**
 * Keeps focus, and so the selection, in the text when a floating control is pressed. A touch moves focus only through
 * the mouse events that follow it, and WebKit drops the click of a tap whose pointerdown was cancelled, so a touch is
 * held at mousedown instead. Handle both `onPointerDown` and `onMouseDown`.
 */
export function keepFocus(event: PointerEvent | MouseEvent): void {
  if (!('pointerType' in event) || event.pointerType !== 'touch') event.preventDefault();
}
