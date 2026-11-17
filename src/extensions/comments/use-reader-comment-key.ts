import { useEffect } from 'react';
import type { ViewController } from '../../view';
import { listenReaderKeys } from '../../view/input/reader-keys';
import { commentCommand } from './comment-open';
import type { CommentsHost } from './comments-extension';
import { isReaderCommentKey } from './reader-comment-key';

/** Comments on the selected text, or opens the threads at the caret, when the reader presses Mod+Alt+M in the text. */
export function useReaderCommentKey(controller: ViewController, host: CommentsHost): void {
  const { threads, canCommentWhileReadOnly = false } = host;
  useEffect(() => {
    if (!canCommentWhileReadOnly) return undefined;
    return listenReaderKeys(controller, (event) => {
      const canvas = { readOnly: controller.readOnly, canCommentWhileReadOnly };
      return isReaderCommentKey(canvas, event, controller.isMac) && controller.run(commentCommand(threads));
    });
  }, [controller, threads, canCommentWhileReadOnly]);
}
