'use client';

import { useEffect } from 'react';
import { getPluginState } from '../../engine';
import { dismissSuggestion } from '../../menus/suggestion/suggestion-plugin';
import type { ViewController } from '../../view';
import { mentionKey } from './mention-key';

const STARTS_WITH_SPACE = /^\s/;

/**
 * Closes the menu on a space typed right after the `@`, or once the host has found nothing for the query, so the words
 * written after an `@` neither keep a menu of no matches open nor keep asking the host.
 */
export function useCloseOnSpace(controller: ViewController, foundNothing: (query: string) => boolean): void {
  useEffect(() => {
    const root = controller.root;
    if (root === null) return;
    const onBeforeInput = (event: InputEvent) => {
      if (event.inputType !== 'insertText' || event.isComposing || !STARTS_WITH_SPACE.test(event.data ?? '')) return;
      const query = getPluginState(controller.editor.state, mentionKey).active?.query;
      if (query === '' || (query !== undefined && foundNothing(query))) controller.run(dismissSuggestion(mentionKey));
    };
    // Captured on the root, it closes the menu before the view, listening there too, types the space.
    root.addEventListener('beforeinput', onBeforeInput, true);
    return () => root.removeEventListener('beforeinput', onBeforeInput, true);
  }, [controller, foundNothing]);
}
