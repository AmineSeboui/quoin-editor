import type { CommentThread, CommentUser } from './comment-threads';
import { mayEndThread } from './may-end-thread';

const me: CommentUser = { id: 'me', name: 'Grace Hopper' };
const other: CommentUser = { id: 'other', name: 'Alan Turing' };

const thread = (startedBy?: CommentUser): CommentThread => ({
  id: 't1',
  resolved: false,
  ...(startedBy === undefined ? {} : { startedBy }),
  comments: [],
});

const editable = { readOnly: false, canCommentWhileReadOnly: false };
const readOnly = { readOnly: true, canCommentWhileReadOnly: false };
const commenting = { readOnly: true, canCommentWhileReadOnly: true };

describe('who may resolve or delete a thread', () => {
  it('is anyone on an editable canvas, whoever started the thread', () => {
    for (const startedBy of [me, other, undefined]) expect(mayEndThread(thread(startedBy), me, editable)).toBe(true);
    expect(mayEndThread(thread(other), me, { ...editable, canCommentWhileReadOnly: true })).toBe(true);
  });

  it('is no one on a read-only canvas without the option', () => {
    for (const startedBy of [me, other, undefined]) expect(mayEndThread(thread(startedBy), me, readOnly)).toBe(false);
  });

  it('is the reader who started the thread, on a read-only canvas with the option', () => {
    expect(mayEndThread(thread(me), me, commenting)).toBe(true);
    expect(mayEndThread(thread({ id: 'me', name: 'Another name' }), me, commenting)).toBe(true);
  });

  it('is not the reader, on a read-only canvas with the option, for a thread someone else started', () => {
    expect(mayEndThread(thread(other), me, commenting)).toBe(false);
  });

  it('is not the reader, on a read-only canvas with the option, for a thread that does not say who started it', () => {
    expect(mayEndThread(thread(), me, commenting)).toBe(false);
  });
});
