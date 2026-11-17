import type { ViewController } from '../../view';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import { interceptKeys } from '../../view/input/intercept-keys';
import { listenReaderKeys } from '../../view/input/reader-keys';

const isFocusKey = (event: KeyboardEvent) =>
  event.key === 'F10' && event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;

/**
 * Alt+F10 from the editor moves focus into a toolbar, while the toolbar is drawn. On a read-only canvas it does so only
 * for a toolbar drawn `whileReadOnly`, one holding items its reader can use.
 */
export function useFocusKey(controller: ViewController, focus: () => void, whileReadOnly = false): void {
  useIsomorphicLayoutEffect(() => {
    const intercept = (event: KeyboardEvent) => {
      if (!isFocusKey(event)) return false;
      event.preventDefault();
      focus();
      return true;
    };
    const stopEditor = interceptKeys(controller, intercept);
    if (!whileReadOnly) return stopEditor;
    const stopReader = listenReaderKeys(controller, intercept);
    return () => {
      stopEditor();
      stopReader();
    };
  }, [controller, focus, whileReadOnly]);
}
