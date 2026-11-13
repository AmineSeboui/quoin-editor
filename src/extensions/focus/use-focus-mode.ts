import { useEffect } from 'react';
import type { ViewController } from '../../view';
import { useReadOnly } from '../../view/react/use-read-only';
import { ownsNode, watchCanvasFocus } from '../canvas-focus';

export const FOCUS_MODE_ATTRIBUTE = 'data-quoin-focus-mode';
const FOCUSED_ATTRIBUTE = 'data-quoin-focused';

/**
 * Marks the canvas as in focus mode while it is editable, and as focused while focus is in it or in a menu it portals
 * out of it. Its stylesheet dims only while both hold, so opening a menu keeps the page as it was.
 */
export function useFocusMode(controller: ViewController, enabled: boolean): void {
  const readOnly = useReadOnly(controller);
  useEffect(() => {
    const { root } = controller;
    if (!enabled || readOnly || root === null) return undefined;
    const focused = (inside: boolean) => root.toggleAttribute(FOCUSED_ATTRIBUTE, inside);
    root.setAttribute(FOCUS_MODE_ATTRIBUTE, '');
    focused(ownsNode(controller, root.ownerDocument.activeElement));
    const stop = watchCanvasFocus(controller, root.ownerDocument, focused);
    return () => {
      stop();
      root.removeAttribute(FOCUS_MODE_ATTRIBUTE);
      root.removeAttribute(FOCUSED_ATTRIBUTE);
    };
  }, [controller, enabled, readOnly]);
}
