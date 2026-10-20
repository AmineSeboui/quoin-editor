import type { KeyboardEvent, MouseEvent, RefObject } from 'react';
import { focusNode } from '../../blocks/void/select-node';
import { selectHandlers } from '../../blocks/void/select-handlers';
import { linkedBlockId } from '../../canvas/block-link';
import type { ViewController } from '../../view';
import { isComposingKey } from '../../view/input/keydown';
import { goToHeading } from './go-to-heading';

const entryOf = (event: { target: EventTarget }): HTMLAnchorElement | null =>
  (event.target as Element).closest<HTMLAnchorElement>('a[href]');

const asksTheBrowser = (event: MouseEvent): boolean =>
  event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;

/**
 * The handlers of a table of contents. A click on an entry goes to its heading in place of the link, unless a modifier
 * or another button leaves the link to the browser. On an editable canvas, where the entries are out of the tab order,
 * a press beside them selects the block as a whole, Tab and Shift+Tab walk them and go back to the block past either
 * end, and Escape goes back to the block.
 */
export function tocHandlers(
  controller: ViewController,
  blockId: string,
  root: RefObject<HTMLElement | null>,
  readOnly: boolean,
) {
  const select = selectHandlers(controller, blockId, root);

  function walk(event: KeyboardEvent, from: HTMLAnchorElement): void {
    const entries = Array.from(root.current?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? []);
    const next = entries[entries.indexOf(from) + (event.shiftKey ? -1 : 1)];
    event.preventDefault();
    if (next === undefined) focusNode(controller, blockId);
    else next.focus();
  }

  return {
    onClick(event: MouseEvent) {
      const entry = entryOf(event);
      const heading = entry === null ? null : linkedBlockId(entry.getAttribute('href') ?? '');
      if (entry === null && !readOnly) select.onClick(event);
      if (heading === null || asksTheBrowser(event)) return;
      event.preventDefault();
      goToHeading(controller, heading);
    },
    onKeyDown: readOnly
      ? undefined
      : (event: KeyboardEvent) => {
          const entry = entryOf(event);
          const tab = event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey;
          if (tab && entry !== null && !isComposingKey(controller, event.nativeEvent)) walk(event, entry);
          else select.onKeyDown(event);
        },
  };
}
