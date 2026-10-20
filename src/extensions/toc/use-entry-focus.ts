import { useRef, type FocusEvent, type RefObject } from 'react';
import { nodeSelection } from '../../engine';
import type { ViewController } from '../../view';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';

const entriesIn = (nav: HTMLElement) => Array.from(nav.querySelectorAll<HTMLElement>('a[href]'));

function refocus(controller: ViewController, blockId: string, nav: HTMLElement, href: string | null): void {
  const again = entriesIn(nav).find((entry) => entry.getAttribute('href') === href);
  if (again !== undefined) {
    again.focus();
    return;
  }
  const { editor } = controller;
  editor.dispatch(editor.createTransaction().setSelection(nodeSelection(blockId)));
  controller.focus();
}

/**
 * Keeps focus in the block when a change from elsewhere redraws or takes away the entry that holds it: on the entry
 * drawn again for the same heading, or else on the block selected as a whole. Chromium blurs a removed element as it
 * blurs one that focus leaves for the page, so a blur to nowhere lets go of the entry only if it is still in the page
 * once the redraw that may have removed it is over. The selection is dispatched to the editor rather than through the
 * controller, whose synchronous flush React refuses from inside an effect.
 */
export function useEntryFocus(
  controller: ViewController,
  blockId: string,
  root: RefObject<HTMLElement | null>,
  drawn: unknown,
) {
  const held = useRef<HTMLElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    const entry = held.current;
    const nav = root.current;
    if (entry === null || entry.isConnected || nav === null) return;
    held.current = null;
    const { activeElement, body } = nav.ownerDocument;
    if (activeElement === null || activeElement === body) refocus(controller, blockId, nav, entry.getAttribute('href'));
  }, [controller, blockId, root, drawn]);

  return {
    onFocus(event: FocusEvent) {
      held.current = (event.target as Element).closest<HTMLElement>('a[href]');
    },
    onBlur(event: FocusEvent) {
      const entry = held.current;
      if (event.relatedTarget !== null) {
        held.current = null;
        return;
      }
      queueMicrotask(() => {
        if (entry?.isConnected && held.current === entry) held.current = null;
      });
    },
  };
}
