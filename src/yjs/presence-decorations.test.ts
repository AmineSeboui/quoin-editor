import * as Y from 'yjs';
import type { Decoration } from '../engine/extension/types';
import { linkedDocs } from './test-support/peers';
import { linkAwareness } from './test-support/fake-awareness';
import { caret, md, presencePeer } from './test-support/presence-peer';

const ada = { name: 'Ada', color: '#e11d48' };
const at = (block: string, offset: number) => ({
  block,
  region: 'text',
  offset,
});

const presence = (decorations: readonly Decoration[]) =>
  decorations.filter((decoration) => JSON.stringify(decoration).includes('presence'));

afterEach(() => vi.useRealTimers());

describe('presence drawn from an awareness state', () => {
  it('tints a collaborator selection with its colour and puts its named caret at the head', () => {
    const peer = presencePeer(new Y.Doc(), 1, [md('a', 'hello world'), md('b', 'second line')]);
    peer.awareness.setRemote(7, {
      user: ada,
      selection: { anchor: at('a', 6), head: at('b', 3) },
    });

    expect(presence(peer.editor.decorations())).toEqual([
      {
        kind: 'inline',
        block: 'a',
        region: 'text',
        from: 6,
        to: 11,
        attrs: {
          class: 'quoin-presence-selection',
          style: '--quoin-presence:#e11d48',
        },
      },
      {
        kind: 'inline',
        block: 'b',
        region: 'text',
        from: 0,
        to: 3,
        attrs: {
          class: 'quoin-presence-selection',
          style: '--quoin-presence:#e11d48',
        },
      },
      {
        kind: 'widget',
        block: 'b',
        region: 'text',
        offset: 3,
        key: 'presence:7',
        widget: 'presence-caret',
        attrs: { 'data-name': 'Ada', style: '--quoin-presence:#e11d48' },
        side: -1,
      },
    ]);
  });

  it('draws nothing for this client, for a state without a user, or for a block that is gone', () => {
    const peer = presencePeer(new Y.Doc(), 1, [md('a', 'hello')]);
    peer.awareness.setRemote(1, {
      user: ada,
      selection: { anchor: at('a', 1), head: at('a', 1) },
    });
    peer.awareness.setRemote(8, {
      selection: { anchor: at('a', 1), head: at('a', 1) },
    });
    peer.awareness.setRemote(9, {
      user: ada,
      selection: { anchor: at('gone', 1), head: at('gone', 1) },
    });
    peer.awareness.setRemote(10, { user: ada, selection: null });
    expect(presence(peer.editor.decorations())).toEqual([]);
  });

  it('leaves out a colour that is not a plain colour, so no style a collaborator writes reaches the page', () => {
    const peer = presencePeer(new Y.Doc(), 1, [md('a', 'hello')]);
    const color = 'red; background-image: url(https://example.test/x.png)';
    peer.awareness.setRemote(7, {
      user: { name: 'Eve', color },
      selection: { anchor: at('a', 0), head: at('a', 2) },
    });
    const drawn = presence(peer.editor.decorations());
    expect(drawn.map((decoration) => decoration.attrs)).toEqual([
      { class: 'quoin-presence-selection' },
      { 'data-name': 'Eve' },
    ]);
  });

  it('moves a collaborator caret with the text this client types before it', () => {
    const peer = presencePeer(new Y.Doc(), 1, [md('a', 'hello world')]);
    peer.awareness.setRemote(7, {
      user: ada,
      selection: { anchor: at('a', 6), head: at('a', 6) },
    });
    peer.editor.commands.setSelection(caret('a', 0));
    peer.editor.insertText('Oh, ');
    expect(presence(peer.editor.decorations())).toMatchObject([{ kind: 'widget', offset: 10 }]);
  });

  it('keeps a collaborator caret before what this client types right at it', () => {
    const peer = presencePeer(new Y.Doc(), 1, [md('a', 'hello world')]);
    peer.awareness.setRemote(7, { user: ada, selection: { anchor: at('a', 5), head: at('a', 5) } });
    peer.editor.commands.setSelection(caret('a', 5));
    peer.editor.insertText('!');
    expect(presence(peer.editor.decorations())).toMatchObject([{ kind: 'widget', offset: 5 }]);
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
    expect(presence(two.editor.decorations())).toMatchObject([{ kind: 'widget', block: 'a', offset: 6 }]);

    two.editor.commands.setSelection(caret('a', 0));
    two.editor.insertText('Well, ');
    flush();
    expect(presence(two.editor.decorations())).toMatchObject([{ kind: 'widget', block: 'a', offset: 12 }]);
    const written = one.awareness.getLocalState()?.selection as {
      head: { offset: number };
    };
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
    const { selection } = one.awareness.getLocalState() as {
      selection: { head: Record<string, unknown> };
    };
    const stale = { ...selection.head, offset: 2 };
    two.awareness.setRemote(1, {
      user: ada,
      selection: { anchor: stale, head: stale },
    });
    expect(presence(two.editor.decorations())).toMatchObject([{ kind: 'widget', offset: 8 }]);
  });

  it('places a caret written before its text arrived once that text has, a task after the change', () => {
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
    const origins: string[] = [];
    one.editor.subscribe((_, tr) => tr && origins.push(tr.origin));
    flush();
    expect(origins).toEqual(['remote']);
    vi.advanceTimersByTime(0);
    expect(one.editor.getBlocks()[0].data.markdown).toBe('helloXY world');
    expect(presence(one.editor.decorations())).toMatchObject([{ kind: 'widget', offset: 7 }]);
  });
});
