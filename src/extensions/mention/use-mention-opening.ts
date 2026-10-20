'use client';

import { useEffect } from 'react';
import type { AtomNode } from '../../engine';
import type { KeyInterceptor, ViewController } from '../../view';
import { isComposingKey } from '../../view/input/keydown';
import { selectedAtom } from '../atoms/atom-place';
import { clickedAtom } from '../atoms/clicked-atom';
import { plainEnter } from '../atoms/plain-enter';
import { MENTION_ATOMS, type Mention } from './mention-feature';

function mentionOf({ attrs: { id = '', label = '', kind } }: AtomNode): Mention {
  return kind === undefined ? { id, label } : { id, label, kind };
}

/**
 * Hands a mention to the host's `onOpen` on a click on its chip, on an editable or a read-only canvas, and on Enter
 * while it is selected on an editable one. A Shift+click extends the selection instead.
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
      const place = event.shiftKey ? null : clickedAtom(controller, event.target, MENTION_ATOMS);
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
