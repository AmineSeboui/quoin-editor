import { useEffect } from 'react';
import type { ViewController } from '../../view';
import { setActive, type PresenceLink } from '../../yjs/presence-link';

/** Tells presence whether the canvas is focused and editable, the only time its selection is shared. */
export function usePresenceActivity(controller: ViewController, link: PresenceLink): void {
  useEffect(() => {
    const root = controller.root;
    if (root === null) return undefined;
    const update = (focused: boolean) => setActive(link, focused && !controller.readOnly);
    const holdsFocus = () => update(root.contains(root.ownerDocument.activeElement));
    const focusIn = () => update(true);
    const focusOut = (event: FocusEvent) => update(root.contains(event.relatedTarget as Node | null));
    root.addEventListener('focusin', focusIn);
    root.addEventListener('focusout', focusOut);
    const stopReadOnly = controller.subscribeReadOnly(holdsFocus);
    holdsFocus();
    return () => {
      root.removeEventListener('focusin', focusIn);
      root.removeEventListener('focusout', focusOut);
      stopReadOnly();
      setActive(link, false);
    };
  }, [controller, link]);
}
