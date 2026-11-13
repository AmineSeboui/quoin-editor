import type { CommentThread, ThreadComment } from './comment-threads';

/** The part of a `Y.Map` that comment threads read and write. */
export type YjsCommentsMap<T> = {
  get(key: string): T | undefined;
  has(key: string): boolean;
  set(key: string, value: T): unknown;
  delete(key: string): void;
  values(): Iterable<T>;
  observe(listener: () => void): void;
  unobserve(listener: () => void): void;
};

export type ThreadMeta = { readonly id: string; readonly resolved: boolean; readonly createdAt?: string };
export type StoredComment = ThreadComment & { readonly threadId: string };

const byTime = (a: { id: string; createdAt?: string }, b: { id: string; createdAt?: string }) =>
  (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.id.localeCompare(b.id);

/**
 * The threads the two maps hold, each with its comments, in the order they were written on every client: comments with
 * no thread left, from a reply that crossed a delete, are not read.
 */
export function readThreads(
  metas: YjsCommentsMap<ThreadMeta>,
  replies: YjsCommentsMap<StoredComment>,
): CommentThread[] {
  const comments = new Map<string, ThreadComment[]>();
  for (const { threadId, ...comment } of [...replies.values()].sort(byTime)) {
    const list = comments.get(threadId);
    if (list === undefined) comments.set(threadId, [comment]);
    else list.push(comment);
  }
  return [...metas.values()]
    .sort(byTime)
    .map(({ id, resolved }) => ({ id, resolved, comments: comments.get(id) ?? [] }));
}
