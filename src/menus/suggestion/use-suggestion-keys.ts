import { useRef } from 'react';
import type { ViewController } from '../../view';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import { interceptKeys } from '../../view/input/intercept-keys';

type MenuKeys = {
  count: number;
  activeIndex: number;
  highlight(index: number): void;
  select(index: number): void;
  dismiss(): void;
};

const MOVES: Readonly<Record<string, (index: number, count: number) => number>> = {
  ArrowDown: (index, count) => (index + 1) % count,
  ArrowUp: (index, count) => (index - 1 + count) % count,
  Home: () => 0,
  End: (_, count) => count - 1,
};

function handle(event: KeyboardEvent, menu: MenuKeys): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  if (event.key === 'Escape') {
    menu.dismiss();
    return true;
  }
  if (menu.count === 0 || event.shiftKey) return false;
  if (Object.hasOwn(MOVES, event.key)) {
    menu.highlight(MOVES[event.key](menu.activeIndex, menu.count));
    return true;
  }
  if (event.key !== 'Enter' && event.key !== 'Tab') return false;
  menu.select(menu.activeIndex);
  return true;
}

/** While the menu is open, the keys that walk and choose its items reach it before the text, which keeps the caret. */
export function useSuggestionKeys(controller: ViewController, open: boolean, menu: MenuKeys): void {
  const latest = useRef(menu);
  useIsomorphicLayoutEffect(() => {
    latest.current = menu;
  });
  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    const intercept = (event: KeyboardEvent) => {
      const handled = handle(event, latest.current);
      if (handled) event.preventDefault();
      return handled;
    };
    return interceptKeys(controller, intercept);
  }, [controller, open]);
}
