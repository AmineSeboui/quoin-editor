import { useCallback, useRef, type FocusEvent, type KeyboardEvent, type RefObject } from 'react';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';

type RovingFocus = {
  ref: RefObject<HTMLDivElement | null>;
  /** Whether the element is one of the toolbar's own controls, not a part of a menu it opened. */
  owns(target: EventTarget | null): boolean;
  focusCurrent(): void;
  onFocus(event: FocusEvent): void;
  onKeyDown(event: KeyboardEvent): void;
};

const MOVES: Readonly<Record<string, (index: number, count: number) => number>> = {
  ArrowRight: (index, count) => (index + 1) % count,
  ArrowLeft: (index, count) => (index - 1 + count) % count,
  Home: () => 0,
  End: (_, count) => count - 1,
};

/**
 * One tab stop for a row of buttons: the one last focused, or the first. The arrows, Home and End move along the row.
 * The tab stop is kept on the elements themselves, since the buttons come from several components and extensions.
 */
export function useRovingFocus(): RovingFocus {
  const ref = useRef<HTMLDivElement>(null);
  const current = useRef<HTMLElement | null>(null);
  const items = useCallback(() => [...(ref.current?.querySelectorAll<HTMLElement>(':scope > button') ?? [])], []);
  const tabStop = useCallback(() => {
    const all = items();
    return all.find((item) => item === current.current) ?? all[0];
  }, [items]);
  const syncTabStop = useCallback(() => {
    const stop = tabStop();
    for (const item of items()) item.tabIndex = item === stop ? 0 : -1;
  }, [items, tabStop]);
  const owns = useCallback(
    (target: EventTarget | null) => target instanceof HTMLElement && items().includes(target),
    [items],
  );
  const focusCurrent = useCallback(() => tabStop()?.focus(), [tabStop]);

  useIsomorphicLayoutEffect(syncTabStop);

  const onFocus = (event: FocusEvent) => {
    if (!owns(event.target)) return;
    current.current = event.target as HTMLElement;
    syncTabStop();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const all = items();
    const index = all.indexOf(event.target as HTMLElement);
    if (index === -1 || !Object.hasOwn(MOVES, event.key)) return;
    event.preventDefault();
    all[MOVES[event.key](index, all.length)].focus();
  };

  return { ref, owns, focusCurrent, onFocus, onKeyDown };
}
