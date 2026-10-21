import { useEffect } from 'react';
import type { ViewController } from '../../view';
import { useReadOnly } from '../../view/react/use-read-only';

export const FOCUS_MODE_ATTRIBUTE = 'data-quoin-focus-mode';

/** Marks the canvas as in focus mode while it is editable; its stylesheet dims only while the canvas holds focus. */
export function useFocusMode(controller: ViewController, enabled: boolean): void {
  const readOnly = useReadOnly(controller);
  useEffect(() => {
    const { root } = controller;
    if (!enabled || readOnly || root === null) return undefined;
    root.setAttribute(FOCUS_MODE_ATTRIBUTE, '');
    return () => root.removeAttribute(FOCUS_MODE_ATTRIBUTE);
  }, [controller, enabled, readOnly]);
}
