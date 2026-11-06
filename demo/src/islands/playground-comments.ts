import {
  commentsExtension,
  createCommentThreads,
  type CommentsLabels,
  type CommentThread,
  type CommentThreads,
} from 'quoin-editor/comments';

/**
 * Empty, because a seeded thread would have no range to anchor to in this document and would draw its marker beside
 * the first block instead, which is not what a thread looks like.
 */
export const seedThreads = (): CommentThreads => createCommentThreads([]);

/**
 * The threads live in this store rather than in the document, which is where a host keeps them too: Quoin anchors a
 * thread to a range and leaves the storing to you.
 */
export function reviewing(threads: CommentThreads, labels: Partial<CommentsLabels> | undefined) {
  const replace = (id: string, change: (thread: CommentThread) => CommentThread | null) =>
    threads.set(threads.get().flatMap((thread) => (thread.id === id ? (change(thread) ?? []) : [thread])));

  return commentsExtension({
    threads,
    labels,
    currentUser: { id: 'grace', name: 'Grace Hopper' },
    onCreate: async () => {
      const id = crypto.randomUUID();
      threads.set([...threads.get(), { id, resolved: false, comments: [] }]);
      return id;
    },
    onReply: async (threadId, body) => {
      const comment = {
        id: crypto.randomUUID(),
        author: { name: 'Grace Hopper' },
        body,
        createdAt: new Date().toISOString(),
      };
      replace(threadId, (thread) => ({ ...thread, comments: [...thread.comments, comment] }));
    },
    onResolve: async (threadId) => replace(threadId, (thread) => ({ ...thread, resolved: true })),
    onDelete: async (threadId) => replace(threadId, () => null),
  });
}
