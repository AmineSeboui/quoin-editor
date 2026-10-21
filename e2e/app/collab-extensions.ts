import * as Y from 'yjs';
import { coreExtensions, type Extension } from 'quoin-editor/engine';
import { collaborationExtension, yjsCollaboration, type YBlock } from 'quoin-editor/yjs';

/**
 * The core extensions with a Yjs document whose every update reaches a second document, as a provider would send it,
 * and the text of a block as that second document holds it.
 */
export function collaborative(): { extensions: Extension[]; sharedText: (index: number) => string } {
  const doc = new Y.Doc();
  const peer = new Y.Doc();
  doc.on('update', (update: Uint8Array) => Y.applyUpdate(peer, update));
  const collaboration = yjsCollaboration({ doc, user: { name: 'Harness' } });
  const sharedText = (index: number) => {
    const regions = peer.getArray<YBlock>('quoin').get(index)?.get('regions') as Y.Map<Y.Text> | undefined;
    return regions?.get('text')?.toString() ?? '';
  };
  return { extensions: [...coreExtensions(), collaborationExtension(collaboration)], sharedText };
}
