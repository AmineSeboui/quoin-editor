import type * as Y from 'yjs';
import { presenceExtension } from '../../extensions/presence/presence-extension';
import { collaborationExtension } from '../../engine/collab/collaboration-extension';
import { coreExtensions, type CoreCommands } from '../../engine/extension/core-extensions';
import { createEditor, type Editor } from '../../engine/extension/editor';
import type { QuoinBlock } from '../../engine/model/quoin-block';
import { yjsCollaboration } from '../index';
import { linkOf, setActive } from '../presence-link';
import { FakeAwareness } from './fake-awareness';

export type PresencePeer = {
  editor: Editor<CoreCommands>;
  awareness: FakeAwareness;
  /** Says whether the editor is focused and editable, as the canvas does. */
  activate(active?: boolean): void;
  unmount(): void;
};

/** An editor on `doc` with presence, mounted, whose awareness is a fake one with `client` as its id. */
export function presencePeer(
  doc: Y.Doc,
  client: number,
  blocks: readonly QuoinBlock[] = [],
  user: { name: string; color?: string } = {
    name: `user${client}`,
    color: '#123456',
  },
): PresencePeer {
  const awareness = new FakeAwareness(client);
  const collaboration = yjsCollaboration({ doc, user, awareness });
  const editor = createEditor<CoreCommands>({
    blocks,
    isMac: true,
    extensions: [...coreExtensions(), collaborationExtension(collaboration), presenceExtension(collaboration)],
  });
  const unmount = editor.mount();
  return {
    editor,
    awareness,
    activate: (active = true) => setActive(linkOf(editor), active),
    unmount,
  };
}

export const md = (id: string, markdown: string): QuoinBlock => ({
  id,
  type: 'MARKDOWN',
  data: { markdown },
});

export const caret = (block: string, offset: number) => ({
  kind: 'text' as const,
  anchor: { block, region: 'text', offset },
  head: { block, region: 'text', offset },
});
