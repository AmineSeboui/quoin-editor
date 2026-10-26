'use client';

import { useRef, type RefObject } from 'react';
import { listen } from '../../view/dom/listen';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';

/**
 * Calls back on a press outside the element from the moment it is drawn, before the press does anything: Radix only
 * listens a task after a popover opens, and only acts on the click, once the press has moved focus. A touch or a pen
 * counts once its click comes, so a scroll that starts outside the element is no press.
 */
export function useOutsidePress(
  element: RefObject<HTMLElement | null>,
  ownerDocument: () => Document,
  onPress: (target: Element) => void,
): void {
  const latest = useRef(onPress);
  useIsomorphicLayoutEffect(() => {
    latest.current = onPress;
  });
  useIsomorphicLayoutEffect(() => {
    const doc = ownerDocument();
    const inside = (target: EventTarget | null) => element.current?.contains(target as Node) === true;
    let touched: Element | null = null;
    const down = (event: PointerEvent) => {
      const target = event.target as Element;
      touched = null;
      if (inside(target)) return;
      if (event.pointerType === 'mouse') latest.current(target);
      else touched = target;
    };
    const click = (event: MouseEvent) => {
      if (touched !== null && !inside(event.target)) latest.current(touched);
      touched = null;
    };
    return listen(doc, { pointerdown: down, click }, true);
  }, [element, ownerDocument]);
}
