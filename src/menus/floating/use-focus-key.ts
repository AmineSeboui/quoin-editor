import type { ViewController } from '../../view';
import { listen } from '../../view/dom/listen';
import { interceptKeys } from '../../view/input/intercept-keys';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';

const isFocusKey = (event: KeyboardEvent) =>
  event.key === 'F10' && event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;

/**
 * Alt+F10 from the editor moves focus into a toolbar, while the toolbar is drawn. A toolbar drawn on a read-only canvas
 * for items its reader can use says so with `whileReadOnly`: that canvas runs no key interceptor, since some of them
 * edit, so the key is heard from the document instead.
 */
export function useFocusKey(controller: ViewController, focus: () => void, whileReadOnly = false): void {
  useIsomorphicLayoutEffect(() => {
    const intercept = (event: KeyboardEvent) => {
      if (!isFocusKey(event)) return false;
      event.preventDefault();
      focus();
      return true;
    };
    if (!whileReadOnly) return interceptKeys(controller, intercept);
    return listen(document, {
      keydown: (event) => {
        if (controller.isEditorElement(event.target as Element)) intercept(event);
      },
    });
  }, [controller, focus, whileReadOnly]);
}
