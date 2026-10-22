import { getPluginState, Transaction, type Command, type EditorState } from '../../engine';
import { isCollapsed } from '../../engine/state/selection';
import { commentIdsAt } from './comment-anchors';
import { requestComment } from './comment-create';
import type { CommentThreads } from './comment-threads';
import { COMMENTS, commentsKey, isEnded, type CommentsAction } from './comments-plugin';

/** The threads to show for anchors: those the host knows and has not resolved, nor this canvas ended, in order. */
export function openIds(state: EditorState, threads: CommentThreads, ids: readonly string[]): string[] {
  const { ended } = getPluginState(state, commentsKey);
  return ids.filter((id) => {
    const thread = threads.find(id);
    return thread?.resolved === false && !isEnded(ended, id, thread);
  });
}

export function commentsTransaction(state: EditorState, action: CommentsAction): Transaction {
  return new Transaction(state).setMeta(COMMENTS, action).setMeta('addToHistory', false);
}

/** Comments on the selected text, or at a caret in an anchor opens its thread, or the list of threads there. */
export function commentCommand(threads: CommentThreads): Command {
  return (state, dispatch) => {
    if (requestComment(state, dispatch)) return true;
    const { selection } = state;
    if (selection?.kind !== 'text' || !isCollapsed(selection)) return false;
    const ids = openIds(state, threads, commentIdsAt(state.doc, selection.head));
    if (ids.length === 0) return false;
    dispatch?.(commentsTransaction(state, { type: 'open', open: { ids, focus: true } }));
    return true;
  };
}
