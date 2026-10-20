'use client';

import { useEffect } from 'react';
import type { KeyInterceptor, ViewController } from '../../view';
import { isComposingKey } from '../../view/input/keydown';
import { selectedAtom } from '../atoms/atom-place';
import { atomAtTarget } from '../atoms/atom-at-target';
import { plainEnter } from '../atoms/plain-enter';
import { MENTION_ATOMS, mentionOf, type Mention } from './mention-feature';

/**
 * Hands a mention to the host's `onOpen` on a click on its chip, on an editable or a read-only canvas, and on Enter
 * while it is selected on an editable one. A Shift+click extends the selection instead, and a double click opens once.
 */
export function useMentionOpening(
  controller: ViewController,
  onOpen: ((mention: Mention) => void) | undefined,
  editable: boolean,
): void {
  useEffect(() => {
    const root = controller.root;
    if (onOpen === undefined || root === null) return;
    const onClick = (event: MouseEvent) => {
      const once = !event.shiftKey && event.detail <= 1;
      const place = once ? atomAtTarget(controller, event.target, MENTION_ATOMS) : null;
      if (place !== null) onOpen(mentionOf(place.node));
    };
    const intercept: KeyInterceptor = (event) => {
      if (!plainEnter(event) || isComposingKey(controller, event)) return false;
      const place = selectedAtom(controller.editor.state, MENTION_ATOMS);
      if (place === null) return false;
      event.preventDefault();
      onOpen(mentionOf(place.node));
      return true;
    };
    root.addEventListener('click', onClick);
    if (editable) controller.keyInterceptors.add(intercept);
    return () => {
      root.removeEventListener('click', onClick);
      controller.keyInterceptors.delete(intercept);
    };
  }, [controller, onOpen, editable]);
}
