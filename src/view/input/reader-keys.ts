import type { ViewController } from '../controller/view-controller';
import { isComposingKey, type KeyInterceptor } from './keydown';

/**
 * Hands the keys pressed in the text of a read-only canvas to `take` until the returned cleanup runs, and holds a key
 * it takes from the browser. A read-only canvas runs none of the editor's interceptors, since some of them edit, so a
 * key that should work for a reader is asked for here.
 */
export function listenReaderKeys(controller: ViewController, take: KeyInterceptor): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    if (!controller.readOnly || event.defaultPrevented || isComposingKey(controller, event)) return;
    if (event.target instanceof Element && controller.isEditorElement(event.target) && take(event)) {
      event.preventDefault();
    }
  };
  document.addEventListener('keydown', onKeyDown);
  return () => document.removeEventListener('keydown', onKeyDown);
}
