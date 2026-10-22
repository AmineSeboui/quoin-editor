import * as Y from 'yjs';
import { resetDevWarnings } from '../../dev-warn';
import { collaborationExtension } from '../../engine/collab/collaboration-extension';
import { coreExtensions } from '../../engine/extension/core-extensions';
import { createEditor } from '../../engine/extension/editor';
import type { Extension } from '../../engine/extension/types';
import { yjsCollaboration } from '../../yjs/index';
import { FakeAwareness } from '../../yjs/test-support/fake-awareness';
import { presenceExtension } from './presence-extension';

function mountWith(extensions: (collaboration: ReturnType<typeof yjsCollaboration>) => Extension[]) {
  const collaboration = yjsCollaboration({ doc: new Y.Doc(), user: { name: 'Ada' }, awareness: new FakeAwareness(1) });
  const editor = createEditor({ blocks: [], extensions: [...coreExtensions(), ...extensions(collaboration)] });
  return editor.mount();
}

beforeEach(() => resetDevWarnings());
afterEach(() => vi.restoreAllMocks());

describe('presence without the collaboration it reads', () => {
  it('warns once in development that it shares nothing, however often it mounts', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mountWith((collaboration) => [presenceExtension(collaboration)])();
    mountWith((collaboration) => [presenceExtension(collaboration)])();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/presenceExtension.*collaborationExtension/);
  });

  it('says nothing beside the collaboration extension of the same collaboration', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mountWith((collaboration) => [collaborationExtension(collaboration), presenceExtension(collaboration)])();
    expect(warn).not.toHaveBeenCalled();
  });
});
