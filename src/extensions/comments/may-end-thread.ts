import type { CommentThread, CommentUser } from './comment-threads';

/** What a canvas allows its reader: editing, or on a read-only canvas, commenting if the host lets them. */
export type CommentingCanvas = { readonly readOnly: boolean; readonly canCommentWhileReadOnly: boolean };

/**
 * Whether Resolve and Delete show for a thread: on an editable canvas always, and on a read-only one only to the reader
 * who started the thread, when they may comment there. A thread that does not say who started it is no reader's.
 */
export function mayEndThread(thread: CommentThread, currentUser: CommentUser, canvas: CommentingCanvas): boolean {
  if (!canvas.readOnly) return true;
  return canvas.canCommentWhileReadOnly && thread.startedBy?.id === currentUser.id;
}
