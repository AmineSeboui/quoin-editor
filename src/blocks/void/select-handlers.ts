import type { KeyboardEvent, MouseEvent, RefObject } from 'react';
import type { ViewController } from '../../view';
import { isComposingKey } from '../../view/input/keydown';
import { isInteractive } from './interactive-target';
import { focusNode } from './select-node';

/**
 * The handlers of a part of a block where Escape, or a press around the controls, selects the block as a whole, once
 * `onSelect` has run.
 */
export function selectHandlers(
  controller: ViewController,
  blockId: string,
  root: RefObject<HTMLElement | null>,
  onSelect?: () => void,
) {
  const select = () => {
    onSelect?.();
    focusNode(controller, blockId);
  };
  return {
    onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || isComposingKey(controller, event.nativeEvent)) return;
      event.preventDefault();
      select();
    },
    onClick(event: MouseEvent) {
      if (!isInteractive(root.current, event)) select();
    },
  };
}
