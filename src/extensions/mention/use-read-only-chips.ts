'use client';

import { useEffect } from 'react';
import type { ViewController } from '../../view';
import { atomAtTarget } from '../atoms/atom-at-target';
import { MENTION_ATOMS, mentionOf, type Mention } from './mention-feature';

const CHIPS = '[data-quoin-atom="mention"]';

const opensChip = (event: KeyboardEvent): boolean =>
  (event.key === 'Enter' || event.key === ' ') && !event.altKey && !event.ctrlKey && !event.metaKey;

function setButtons(root: Element, on: boolean): void {
  for (const chip of root.querySelectorAll(CHIPS)) {
    if (on) {
      chip.setAttribute('role', 'button');
      chip.setAttribute('tabindex', '0');
    } else {
      chip.removeAttribute('role');
      chip.removeAttribute('tabindex');
    }
  }
}

/**
 * On a read-only canvas, where no caret reaches a chip, makes each chip a button in the tab order that Enter and Space
 * hand to the host's `onOpen`, chips drawn later included. It is still no link, and an editable canvas keeps its chips
 * as text.
 */
export function useReadOnlyChips(
  controller: ViewController,
  onOpen: ((mention: Mention) => void) | undefined,
  readOnly: boolean,
): void {
  useEffect(() => {
    const root = controller.root;
    if (!readOnly || onOpen === undefined || root === null) return;
    setButtons(root, true);
    const observer = new MutationObserver(() => setButtons(root, true));
    observer.observe(root, { childList: true, subtree: true });
    const onKeyDown = (event: KeyboardEvent) => {
      const place = opensChip(event) ? atomAtTarget(controller, event.target, MENTION_ATOMS) : null;
      if (place === null) return;
      event.preventDefault();
      onOpen(mentionOf(place.node));
    };
    root.addEventListener('keydown', onKeyDown);
    return () => {
      observer.disconnect();
      root.removeEventListener('keydown', onKeyDown);
      setButtons(root, false);
    };
  }, [controller, onOpen, readOnly]);
}
