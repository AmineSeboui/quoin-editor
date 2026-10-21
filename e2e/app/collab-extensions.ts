import * as Y from 'yjs';
import { coreExtensions, type Extension } from 'quoin-editor/engine';
import { collaborationExtension, yjsCollaboration } from 'quoin-editor/yjs';

// The characters of the block at `index` in a shared text, where a marker map starts each block.
function blockText(text: Y.Text, index: number): string {
  let block = -1;
  let found = '';
  for (const { insert } of text.toDelta() as { insert: unknown }[]) {
    if (insert instanceof Y.Map) block += 1;
    else if (block === index && typeof insert === 'string') found += insert;
  }
  return found;
}

/**
 * The core extensions with a Yjs document whose every update reaches a second document, as a provider would send it,
 * and the text of a block as that second document holds it.
 */
export function collaborative(): { extensions: Extension[]; sharedText: (index: number) => string } {
  const doc = new Y.Doc();
  const peer = new Y.Doc();
  doc.on('update', (update: Uint8Array) => Y.applyUpdate(peer, update));
  const collaboration = yjsCollaboration({ doc, user: { name: 'Harness' } });
  const sharedText = (index: number) => blockText(peer.getText('quoin'), index);
  return { extensions: [...coreExtensions(), collaborationExtension(collaboration)], sharedText };
}
