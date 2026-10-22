import { commentsExtension, createCommentThreads, type CommentThread } from 'quoin-editor/comments';

const params = new URLSearchParams(location.search);
// Stands in for a host's comments service, answering after a delay as a server would.
const DELAY = Number(params.get('commentdelay') ?? 0);
const later = <T>(value: () => T) => new Promise<T>((resolve) => setTimeout(() => resolve(value()), DELAY));

const byAda = (id: string, body: string) => ({
  id,
  author: { name: 'Ada Lovelace' },
  body,
  createdAt: '2026-10-22T09:05:00Z',
});
const seeded: CommentThread[] = [
  { id: 'seeded', resolved: false, comments: [byAda('s1', 'Is this <b>right</b>?\nSecond line')] },
  { id: 'orphan', resolved: false, comments: [byAda('o1', 'On deleted text')] },
];

export function commentHost() {
  const threads = createCommentThreads(params.get('comments') === 'seeded' ? seeded : []);
  let next = 0;
  const update = (id: string, change: (thread: CommentThread) => CommentThread | null) =>
    threads.set(threads.get().flatMap((thread) => (thread.id === id ? (change(thread) ?? []) : [thread])));
  return commentsExtension({
    threads,
    currentUser: { id: 'grace', name: 'Grace Hopper' },
    onCreate: () =>
      later(() => {
        const id = `t${++next}`;
        threads.set([...threads.get(), { id, resolved: false, comments: [] }]);
        return id;
      }),
    onReply: (threadId, body) =>
      later(() => {
        const author = { name: 'Grace Hopper' };
        const comment = { id: `c${++next}`, author, body, createdAt: new Date().toISOString() };
        update(threadId, (thread) => ({ ...thread, comments: [...thread.comments, comment] }));
      }),
    onResolve: (threadId) => later(() => update(threadId, (thread) => ({ ...thread, resolved: true }))),
    onDelete: (threadId) => later(() => update(threadId, () => null)),
  });
}
