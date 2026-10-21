import * as Y from 'yjs';
import { collaborationExtension } from '../../engine/collab/collaboration-extension';
import type { CoreCommands } from '../../engine/extension/core-extensions';
import { coreExtensions } from '../../engine/extension/core-extensions';
import { createEditor, type Editor } from '../../engine/extension/editor';
import type { QuoinBlock } from '../../engine/model/quoin-block';
import { yjsCollaboration, type YjsCollaborationOptions } from '../index';

const SYNC = 'sync';

/** Two documents that exchange updates only when told to, as two clients of a slow provider. */
export function linkedDocs() {
  const docs = [new Y.Doc(), new Y.Doc()] as const;
  const pending: [Uint8Array[], Uint8Array[]] = [[], []];
  docs.forEach((doc, from) =>
    doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin !== SYNC) pending[1 - from].push(update);
    }),
  );
  const deliver = (to: 0 | 1) => {
    for (const update of pending[to].splice(0)) Y.applyUpdate(docs[to], update, SYNC);
  };
  const flush = () => {
    while (pending[0].length > 0 || pending[1].length > 0) {
      deliver(0);
      deliver(1);
    }
  };
  return { docs, deliver, flush, pending };
}

export type Peer = {
  editor: Editor<CoreCommands>;
  collaboration: ReturnType<typeof yjsCollaboration>;
  unmount: () => void;
  clock: { now: number };
};

type PeerOptions = Partial<YjsCollaborationOptions> & { mount?: boolean };

/** An editor on `doc`, mounted and so connected unless told not to, whose new block ids start with `name`. */
export function peer(
  doc: Y.Doc,
  name: string,
  blocks: readonly QuoinBlock[] = [],
  { mount = true, ...options }: PeerOptions = {},
): Peer {
  let next = 0;
  const newId = () => `${name}${++next}`;
  const clock = { now: 0 };
  const collaboration = yjsCollaboration({ doc, user: { name }, ...options });
  const editor = createEditor<CoreCommands>({
    blocks,
    newId,
    now: () => clock.now,
    isMac: true,
    extensions: [...coreExtensions({ newId }), collaborationExtension(collaboration)],
  });
  return { editor, collaboration, unmount: mount ? editor.mount() : () => undefined, clock };
}
