import * as Y from 'yjs';
import type { Transaction } from '../../engine/state/transaction';
import { getPluginState } from '../../engine/state/editor-state';
import { linkOf, setActive } from './presence-link';
import { presenceKey } from './presence-plugin';
import { caret, md, presencePeer } from './test-support/presence-peer';

const ada = { name: 'Ada', color: '#e11d48' };
const at = (offset: number) => ({ block: 'a', region: 'text', offset });
const selectionWrites = (writes: { field: string; value: unknown }[]) =>
  writes.filter(({ field }) => field === 'selection');
const idle = (peer: ReturnType<typeof presencePeer>) => getPluginState(peer.editor.state, presenceKey)[0]?.idle;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('the local selection written to awareness', () => {
  it('names the user once mounted, and writes the selection at most once every 50 ms, ending on the last one', () => {
    const peer = presencePeer(new Y.Doc(), 1, [md('a', 'hello world')], ada);
    expect(peer.awareness.getLocalState()).toEqual({
      user: ada,
      selection: null,
    });
    peer.activate();
    vi.advanceTimersByTime(60);
    peer.awareness.writes.length = 0;
    for (let offset = 1; offset <= 8; offset++) {
      peer.editor.commands.setSelection(caret('a', offset));
      vi.advanceTimersByTime(10);
    }
    vi.advanceTimersByTime(100);
    const writes = selectionWrites(peer.awareness.writes);
    expect(writes.length).toBeGreaterThanOrEqual(2);
    expect(writes.length).toBeLessThanOrEqual(3);
    expect(writes.at(-1)?.value).toMatchObject({ anchor: at(8), head: at(8) });
  });

  it('shares the selection at once when it starts while the canvas is already active', () => {
    const peer = presencePeer(new Y.Doc(), 1, [md('a', 'hello world')], ada);
    peer.activate();
    peer.editor.commands.setSelection(caret('a', 4));
    vi.advanceTimersByTime(60);
    peer.unmount();
    expect(peer.awareness.getLocalState()?.selection).toBeNull();
    setActive(linkOf(peer.editor), true);
    const unmount = peer.editor.mount();
    vi.advanceTimersByTime(10);
    expect(peer.awareness.getLocalState()?.selection).toMatchObject({ head: at(4) });
    unmount();
  });

  it('clears the selection while the editor is unfocused or read-only, and writes nothing until active again', () => {
    const peer = presencePeer(new Y.Doc(), 1, [md('a', 'hello world')], ada);
    peer.activate();
    peer.editor.commands.setSelection(caret('a', 3));
    vi.advanceTimersByTime(60);
    expect(peer.awareness.getLocalState()?.selection).toMatchObject({
      head: at(3),
    });

    peer.activate(false);
    expect(peer.awareness.getLocalState()?.selection).toBeNull();
    peer.awareness.writes.length = 0;
    peer.editor.commands.setSelection(caret('a', 5));
    vi.advanceTimersByTime(200);
    expect(peer.awareness.writes).toEqual([]);

    peer.activate();
    vi.advanceTimersByTime(60);
    expect(peer.awareness.getLocalState()?.selection).toMatchObject({
      head: at(5),
    });
  });

  it('shares the caret an undo of this client puts back, as its own move', () => {
    const peer = presencePeer(new Y.Doc(), 1, [md('a', 'hello world')], ada);
    peer.activate();
    peer.editor.commands.setSelection(caret('a', 5));
    peer.editor.insertText('!');
    peer.editor.commands.setSelection(caret('a', 2));
    vi.advanceTimersByTime(60);
    peer.editor.commands.undo();
    vi.advanceTimersByTime(60);
    expect(peer.awareness.getLocalState()?.selection).toMatchObject({ head: at(5) });
  });

  it('leaves awareness when unmounted, so the others see the person leave, but not when mounted again at once', async () => {
    const peer = presencePeer(new Y.Doc(), 1, [md('a', 'hello world')], ada);
    peer.unmount();
    const unmount = peer.editor.mount();
    await Promise.resolve();
    expect(peer.awareness.getLocalState()?.user).toEqual(ada);
    unmount();
    await Promise.resolve();
    expect(peer.awareness.getLocalState()).toEqual({ user: null, selection: null });
  });

  it('clears the selection and stops listening when unmounted, with no timer left behind', () => {
    const peer = presencePeer(new Y.Doc(), 1, [md('a', 'hello world')], ada);
    peer.activate();
    peer.editor.commands.setSelection(caret('a', 3));
    peer.awareness.setRemote(7, {
      user: ada,
      selection: { anchor: at(1), head: at(1) },
    });
    peer.unmount();
    expect(peer.awareness.getLocalState()?.selection).toBeNull();
    expect(peer.awareness.listeners.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('collaborators read from awareness', () => {
  it('apply as a remote change kept out of the history, which moves neither the selection nor the document', () => {
    const peer = presencePeer(new Y.Doc(), 1, [md('a', 'hello world')], ada);
    const seen: Transaction[] = [];
    peer.editor.subscribe((_, tr) => tr && seen.push(tr));
    const before = peer.editor.state;
    peer.awareness.setRemote(7, {
      user: ada,
      selection: { anchor: at(2), head: at(2) },
    });
    expect(seen).toHaveLength(1);
    expect(seen[0].origin).toBe('remote');
    expect(seen[0].addToHistory).toBe(false);
    expect(peer.editor.state.doc).toBe(before.doc);
    expect(peer.editor.state.selection).toBe(before.selection);
    peer.awareness.setRemote(7, {
      user: ada,
      selection: { anchor: at(2), head: at(2) },
    });
    expect(seen).toHaveLength(1);
  });

  it('fade the name of a collaborator idle for 2 s, and show it again when its selection moves', () => {
    const peer = presencePeer(new Y.Doc(), 1, [md('a', 'hello world')], ada);
    peer.awareness.setRemote(7, {
      user: ada,
      selection: { anchor: at(2), head: at(2) },
    });
    vi.advanceTimersByTime(1900);
    expect(idle(peer)).toBe(false);
    vi.advanceTimersByTime(200);
    expect(idle(peer)).toBe(true);
    peer.awareness.setRemote(7, {
      user: ada,
      selection: { anchor: at(3), head: at(3) },
    });
    expect(idle(peer)).toBe(false);
  });

  it('say who joined and who left, but not who was already there', () => {
    const doc = new Y.Doc();
    const peer = presencePeer(doc, 1, [md('a', 'hello world')], ada);
    const heard = vi.fn();
    peer.unmount();
    peer.awareness.setRemote(5, { user: { name: 'Bea' }, selection: null });
    linkOf(peer.editor).listeners.add(heard);
    const unmount = peer.editor.mount();
    expect(heard).not.toHaveBeenCalled();

    peer.awareness.setRemote(7, { user: ada, selection: null });
    peer.awareness.setRemote(5, {
      user: { name: 'Bea' },
      selection: { anchor: at(1), head: at(1) },
    });
    peer.awareness.setRemote(5, null);
    expect(heard.mock.calls).toEqual([
      [{ joined: [{ client: 7, name: 'Ada' }], left: [] }],
      [{ joined: [], left: [{ client: 5, name: 'Bea' }] }],
    ]);
    unmount();
  });
});
