'use client';

import { useCallback, useEffect, type FocusEvent, type RefObject } from 'react';

const FOCUSABLE = [
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  'button:not([disabled])',
  'a[href]',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

// Radix renders menus, selects and dialogs in a portal, so focus or a press inside one leaves the block's DOM while the
// author is still editing it.
const PORTALLED_OVERLAY = '[data-radix-popper-content-wrapper], [role="dialog"]';

function within(root: HTMLElement, target: EventTarget | null): boolean {
  if (!(target instanceof Node)) return false;
  return root.contains(target) || (target instanceof Element && target.closest(PORTALLED_OVERLAY) !== null);
}

/** Focuses the editor when editing starts and ends editing when a press or focus leaves the block. Returns its onBlur. */
export function useEditingFocus(
  root: RefObject<HTMLElement | null>,
  editing: boolean,
  stop: () => void,
): (event: FocusEvent) => void {
  useEffect(() => {
    const element = root.current;
    if (!editing || element === null) return;
    (element.querySelector<HTMLElement>(FOCUSABLE) ?? element).focus();
    const doc = element.ownerDocument;
    const onPointerDown = (event: PointerEvent) => {
      if (!within(element, event.target)) stop();
    };
    doc.addEventListener('pointerdown', onPointerDown, true);
    return () => doc.removeEventListener('pointerdown', onPointerDown, true);
  }, [root, editing, stop]);

  // Focus that goes nowhere, as when the window loses it or a focused control is disabled mid-upload, has not left.
  return useCallback(
    (event: FocusEvent) => {
      const element = root.current;
      if (editing && element !== null && event.relatedTarget !== null && !within(element, event.relatedTarget)) stop();
    },
    [root, editing, stop],
  );
}
