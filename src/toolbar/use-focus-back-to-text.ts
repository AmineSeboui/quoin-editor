import { useRef } from 'react';
import type { ViewController } from '../view';
import { useIsomorphicLayoutEffect } from '../view/react/use-isomorphic-layout-effect';
import { isBubblePart } from './bubble-part';

type Holds = (focused: Element | null, controller: ViewController) => boolean;

/**
 * When the component goes while it holds focus, by default on a part of the canvas's toolbars and menus, as when the
 * host turns the canvas read-only, focus goes back to the text instead of falling to the page. A part that stays, or
 * focus a press moved elsewhere, keeps it.
 */
export function useFocusBackToText(controller: ViewController, holds: Holds = isBubblePart): void {
  const latest = useRef(holds);
  useIsomorphicLayoutEffect(() => {
    latest.current = holds;
  });
  useIsomorphicLayoutEffect(
    () => () => {
      const doc = controller.root?.ownerDocument;
      if (!doc || !latest.current(doc.activeElement, controller)) return;
      queueMicrotask(() => {
        if (doc.activeElement === null || doc.activeElement === doc.body) controller.focus();
      });
    },
    [controller],
  );
}
