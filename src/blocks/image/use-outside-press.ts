'use client';

import { useRef, type RefObject } from 'react';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';

/**
 * Calls back on a press outside the element from the moment it is drawn, before the press does anything: Radix only
 * listens a task after a popover opens, and only acts on the click, once the press has moved focus.
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
    const listener = (event: PointerEvent) => {
      const target = event.target as Element;
      if (!element.current?.contains(target)) latest.current(target);
    };
    doc.addEventListener('pointerdown', listener, true);
    return () => doc.removeEventListener('pointerdown', listener, true);
  }, [element, ownerDocument]);
}
