import { useCallback, useSyncExternalStore } from 'react';
import type { ViewController } from '../view';

function subscribe(notify: () => void): () => void {
  document.addEventListener('selectionchange', notify);
  return () => document.removeEventListener('selectionchange', notify);
}

const NOTHING_SELECTED = () => false;

/**
 * Whether the page's selection is a range inside the canvas, wherever focus is: a long press on a phone selects the
 * text of a read-only canvas without focusing it.
 */
export function useTextSelected(controller: ViewController): boolean {
  const read = useCallback(() => {
    const selection = controller.domSelection();
    const { root } = controller;
    if (root === null || selection === null || selection.isCollapsed) return false;
    return root.contains(selection.anchorNode) && root.contains(selection.focusNode);
  }, [controller]);
  return useSyncExternalStore(subscribe, read, NOTHING_SELECTED);
}
