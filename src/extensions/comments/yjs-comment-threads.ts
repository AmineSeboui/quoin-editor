import { newId } from '../../engine/model/new-id';
import { createCommentThreads, type CommentUser } from './comment-threads';
import type { CommentsOptions } from './comments-extension';
import { readThreads, type StoredComment, type ThreadMeta, type YjsCommentsMap } from './shared-threads';

/** The part of a `Y.Doc` that `yjsCommentThreads` reads and writes, so that this entry needs no Yjs types. */
export type YjsCommentsDoc = {
  getMap<T>(name: string): YjsCommentsMap<T>;
  transact(change: () => void): unknown;
};

export type YjsCommentThreadsOptions = {
  /** Who writes the replies sent from this client, as given to `commentsExtension`. */
  currentUser: CommentUser;
  /** What the names of the two shared maps start with: `comment` gives `comment-threads` and `comment-replies`. */
  field?: string;
};

export type YjsCommentThreads = Pick<CommentsOptions, 'threads' | 'onCreate' | 'onReply' | 'onResolve' | 'onDelete'> & {
  /** Reads the shared maps into `threads`, then follows them until the function it returns is called. */
  listen(): () => void;
};

/**
 * Comment threads kept in a Yjs document, so collaborators see each other's: each thread in one shared map and each
 * comment in another, by its own id, so that replies sent at the same time all stay. Hand the store and the four
 * callbacks to `commentsExtension`, and call `listen` while the canvas is mounted.
 */
export function yjsCommentThreads(doc: YjsCommentsDoc, options: YjsCommentThreadsOptions): YjsCommentThreads {
  const { currentUser, field = 'comment' } = options;
  const metas = doc.getMap<ThreadMeta>(`${field}-threads`);
  const replies = doc.getMap<StoredComment>(`${field}-replies`);
  const threads = createCommentThreads(readThreads(metas, replies));
  const refresh = () => threads.set(readThreads(metas, replies));
  const held = (threadId: string) => {
    const meta = metas.get(threadId);
    if (meta === undefined) throw new Error(`No comment thread "${threadId}" in the shared document.`);
    return meta;
  };
  return {
    threads,
    async onCreate() {
      const id = newId();
      metas.set(id, { id, resolved: false, createdAt: new Date().toISOString() });
      return id;
    },
    async onReply(threadId, body) {
      held(threadId);
      const id = newId();
      replies.set(id, { id, threadId, author: currentUser, body, createdAt: new Date().toISOString() });
    },
    async onResolve(threadId) {
      metas.set(threadId, { ...held(threadId), resolved: true });
    },
    async onDelete(threadId) {
      doc.transact(() => {
        metas.delete(threadId);
        for (const comment of [...replies.values()]) if (comment.threadId === threadId) replies.delete(comment.id);
      });
    },
    listen() {
      refresh();
      metas.observe(refresh);
      replies.observe(refresh);
      return () => {
        metas.unobserve(refresh);
        replies.unobserve(refresh);
      };
    },
  };
}
