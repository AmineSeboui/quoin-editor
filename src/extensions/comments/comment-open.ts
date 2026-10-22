import { Transaction, type Command, type EditorState } from '../../engine';
import { isCollapsed } from '../../engine/state/selection';
import { commentIdsAt } from './comment-anchors';
import { requestComment } from './comment-create';
import type { CommentThreads } from './comment-threads';
import { COMMENTS, type CommentsAction } from './comments-plugin';

/** The threads to show for anchors: those the host knows and has not resolved, in the order given. */
export const openIds = (threads: CommentThreads, ids: readonly string[]): string[] =>
  ids.filter((id) => threads.find(id)?.resolved === false);

export function commentsTransaction(state: EditorState, action: CommentsAction): Transaction {
  return new Transaction(state).setMeta(COMMENTS, action).setMeta('addToHistory', false);
}

/** Comments on the selected text, or at a caret in an anchor opens its thread, or the list of threads there. */
export function commentCommand(threads: CommentThreads): Command {
  return (state, dispatch) => {
    if (requestComment(state, dispatch)) return true;
    const { selection } = state;
    if (selection?.kind !== 'text' || !isCollapsed(selection)) return false;
    const ids = openIds(threads, commentIdsAt(state.doc, selection.head));
    if (ids.length === 0) return false;
    dispatch?.(commentsTransaction(state, { type: 'open', open: { ids, focus: true } }));
    return true;
  };
}
