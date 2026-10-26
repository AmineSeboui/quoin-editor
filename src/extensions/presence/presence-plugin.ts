import { createPluginKey, type PluginSpec, type Selection } from '../../engine';
import { sameItems } from '../../engine/model/same-items';
import { mapSelection, sameSelection } from '../../engine/state/selection';

/** A collaborator as this editor draws it: `idle` once its selection has not moved for a while. */
export type Peer = {
  readonly client: number;
  readonly name: string;
  readonly color?: string;
  readonly selection: Selection | null;
  readonly idle: boolean;
};

export const presenceKey = createPluginKey<readonly Peer[]>('presence');

/** The meta of a transaction that hands the editor the collaborators it now sees. */
export const PRESENCE = 'presence';

export const samePeer = (a: Peer, b: Peer): boolean =>
  a.client === b.client &&
  a.name === b.name &&
  a.color === b.color &&
  a.idle === b.idle &&
  sameSelection(a.selection, b.selection);

export const samePeers = (a: readonly Peer[], b: readonly Peer[]): boolean => sameItems(a, b, samePeer);

const NO_PEERS: readonly Peer[] = [];

// Between two readings of awareness, the selections are carried through every change, each end kept before what is
// typed at it, as the Yjs relative positions it was read from keep it.
export const presencePlugin: PluginSpec<readonly Peer[]> = {
  key: presenceKey,
  init: () => NO_PEERS,
  apply(tr, peers) {
    const given = tr.getMeta<readonly Peer[]>(PRESENCE);
    if (given !== undefined) return given;
    if (!tr.docChanged) return peers;
    let moved = false;
    const next = peers.map((peer) => {
      const selection = peer.selection && mapSelection(peer.selection, (pos) => tr.mapPos(pos, -1), tr.before.doc);
      if (selection === peer.selection) return peer;
      moved = true;
      return { ...peer, selection };
    });
    return moved ? next : peers;
  },
};
