import * as Y from 'yjs';
import { collaborationExtension } from '../../engine/collab/collaboration-extension';
import { coreExtensions, type CoreCommands } from '../../engine/extension/core-extensions';
import { createEditor } from '../../engine/extension/editor';
import { yjsCollaboration } from '../../yjs/index';
import { FakeAwareness } from '../../yjs/test-support/fake-awareness';
import { linkOf, setActive } from './presence-link';
import { presenceExtension } from './presence-extension';
import { caret, md } from './test-support/presence-peer';

const ada = { name: 'Ada', color: '#e11d48' };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('one collaboration given to a second editor, which stays unconnected', () => {
  it('leaves awareness to the connected editor, which takes the user out when it unmounts', async () => {
    const awareness = new FakeAwareness(1);
    const collaboration = yjsCollaboration({ doc: new Y.Doc(), user: ada, awareness, onError: () => undefined });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const editorOf = () =>
      createEditor<CoreCommands>({
        blocks: [md('a', 'hello world')],
        isMac: true,
        extensions: [...coreExtensions(), collaborationExtension(collaboration), presenceExtension(collaboration)],
      });
    const first = editorOf();
    const unmountFirst = first.mount();
    setActive(linkOf(first), true);
    first.commands.setSelection(caret('a', 5));
    vi.advanceTimersByTime(60);
    const shared = awareness.getLocalState();
    const unmountSecond = editorOf().mount();
    vi.advanceTimersByTime(60);
    unmountSecond();
    await Promise.resolve();
    expect(awareness.getLocalState()).toEqual(shared);
    expect(shared).toMatchObject({ user: ada, selection: { head: { block: 'a', offset: 5 } } });
    unmountFirst();
    await Promise.resolve();
    expect(awareness.getLocalState()).toEqual({ user: null, selection: null });
    warn.mockRestore();
  });
});
