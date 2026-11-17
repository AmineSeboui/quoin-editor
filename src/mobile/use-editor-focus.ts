import { useCallback, useSyncExternalStore } from 'react';
import { focusInEditor } from '../toolbar/bubble-part';
import type { ViewController } from '../view';
import { listen } from '../view/dom/listen';

const subscribe = (notify: () => void) => listen(document, { focusin: notify, focusout: notify, selectionchange: notify });

const NOT_FOCUSED = () => false;

function selectionIn(controller: ViewController): boolean {
  const selection = controller.domSelection();
  const { root } = controller;
  return !!selection && !!root?.contains(selection.anchorNode) && root.contains(selection.focusNode);
}

/**
 * Whether focus is in the editor or on its toolbars, or with `orSelection`, the page's selection is in the canvas: a
 * long press on a phone selects the text of a read-only canvas without focusing it.
 */
export function useEditorFocus(controller: ViewController, orSelection = false): boolean {
  const read = useCallback(
    () => focusInEditor(controller) || (orSelection && selectionIn(controller)),
    [controller, orSelection],
  );
  return useSyncExternalStore(subscribe, read, NOT_FOCUSED);
}
