import * as Y from 'yjs';
import { coreExtensions, type Extension } from 'quoin-editor/engine';
import type { RenderOptions } from 'quoin-editor/headless';
import { collaborationExtension, presenceExtension, yjsCollaboration } from 'quoin-editor/yjs';
import { localAwareness, stillCollaborators } from './collab-canvas';

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

const PRESENT = [100, 300, 500, 700, 900];

/**
 * The core extensions with a Yjs document whose every update reaches a second document, as a provider would send it,
 * and the text of a block as that second document holds it. With `presence`, that many collaborators sit still in the
 * document, their selections and carets drawn.
 */
export function collaborative(presence = 0): {
  extensions: Extension[];
  sharedText: (index: number) => string;
  render?: RenderOptions;
} {
  const doc = new Y.Doc();
  const peer = new Y.Doc();
  doc.on('update', (update: Uint8Array) => Y.applyUpdate(peer, update));
  const awareness = presence > 0 ? localAwareness(doc.clientID) : undefined;
  const collaboration = yjsCollaboration({ doc, user: { name: 'Harness' }, awareness });
  const sharedText = (index: number) => blockText(peer.getText('quoin'), index);
  const extensions = [...coreExtensions(), collaborationExtension(collaboration)];
  if (awareness === undefined) return { extensions, sharedText };
  stillCollaborators(awareness, PRESENT.slice(0, presence));
  const shown = presenceExtension(collaboration);
  return { extensions: [...extensions, shown], sharedText, render: (shown.ui as { render: RenderOptions }).render };
}
