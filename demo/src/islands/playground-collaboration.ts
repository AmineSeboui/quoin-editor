import * as Y from 'yjs';
import type { Extension } from 'quoin-editor/engine';
import { presenceExtension, type PresenceLabels } from 'quoin-editor/presence';
import { collaborationExtension, yjsCollaboration } from 'quoin-editor/yjs';
import { broadcastProvider } from './broadcast-provider';

export type Peer = { name: string; color: string; seeds: boolean };

export const WRITER: Peer = { name: 'You', color: '#1d4ed8', seeds: true };
export const PARTNER: Peer = { name: 'Grace', color: '#b91c1c', seeds: false };

/**
 * One side of a shared document. Each side keeps its own Yjs document and they reconcile over a BroadcastChannel,
 * which stands in for the server a host would run. Only the seeding side writes the starting text.
 */
export function collaborating(
  channel: string,
  { name, color, seeds }: Peer,
  labels: Partial<PresenceLabels> | undefined,
): { extensions: Extension[]; leave: () => void } {
  const doc = new Y.Doc();
  const { awareness, leave } = broadcastProvider(doc, channel);
  const collaboration = yjsCollaboration({
    doc,
    awareness,
    user: { name, color },
    seed: seeds ? 'if-empty' : false,
  });
  return {
    extensions: [collaborationExtension(collaboration), presenceExtension(collaboration, { labels })],
    leave: () => {
      leave();
      doc.destroy();
    },
  };
}
