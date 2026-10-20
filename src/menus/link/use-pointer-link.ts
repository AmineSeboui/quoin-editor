import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { ViewController } from '../../view';
import { linkElementAt, sameLink } from './link-element';

type PointerLink = { element: HTMLAnchorElement | null; dismiss(): void };

/**
 * The drawn link a mouse or pen has rested on for `delay` ms. Moving onto the card keeps it, and moving anywhere else
 * lets it go `delay` ms later, unless the pointer comes back first.
 */
export function usePointerLink(
  controller: ViewController,
  card: RefObject<HTMLElement | null>,
  delay: number,
): PointerLink {
  const [element, setElement] = useState<HTMLAnchorElement | null>(null);
  const shown = useRef<HTMLAnchorElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback((next: HTMLAnchorElement | null) => {
    clearTimeout(timer.current);
    shown.current = next;
    setElement(next);
  }, []);

  useEffect(() => {
    const onOver = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || event.buttons > 0) return;
      const onCard = event.target instanceof Node && card.current?.contains(event.target) === true;
      const next = onCard ? shown.current : linkElementAt(controller, event.target);
      clearTimeout(timer.current);
      if (!sameLink(controller, next, shown.current)) timer.current = setTimeout(() => show(next), delay);
    };
    document.addEventListener('pointerover', onOver);
    return () => {
      document.removeEventListener('pointerover', onOver);
      clearTimeout(timer.current);
    };
  }, [controller, card, delay, show]);

  return { element, dismiss: useCallback(() => show(null), [show]) };
}
