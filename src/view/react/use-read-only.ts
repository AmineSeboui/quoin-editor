import { useCallback, useSyncExternalStore } from 'react';
import type { ViewController } from '../controller/view-controller';

// The flag is set from a layout effect, after the render that first sees a changed prop, so a component that paints
// from it has to subscribe instead of reading it while rendering.
export function useReadOnly(controller: ViewController): boolean {
  const subscribe = useCallback((notify: () => void) => controller.subscribeReadOnly(notify), [controller]);
  const read = useCallback(() => controller.readOnly, [controller]);
  return useSyncExternalStore(subscribe, read, read);
}
