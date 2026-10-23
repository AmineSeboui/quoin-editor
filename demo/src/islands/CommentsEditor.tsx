import { useState } from 'react';
import { BlockCanvas, type QuoinBlock } from 'quoin-editor';
import { commentsDocument } from '../content/comments-document';
import { commentsExtension, createCommentThreads, type CommentThread, type CommentThreads } from 'quoin-editor/comments';

const SEEDED: CommentThread[] = [
  {
    id: 'first',
    resolved: false,
    comments: [{ id: 'c1', author: { name: 'Ada Lovelace' }, body: 'Can we make it Friday?', createdAt: '2026-10-22T09:05:00Z' }],
  },
];

function reviewing(threads: CommentThreads) {
  const replace = (id: string, change: (thread: CommentThread) => CommentThread | null) =>
    threads.set(threads.get().flatMap((thread) => (thread.id === id ? (change(thread) ?? []) : [thread])));
  return commentsExtension({
    threads,
    currentUser: { id: 'grace', name: 'Grace Hopper' },
    onCreate: async () => {
      const id = crypto.randomUUID();
      threads.set([...threads.get(), { id, resolved: false, comments: [] }]);
      return id;
    },
    onReply: async (threadId, body) => {
      const comment = { id: crypto.randomUUID(), author: { name: 'Grace Hopper' }, body, createdAt: new Date().toISOString() };
      replace(threadId, (thread) => ({ ...thread, comments: [...thread.comments, comment] }));
    },
    onResolve: async (threadId) => replace(threadId, (thread) => ({ ...thread, resolved: true })),
    onDelete: async (threadId) => replace(threadId, () => null),
  });
}

export default function CommentsEditor() {
  const [blocks, setBlocks] = useState<QuoinBlock[]>(commentsDocument);
  const [extensions] = useState(() => [reviewing(createCommentThreads(SEEDED))]);
  return <BlockCanvas blocks={blocks} onChange={setBlocks} extensions={extensions} aria-label="Reviewed document" className="editor-frame" />;
}
