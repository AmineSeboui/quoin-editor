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

const GRACE = { id: 'grace', name: 'Grace Hopper' };
const ADA = { id: 'ada', name: 'Ada Lovelace' };

const byAda = (id: string, body: string) => ({ id, author: ADA, body, createdAt: '2026-10-22T09:05:00Z' });
const seeded: CommentThread[] = [
  { id: 'seeded', resolved: false, comments: [byAda('s1', 'Is this <b>right</b>?\nSecond line')] },
  { id: 'orphan', resolved: false, comments: [byAda('o1', 'On deleted text')] },
];

/**
 * `readercomments=1` is a guest who may only comment, on a read-only canvas: the thread on "about this" is Grace's own,
 * so she may resolve or delete it, and the one on "last para" is Ada's.
 */
export const READER_COMMENTS = params.get('readercomments') === '1';
const readerThreads: CommentThread[] = [
  { ...seeded[0], startedBy: GRACE },
  { id: 'x1', resolved: false, startedBy: ADA, comments: [byAda('x', 'Why the last one?')] },
];

// `comments=shared` keeps the threads with the other pages of the collaboration, each page naming its own threads.
const SHARED = params.get('comments') === 'shared';
function threadsOf() {
  if (SHARED) return sharedCommentThreads(params.get('collab') ?? 'quoin');
  if (READER_COMMENTS) return createCommentThreads(readerThreads);
  return createCommentThreads(params.get('comments') === 'seeded' ? seeded : []);
}
const PREFIX = SHARED ? `${(params.get('user') ?? 'Ada').split(' ')[0].toLowerCase()}-` : '';

export function commentHost() {
  const threads = threadsOf();
  let next = 0;
  const update = (id: string, change: (thread: CommentThread) => CommentThread | null) =>
    threads.set(threads.get().flatMap((thread) => (thread.id === id ? (change(thread) ?? []) : [thread])));
  return commentsExtension({
    threads,
    currentUser: GRACE,
    canCommentWhileReadOnly: READER_COMMENTS,
    onCreate: () =>
      later(() => {
        const id = `${PREFIX}t${++next}`;
        threads.set([...threads.get(), { id, resolved: false, startedBy: GRACE, comments: [] }]);
        return id;
      }),
    onReply: (threadId, body) =>
      later(() => {
        const comment = { id: `c${++next}`, author: GRACE, body, createdAt: new Date().toISOString() };
        update(threadId, (thread) => ({ ...thread, comments: [...thread.comments, comment] }));
      }),
    onResolve: (threadId) => later(() => update(threadId, (thread) => ({ ...thread, resolved: true }))),
    onDelete: (threadId) => later(() => update(threadId, () => null)),
  });
}
