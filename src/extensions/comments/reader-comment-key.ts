import { keyName, normalizeKey, type KeyLike } from '../../engine/extension/keymap';
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
