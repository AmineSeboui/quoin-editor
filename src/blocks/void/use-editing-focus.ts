'use client';

import { useEffect, useMemo, useRef, type RefObject, type SyntheticEvent } from 'react';
import { listen } from '../../view/dom/listen';

const FOCUSABLE = [
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  'button:not([disabled])',
  'a[href]',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const CANVAS = '.quoin-editor';

export type EditingFocusHandlers = {
  onPointerDownCapture(event: SyntheticEvent): void;
  onFocusCapture(event: SyntheticEvent): void;
};

/**
 * Focuses the editor when editing starts and ends editing when a press or focus goes anywhere but the block. Returns
 * the handlers its root takes to tell the two apart.
 */
export function useEditingFocus(
  root: RefObject<HTMLElement | null>,
  editing: boolean,
  stop: () => void,
): EditingFocusHandlers {
  const inside = useRef(new WeakSet<Event>());

  // An overlay the editor opens is portalled out of the block's DOM but stays in its React tree, whose handlers React
  // runs from its root and portal containers, below the document. So the document hears a press or a focus after the
  // block's root marked it as its own. A press on the rest of the canvas leaves before the canvas sees it, since the
  // canvas places the caret itself once the press has moved focus. Focus that goes nowhere, as when the window loses it
  // or a focused control is disabled mid-upload, fires no focusin and has not left.
  useEffect(() => {
    const element = root.current;
    if (!editing || element === null) return;
    (element.querySelector<HTMLElement>(FOCUSABLE) ?? element).focus();
    const doc = element.ownerDocument;
    const canvas = element.closest(CANVAS);
    const leaveForCanvas = (event: Event) => {
      const target = event.target as Node;
      if (!element.contains(target) && canvas?.contains(target)) stop();
    };
    const leaveUnlessInside = (event: Event) => {
      if (!inside.current.has(event)) stop();
    };
    const unlistenCapture = listen(doc, { pointerdown: leaveForCanvas }, true);
    const unlisten = listen(doc, { pointerdown: leaveUnlessInside, focusin: leaveUnlessInside });
    return () => {
      unlistenCapture();
      unlisten();
    };
  }, [root, editing, stop]);

  return useMemo(() => {
    const mark = (event: SyntheticEvent) => void inside.current.add(event.nativeEvent);
    return { onPointerDownCapture: mark, onFocusCapture: mark };
  }, []);
}
