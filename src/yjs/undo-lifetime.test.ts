import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { caret, md } from '../engine/test-support/editor-fixtures';
import { peer } from './test-support/peers';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const listeners = (doc: Y.Doc) =>
  (doc as unknown as { _observers: Map<string, Set<unknown>> })._observers.get('afterTransaction')?.size ?? 0;

function typed() {
  const doc = new Y.Doc();
  const client = peer(doc, 'a', [md('a', 'hello')]);
  client.editor.commands.setSelection(caret('a', 5));
  client.editor.insertText('!');
  return { doc, client };
}

describe('the undo history of a collaboration', () => {
  it('stays through a disconnect and connect in one task, as StrictMode remounts', () => {
    const { client } = typed();
    client.unmount();
    client.editor.mount();
    vi.advanceTimersByTime(100);
    expect(client.editor.commands.undo()).toBe(true);
    expect(client.editor.getBlocks()).toEqual([md('a', 'hello')]);
  });

  it('stays through a connect within a frame of the disconnect', async () => {
    const { client } = typed();
    client.unmount();
    await Promise.resolve();
    client.editor.mount();
    vi.advanceTimersByTime(100);
    expect(client.editor.commands.undo()).toBe(true);
  });

  it('counts the frame from the latest disconnect', async () => {
    const { client } = typed();
    client.unmount();
    await Promise.resolve();
    vi.advanceTimersByTime(5);
    const unmount = client.editor.mount();
    vi.advanceTimersByTime(9);
    unmount();
    await Promise.resolve();
    vi.advanceTimersByTime(3);
    client.editor.mount();
    expect(client.editor.commands.undo()).toBe(true);
  });

  it('is let go when the collaboration stays disconnected longer, and a later connect starts afresh', async () => {
    const { doc, client } = typed();
    client.unmount();
    await Promise.resolve();
    vi.advanceTimersByTime(100);
    expect(listeners(doc)).toBe(0);
    client.editor.mount();
    expect(client.editor.can().undo()).toBe(false);
    client.editor.commands.setSelection(caret('a', 6));
    client.editor.insertText('?');
    expect(client.editor.commands.undo()).toBe(true);
    expect(client.editor.getBlocks()).toEqual([md('a', 'hello!')]);
  });
});
