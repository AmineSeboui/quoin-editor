import * as Y from 'yjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { linkedDocs } from '../../yjs/test-support/peers';
import { commentsExtension } from './comments-extension';
import { yjsCommentThreads } from './yjs-comment-threads';

const ada = { id: 'ada', name: 'Ada' };
const bea = { id: 'bea', name: 'Bea', avatarUrl: 'https://example.com/bea.png' };

function clients() {
  const { docs, flush, deliver } = linkedDocs();
  const one = yjsCommentThreads(docs[0], { currentUser: ada });
  const two = yjsCommentThreads(docs[1], { currentUser: bea });
  const stops = [one.listen(), two.listen()];
  return { docs, flush, deliver, one, two, stop: () => stops.forEach((stop) => stop()) };
}

const bodies = (shared: ReturnType<typeof yjsCommentThreads>) =>
  shared.threads.get().map(({ id, resolved, comments }) => ({ id, resolved, bodies: comments.map((c) => c.body) }));

afterEach(() => vi.useRealTimers());

describe('comment threads kept in a Yjs document', () => {
  it('hands commentsExtension its store and its four callbacks', () => {
    const shared = yjsCommentThreads(new Y.Doc(), { currentUser: ada });
    expect(() => commentsExtension({ ...shared, currentUser: ada })).not.toThrow();
  });

  it('shows a thread created and answered on one client on the other, with its author and time', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-12T10:00:00.000Z') });
    const { one, two, flush } = clients();
    const id = await one.onCreate({ anchorText: 'hello', blockId: 'a' });
    await one.onReply(id, 'First');
    flush();
    expect(two.threads.find(id)).toEqual({
      id,
      resolved: false,
      comments: [{ id: expect.any(String), author: ada, body: 'First', createdAt: '2026-11-12T10:00:00.000Z' }],
    });
    expect(bodies(one)).toEqual(bodies(two));
  });

  it('keeps both of two replies sent to one thread at the same time, in the order they were written', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-12T10:00:00.000Z') });
    const { one, two, flush } = clients();
    const id = await one.onCreate({ anchorText: 'hello', blockId: 'a' });
    flush();
    vi.setSystemTime(new Date('2026-11-12T10:00:02.000Z'));
    await one.onReply(id, 'From Ada');
    vi.setSystemTime(new Date('2026-11-12T10:00:01.000Z'));
    await two.onReply(id, 'From Bea');
    flush();
    expect(bodies(one)).toEqual([{ id, resolved: false, bodies: ['From Bea', 'From Ada'] }]);
    expect(bodies(two)).toEqual(bodies(one));
    expect(two.threads.find(id)!.comments.map((comment) => comment.author)).toEqual([bea, ada]);
  });

  it('resolves a thread for both clients, keeping its comments', async () => {
    const { one, two, flush } = clients();
    const id = await one.onCreate({ anchorText: 'hello', blockId: 'a' });
    await one.onReply(id, 'First');
    flush();
    await two.onResolve(id);
    flush();
    expect(bodies(one)).toEqual([{ id, resolved: true, bodies: ['First'] }]);
  });

  it('takes the comments of a removed thread out of the document with it', async () => {
    const { docs, one, two, flush } = clients();
    const kept = await one.onCreate({ anchorText: 'kept', blockId: 'a' });
    const removed = await one.onCreate({ anchorText: 'gone', blockId: 'a' });
    await one.onReply(kept, 'Stays');
    await one.onReply(removed, 'One');
    await one.onReply(removed, 'Two');
    flush();
    await two.onDelete(removed);
    flush();
    expect(bodies(one)).toEqual([{ id: kept, resolved: false, bodies: ['Stays'] }]);
    expect([...docs[0].getMap('comment-replies').values()]).toHaveLength(1);
    expect([...docs[0].getMap('comment-threads').keys()]).toEqual([kept]);
  });

  it('refuses a reply or a resolve for a thread it does not hold, writing nothing', async () => {
    const { docs, one } = clients();
    await expect(one.onReply('missing', 'Lost')).rejects.toThrow(/missing/);
    await expect(one.onResolve('missing')).rejects.toThrow(/missing/);
    expect(docs[0].getMap('comment-replies').size + docs[0].getMap('comment-threads').size).toBe(0);
  });

  it('reads the document when listening starts, and follows it only until told to stop', async () => {
    const { docs, flush } = linkedDocs();
    const writer = yjsCommentThreads(docs[0], { currentUser: ada });
    const reader = yjsCommentThreads(docs[1], { currentUser: bea });
    const first = await writer.onCreate({ anchorText: 'hello', blockId: 'a' });
    flush();
    expect(reader.threads.get()).toEqual([]);
    const stop = reader.listen();
    expect(reader.threads.get().map(({ id }) => id)).toEqual([first]);
    stop();
    await writer.onCreate({ anchorText: 'again', blockId: 'a' });
    flush();
    expect(reader.threads.get().map(({ id }) => id)).toEqual([first]);
  });

  it('keeps the threads of another field apart', async () => {
    const doc = new Y.Doc();
    const notes = yjsCommentThreads(doc, { currentUser: ada });
    const other = yjsCommentThreads(doc, { currentUser: ada, field: 'draft' });
    const stops = [notes.listen(), other.listen()];
    await other.onCreate({ anchorText: 'hello', blockId: 'a' });
    expect(notes.threads.get()).toEqual([]);
    expect(other.threads.get()).toHaveLength(1);
    expect(doc.getMap('draft-threads').size).toBe(1);
    stops.forEach((stop) => stop());
  });
});
