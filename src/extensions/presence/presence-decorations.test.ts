import * as Y from 'yjs';
import type { Editor } from '../../engine/extension/editor';
import type { Decoration } from '../../engine/extension/types';
import { getPluginState } from '../../engine/state/editor-state';
import { linkAwareness } from '../../yjs/test-support/fake-awareness';
import { linkedDocs } from '../../yjs/test-support/peers';
import { presenceKey } from './presence-plugin';
import { caret, md, presencePeer } from './test-support/presence-peer';

const ada = { name: 'Ada', color: '#e11d48' };
const bea = { name: 'Bea', color: '#1d4ed8' };
const at = (block: string, offset: number) => ({ block, region: 'text', offset });
const still = (block: string, offset: number) => ({ anchor: at(block, offset), head: at(block, offset) });

const tints = (decorations: readonly Decoration[]) =>
  decorations.filter((decoration) => decoration.attrs.class === 'quoin-presence-selection');

// Where the editor puts each collaborator's caret: the head of the selection it holds for them.
const heads = (editor: Editor) =>
  getPluginState(editor.state, presenceKey).map(({ client, selection }) => ({
    client,
    head: selection?.kind === 'text' ? selection.head : null,
  }));

afterEach(() => vi.useRealTimers());

describe('presence drawn from an awareness state', () => {
  it('tints a collaborator selection with its colour, and keeps its caret at the head', () => {
    const peer = presencePeer(new Y.Doc(), 1, [md('a', 'hello world'), md('b', 'second line')]);
    peer.awareness.setRemote(7, { user: ada, selection: { anchor: at('a', 6), head: at('b', 3) } });
    const attrs = { class: 'quoin-presence-selection', style: '--quoin-presence:#e11d48' };
    expect(peer.editor.decorations().filter((decoration) => decoration.attrs.class?.includes('presence'))).toEqual([
      { kind: 'inline', block: 'a', region: 'text', from: 6, to: 11, attrs },
      { kind: 'inline', block: 'b', region: 'text', from: 0, to: 3, attrs },
    ]);
    expect(heads(peer.editor)).toEqual([{ client: 7, head: at('b', 3) }]);
    expect(peer.editor.decorations().some((decoration) => decoration.kind === 'widget')).toBe(false);
  });

  it('holds nothing for this client, for a state without a user, or for a block that is gone', () => {
    const peer = presencePeer(new Y.Doc(), 1, [md('a', 'hello')]);
    peer.awareness.setRemote(1, { user: ada, selection: still('a', 1) });
    peer.awareness.setRemote(8, { selection: still('a', 1) });
    peer.awareness.setRemote(9, { user: ada, selection: still('gone', 1) });
    peer.awareness.setRemote(10, { user: ada, selection: null });
    expect(heads(peer.editor)).toEqual([
      { client: 9, head: null },
      { client: 10, head: null },
    ]);
    expect(tints(peer.editor.decorations())).toEqual([]);
  });

  it('leaves out a colour that is not a plain colour, so no style a collaborator writes reaches the page', () => {
    const peer = presencePeer(new Y.Doc(), 1, [md('a', 'hello')]);
    const color = 'red; background-image: url(https://example.test/x.png)';
    peer.awareness.setRemote(7, { user: { name: 'Eve', color }, selection: { anchor: at('a', 0), head: at('a', 2) } });
    expect(tints(peer.editor.decorations()).map(({ attrs }) => attrs)).toEqual([{ class: 'quoin-presence-selection' }]);
    expect(getPluginState(peer.editor.state, presenceKey)[0].color).toBeUndefined();
  });

  it('draws again only the collaborator that changed: the decorations of the others stay the same objects', () => {
    const peer = presencePeer(new Y.Doc(), 1, [md('a', 'hello world'), md('b', 'second line')]);
    peer.awareness.setRemote(7, { user: ada, selection: { anchor: at('a', 0), head: at('a', 5) } });
    peer.awareness.setRemote(8, { user: bea, selection: { anchor: at('b', 0), head: at('b', 6) } });
    const [adaTint, beaTint] = tints(peer.editor.decorations());
    const [adaPeer] = getPluginState(peer.editor.state, presenceKey);
    peer.awareness.setRemote(8, { user: bea, selection: { anchor: at('b', 1), head: at('b', 6) } });
    const [adaAfter, beaAfter] = tints(peer.editor.decorations());
    expect(getPluginState(peer.editor.state, presenceKey)[0]).toBe(adaPeer);
    expect(adaAfter).toBe(adaTint);
    expect(beaAfter).not.toBe(beaTint);
    expect(beaAfter).toMatchObject({ block: 'b', from: 1, to: 6 });
  });

  it('moves a collaborator caret with the text this client types before it', () => {
    const peer = presencePeer(new Y.Doc(), 1, [md('a', 'hello world')]);
    peer.awareness.setRemote(7, { user: ada, selection: still('a', 6) });
    peer.editor.commands.setSelection(caret('a', 0));
    peer.editor.insertText('Oh, ');
    expect(heads(peer.editor)).toEqual([{ client: 7, head: at('a', 10) }]);
  });

  it('keeps a collaborator caret before what this client types right at it', () => {
    const peer = presencePeer(new Y.Doc(), 1, [md('a', 'hello world')]);
    peer.awareness.setRemote(7, { user: ada, selection: still('a', 5) });
    peer.editor.commands.setSelection(caret('a', 5));
    peer.editor.insertText('!');
    expect(heads(peer.editor)).toEqual([{ client: 7, head: at('a', 5) }]);
  });

  it('keeps the caret on its character by its relative position while another client types before it', () => {
    const { docs, flush } = linkedDocs();
    const one = presencePeer(docs[0], 1, [md('a', 'hello world')]);
    const two = presencePeer(docs[1], 2, []);
    flush();
    linkAwareness(one.awareness, two.awareness);
    vi.useFakeTimers();
    one.activate();
    one.editor.commands.setSelection(caret('a', 6));
    vi.advanceTimersByTime(60);
    expect(heads(two.editor)).toEqual([{ client: 1, head: at('a', 6) }]);
    two.editor.commands.setSelection(caret('a', 0));
    two.editor.insertText('Well, ');
    flush();
    expect(heads(two.editor)).toEqual([{ client: 1, head: at('a', 12) }]);
    const written = one.awareness.getLocalState()?.selection as { head: { offset: number } };
    expect(written.head.offset).toBe(6);
  });

  it('takes the relative position over the offset when both are given and the relative one resolves', () => {
    const { docs, flush } = linkedDocs();
    const one = presencePeer(docs[0], 1, [md('a', 'hello world')]);
    const two = presencePeer(docs[1], 2, []);
    flush();
    vi.useFakeTimers();
    one.activate();
    one.editor.commands.setSelection(caret('a', 8));
    vi.advanceTimersByTime(60);
    const { selection } = one.awareness.getLocalState() as { selection: { head: Record<string, unknown> } };
    const stale = { ...selection.head, offset: 2 };
    two.awareness.setRemote(1, { user: ada, selection: { anchor: stale, head: stale } });
    expect(heads(two.editor)).toEqual([{ client: 1, head: at('a', 8) }]);
  });

  it('places a caret written before its text arrived as soon as that text has', () => {
    const { docs, flush } = linkedDocs();
    const one = presencePeer(docs[0], 1, [md('a', 'hello world')]);
    const two = presencePeer(docs[1], 2, []);
    flush();
    linkAwareness(one.awareness, two.awareness);
    vi.useFakeTimers();
    two.activate();
    two.editor.commands.setSelection(caret('a', 5));
    two.editor.insertText('XY');
    vi.advanceTimersByTime(60);
    flush();
    expect(one.editor.getBlocks()[0].data.markdown).toBe('helloXY world');
    expect(heads(one.editor)).toEqual([{ client: 2, head: at('a', 7) }]);
  });
});
