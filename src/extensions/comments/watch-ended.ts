import { getPluginState } from '../../engine';
import { commentsTransaction } from './comment-open';
import type { CommentThreads } from './comment-threads';
import type { CommentsEditor } from './comments-link';
import { commentsKey, isEnded } from './comments-plugin';

/**
 * Lets go of each thread this canvas ended once the host's store has caught up with it, resolving or removing it, so
 * that a later change of the host, such as reopening it, is followed.
 */
export function watchEnded(editor: CommentsEditor, threads: CommentThreads): () => void {
  return threads.subscribe(() => {
    const { ended } = getPluginState(editor.state, commentsKey);
    const kept = ended.filter(({ id }) => isEnded(ended, id, threads.find(id)));
    if (kept.length < ended.length) editor.dispatch(commentsTransaction(editor.state, { type: 'caught', kept }));
  });
}
