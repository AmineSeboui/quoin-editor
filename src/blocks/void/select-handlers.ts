import type { KeyboardEvent, MouseEvent, RefObject } from 'react';
import type { ViewController } from '../../view';
import { isComposingKey } from '../../view/input/keydown';
import { isInteractive } from './interactive-target';
import { focusNode } from './select-node';

/**
 * The handlers of a part of a block where Escape, or a press around the controls, selects the block as a whole, once
 * `onSelect` has run. The editor's Mod keys, such as undo, pressed on a control other than a text field run in the
 * editor, which takes focus back.
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
      const key = event.nativeEvent;
      if (isComposingKey(controller, key)) return;
      if (event.key === 'Escape') select();
      else if (
        !(event.metaKey || event.ctrlKey) ||
        (event.target as Element).matches('input:not([type=file])') ||
        !controller.edit(() => controller.editor.handleKey(key))
      )
        return;
      else controller.focus();
      event.preventDefault();
    },
    onClick(event: MouseEvent) {
      if (!isInteractive(root.current, event)) select();
    },
  };
}
