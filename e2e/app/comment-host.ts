import { commentsExtension, createCommentThreads, type CommentThread } from 'quoin-editor/comments';
import { sharedCommentThreads } from './shared-threads';

const params = new URLSearchParams(location.search);
// Stands in for a host's comments service, answering after a delay as a server would.
// `commentdelay=hold` keeps each answer until the page calls window.__quoinAnswerComments().
const DELAY = params.get('commentdelay') ?? '0';
const held: (() => void)[] = [];
window.__quoinAnswerComments = () => held.splice(0).forEach((answer) => answer());
const later = <T>(value: () => T) =>
  new Promise<T>((resolve) => {
    const answer = () => resolve(value());
    if (DELAY === 'hold') held.push(answer);
    else setTimeout(answer, Number(DELAY));
  });

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

// `comments=shared` keeps the threads with the other pages of the collaboration, each page naming its own threads.
const SHARED = params.get('comments') === 'shared';
const threadsOf = () =>
  SHARED
    ? sharedCommentThreads(params.get('collab') ?? 'quoin')
    : createCommentThreads(params.get('comments') === 'seeded' ? seeded : []);
const PREFIX = SHARED ? `${(params.get('user') ?? 'Ada').split(' ')[0].toLowerCase()}-` : '';

export function commentHost() {
  const threads = threadsOf();
  let next = 0;
  const update = (id: string, change: (thread: CommentThread) => CommentThread | null) =>
    threads.set(threads.get().flatMap((thread) => (thread.id === id ? (change(thread) ?? []) : [thread])));
  return commentsExtension({
    threads,
    currentUser: { id: 'grace', name: 'Grace Hopper' },
    onCreate: () =>
      later(() => {
        const id = `${PREFIX}t${++next}`;
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
