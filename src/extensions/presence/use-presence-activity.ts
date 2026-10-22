import { useEffect } from 'react';
import type { ViewController } from '../../view';
import { ownsNode, watchCanvasFocus } from '../canvas-focus';
import { setActive, type PresenceLink } from './presence-link';

/** Tells presence whether focus is in the canvas or its menus and the canvas is editable, when its selection is shared. */
export function usePresenceActivity(controller: ViewController, link: PresenceLink): void {
  useEffect(() => {
    const doc = controller.root?.ownerDocument;
    if (!doc) return undefined;
    let focused = ownsNode(controller, doc.activeElement);
    const update = () => setActive(link, focused && !controller.readOnly);
    const stopFocus = watchCanvasFocus(controller, doc, (inside) => {
      focused = inside;
      update();
    });
    const stopReadOnly = controller.subscribeReadOnly(update);
    update();
    return () => {
      stopFocus();
      stopReadOnly();
      setActive(link, false);
    };
  }, [controller, link]);
}
