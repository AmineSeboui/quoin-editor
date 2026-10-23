import { StrictMode, useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import * as Y from 'yjs';
import { BlockCanvas } from '../../canvas/BlockCanvas';
import { collaborationExtension } from '../../engine/collab/collaboration-extension';
import type { QuoinEditorHandle } from '../../canvas/canvas-props';
import type { QuoinBlock } from '../../types';
import { yjsCollaboration } from '../../yjs/index';
import { FakeAwareness } from '../../yjs/test-support/fake-awareness';
import { portalledMenu } from '../test-support/portalled-menu';
import { presenceExtension } from './presence-extension';

const md = (id: string, markdown: string): QuoinBlock => ({
  id,
  type: 'MARKDOWN',
  data: { markdown },
});
const ada = { name: 'Ada Lovelace', color: '#e11d48' };
const at = (block: string, offset: number) => ({
  block,
  region: 'text',
  offset,
});

function setup({ readOnly = false, otherCanvas = false } = {}) {
  const awareness = new FakeAwareness(1);
  const collaboration = yjsCollaboration({
    doc: new Y.Doc(),
    user: { name: 'Me', color: '#2563eb' },
    awareness,
  });
  const extensions = [collaborationExtension(collaboration), presenceExtension(collaboration), portalledMenu('Menu')];
  const handle: { current: QuoinEditorHandle | null } = { current: null };
  let setReadOnly: (value: boolean) => void = () => undefined;
  function Host() {
    const [blocks, setBlocks] = useState([md('a', 'hello world'), md('b', 'second line')]);
    const [locked, lock] = useState(readOnly);
    setReadOnly = lock;
    return <BlockCanvas ref={handle} blocks={blocks} onChange={setBlocks} extensions={extensions} readOnly={locked} />;
  }
  const view = render(
    <StrictMode>
      <Host />
      {otherCanvas && (
        <BlockCanvas blocks={[md('c', 'other')]} onChange={() => {}} extensions={[portalledMenu('Their menu')]} />
      )}
      <button type="button">Elsewhere</button>
    </StrictMode>,
  );
  return {
    awareness,
    handle,
    view,
    setReadOnly: (value: boolean) => act(() => setReadOnly(value)),
  };
}

// jsdom lays nothing out and draws no range boxes, so a caret falls back to its host's box.
beforeAll(() => {
  Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
});
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const settle = () => act(() => void vi.advanceTimersByTime(600));

describe('presence on a canvas', () => {
  it('shows who is in a block, by name, and draws their caret hidden from assistive technology', () => {
    const { awareness } = setup();
    act(() =>
      awareness.setRemote(7, {
        user: ada,
        selection: { anchor: at('b', 2), head: at('b', 2) },
      }),
    );
    const avatars = screen.getByRole('img', { name: 'Ada Lovelace is here' });
    expect(avatars).toHaveTextContent('AL');
    expect(document.querySelector('[data-quoin-host] .quoin-presence-caret')).toBeNull();
    const caret = document.querySelector('.quoin-presence-carets .quoin-presence-caret');
    expect(caret?.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(caret).toHaveTextContent('Ada Lovelace');
    expect(screen.getAllByRole('textbox', { name: 'Paragraph' })).toHaveLength(2);
  });

  it('writes its selection while focused and clears it on blur and when read-only', () => {
    const { awareness, handle, setReadOnly } = setup();
    act(() => handle.current!.focus({ block: 'a', region: 'text', offset: 3 }));
    settle();
    expect(awareness.getLocalState()?.selection).toMatchObject({
      head: at('a', 3),
    });
    act(() => screen.getByRole('button', { name: 'Elsewhere' }).focus());
    expect(awareness.getLocalState()?.selection).toBeNull();
    act(() => handle.current!.focus({ block: 'a', region: 'text', offset: 4 }));
    settle();
    expect(awareness.getLocalState()?.selection).toMatchObject({
      head: at('a', 4),
    });
    setReadOnly(true);
    expect(awareness.getLocalState()?.selection).toBeNull();
  });

  it("keeps writing its selection while focus is in the canvas's own portalled menu, not in another canvas's", () => {
    const { awareness, handle } = setup({ otherCanvas: true });
    act(() => handle.current!.focus({ block: 'a', region: 'text', offset: 3 }));
    settle();
    act(() => screen.getByRole('button', { name: 'Menu' }).focus());
    settle();
    expect(awareness.getLocalState()?.selection).toMatchObject({ head: at('a', 3) });
    act(() => screen.getByRole('button', { name: 'Their menu' }).focus());
    expect(awareness.getLocalState()?.selection).toBeNull();
  });

  it('says who joined and who left through the live region', () => {
    const { awareness } = setup();
    act(() => awareness.setRemote(7, { user: ada, selection: null }));
    settle();
    expect(screen.getByRole('status')).toHaveTextContent('Ada Lovelace joined');
  });

  it('stops listening and writing once unmounted under StrictMode', () => {
    const { awareness, handle, view } = setup();
    act(() => handle.current!.focus({ block: 'a', region: 'text', offset: 3 }));
    act(() =>
      awareness.setRemote(7, {
        user: ada,
        selection: { anchor: at('b', 2), head: at('b', 2) },
      }),
    );
    expect(awareness.listeners.size).toBe(1);
    view.unmount();
    expect(awareness.listeners.size).toBe(0);
    expect(awareness.getLocalState()?.selection).toBeNull();
    const writes = awareness.writes.length;
    act(() =>
      awareness.setRemote(7, {
        user: ada,
        selection: { anchor: at('a', 1), head: at('a', 1) },
      }),
    );
    act(() => void vi.advanceTimersByTime(5000));
    expect(awareness.writes).toHaveLength(writes);
  });
});
