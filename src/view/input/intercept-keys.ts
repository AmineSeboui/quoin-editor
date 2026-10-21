import type { ViewController } from '../controller/view-controller';
import type { KeyInterceptor } from './keydown';

/** Hands the editor's keys to `intercept` first, until the returned cleanup runs. */
export function interceptKeys(controller: ViewController, intercept: KeyInterceptor): () => void {
  controller.keyInterceptors.add(intercept);
  return () => void controller.keyInterceptors.delete(intercept);
}
