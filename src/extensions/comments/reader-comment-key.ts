import { useEffect } from 'react';
import { keyName, normalizeKey, type KeyLike } from '../../engine/extension/keymap';
import type { ViewController } from '../../view';
import { isComposingKey } from '../../view/input/keydown';
import { commentCommand } from './comment-open';
import type { CommentsHost } from './comments-extension';
import type { CommentingCanvas } from './may-end-thread';

export const COMMENT_KEY = 'Mod-Alt-m';

/**
 * Whether a key is Mod+Alt+M on a read-only canvas whose host lets its reader comment. A read-only canvas takes no
 * other key from its reader, and an editable one answers this one from its keymap.
 */
export function isReaderCommentKey(canvas: CommentingCanvas, event: KeyLike, isMac: boolean): boolean {
  if (!canvas.readOnly || !canvas.canCommentWhileReadOnly) return false;
  return keyName(event, isMac) === normalizeKey(COMMENT_KEY, isMac);
}

/** Comments on the selected text, or opens the threads at the caret, when the reader presses Mod+Alt+M in the text. */
export function useReaderCommentKey(controller: ViewController, host: CommentsHost): void {
  const { threads, canCommentWhileReadOnly = false } = host;
  useEffect(() => {
    if (!canCommentWhileReadOnly) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isComposingKey(controller, event)) return;
      if (!(event.target instanceof Element) || !controller.isEditorElement(event.target)) return;
      const canvas = { readOnly: controller.readOnly, canCommentWhileReadOnly };
      if (!isReaderCommentKey(canvas, event, controller.isMac)) return;
      if (controller.run(commentCommand(threads))) event.preventDefault();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [controller, threads, canCommentWhileReadOnly]);
}
