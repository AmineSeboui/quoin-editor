import { useEffect } from 'react';
import type { ViewController } from '../../view';
import { linkElementAt } from './link-element';

/**
 * Keeps a click on a link in editable text from following it, since there a click places the caret, and opens the link
 * in a new tab on Mod+click. A read-only canvas leaves its links to the browser.
 */
export function useLinkClicks(controller: ViewController): void {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = linkElementAt(controller, event.target);
      if (link === null || controller.readOnly) return;
      event.preventDefault();
      if (controller.isMac ? event.metaKey : event.ctrlKey) window.open(link.href, '_blank', 'noopener,noreferrer');
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [controller]);
}
