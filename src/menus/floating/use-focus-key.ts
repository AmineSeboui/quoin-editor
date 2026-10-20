import type { ViewController } from '../../view';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';

const isFocusKey = (event: KeyboardEvent) =>
  event.key === 'F10' && event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;

/** Alt+F10 from the editor moves focus into a toolbar, while the toolbar is drawn. */
export function useFocusKey(controller: ViewController, focus: () => void): void {
  useIsomorphicLayoutEffect(() => {
    const intercept = (event: KeyboardEvent) => {
      if (!isFocusKey(event)) return false;
      event.preventDefault();
      focus();
      return true;
    };
    controller.keyInterceptors.add(intercept);
    return () => void controller.keyInterceptors.delete(intercept);
  }, [controller, focus]);
}
