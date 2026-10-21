'use client';

import { useEffect } from 'react';
import type { ViewController } from '../../view';
import { moveSelectionOutOfAtoms } from './selection-out-of-atoms';

/**
 * While the canvas is editable and holds focus, keeps the ends of the browser's selection out of the atoms of one of
 * `types`: a click inside an atom, and in Chromium a drag past one or a Shift+click on one, leave them inside it,
 * where the next key types nothing.
 */
export function useSelectionOutOfAtoms(controller: ViewController, types: readonly string[], editable: boolean): void {
  useEffect(() => {
    const root = controller.root;
    const view = root?.ownerDocument.defaultView;
    if (!editable || root === null || !view) return;
    const hostOf = (node: Node) => controller.registry.locate(node)?.element ?? null;
    const moveOut = () => {
      const selection = view.getSelection();
      if (selection === null || controller.composingKey !== null) return;
      if (root.contains(root.ownerDocument.activeElement)) moveSelectionOutOfAtoms(selection, hostOf, types);
    };
    // Both run before the view's own listeners read the selection: the window's capture of selectionchange before the
    // document's, and the root's capture of keydown before its bubble, for a key that comes ahead of the selectionchange
    // of the click before it, as it can in Chromium.
    view.addEventListener('selectionchange', moveOut, true);
    root.addEventListener('keydown', moveOut, true);
    return () => {
      view.removeEventListener('selectionchange', moveOut, true);
      root.removeEventListener('keydown', moveOut, true);
    };
  }, [controller, types, editable]);
}
