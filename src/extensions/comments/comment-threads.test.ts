import { createCommentThreads, type CommentThread } from './comment-threads';

const thread = (id: string, resolved = false): CommentThread => ({ id, resolved, comments: [] });

describe('a store of comment threads', () => {
  it('holds the threads it starts with, and none by default', () => {
    const first = [thread('t1')];
    expect(createCommentThreads(first).get()).toBe(first);
    expect(createCommentThreads().get()).toEqual([]);
  });

  it('tells its listeners when the host sets new threads, until they stop listening', () => {
    const store = createCommentThreads();
    const listener = vi.fn();
    const stop = store.subscribe(listener);
    const next = [thread('t1'), thread('t2', true)];
    store.set(next);
    expect(store.get()).toBe(next);
    expect(listener).toHaveBeenCalledTimes(1);
    store.set(next);
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
    store.set([]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('finds a thread by id', () => {
    const store = createCommentThreads([thread('t1'), thread('t2')]);
    expect(store.find('t2')?.id).toBe('t2');
    expect(store.find('t3')).toBeUndefined();
  });
});
