'use client';

import { useEffect } from 'react';
import type { ViewController } from '../../view';
import { moveSelectionOutOfAtoms } from './selection-out-of-atoms';

/**
 * While the canvas is editable and holds focus, keeps the ends of the browser's selection out of the atoms of one of
 * `types`: Chromium ends a drag past an atom, or a Shift+click on one, inside it, where the next key types nothing.
 */
export function useSelectionOutOfAtoms(controller: ViewController, types: readonly string[], editable: boolean): void {
  useEffect(() => {
    const root = controller.root;
    const view = root?.ownerDocument.defaultView;
    if (!editable || root === null || !view) return;
    const onChange = () => {
      const selection = view.getSelection();
      if (selection === null || controller.composingKey !== null) return;
      if (root.contains(root.ownerDocument.activeElement)) moveSelectionOutOfAtoms(selection, root, types);
    };
    // Captured on the window, it runs before the view's own listener on the document reads the selection.
    view.addEventListener('selectionchange', onChange, true);
    return () => view.removeEventListener('selectionchange', onChange, true);
  }, [controller, types, editable]);
}
