import * as Y from 'yjs';
import { collaborationExtension, presenceExtension, yjsCollaboration, type YjsAwareness } from 'quoin-editor/yjs';
import { broadcastProvider } from './broadcast-provider';

/**
 * Collaboration and presence for a canvas page, shared with the other pages of its browser context. The first page
 * seeds the document; a page opened with `seed=0` takes it from the others.
 */
export function collaborativeCanvas(params: URLSearchParams) {
  const doc = new Y.Doc();
  const { awareness, leave } = broadcastProvider(doc, params.get('collab') ?? 'quoin');
  window.__quoinLeave = leave;
  const user = { name: params.get('user') ?? 'Ada', color: params.get('color') ?? undefined };
  const seed = params.get('seed') === '0' ? false : 'if-empty';
  const collaboration = yjsCollaboration({ doc, awareness, user, seed });
  return [collaborationExtension(collaboration), presenceExtension(collaboration)];
}

/** Collaborators that sit in a document and never move, for measuring what drawing them costs. */
export function stillCollaborators(awareness: { setRemote(client: number, state: object): void }, blocks: number[]) {
  blocks.forEach((block, i) => {
    const at = { block: `p${block}`, region: 'text', offset: 10 };
    const user = { name: `Collaborator ${i + 1}`, color: '#1d4ed8' };
    awareness.setRemote(100 + i, { user, selection: { anchor: { ...at, offset: 4 }, head: at } });
  });
}

/** An awareness no other page hears, whose collaborators the harness sets itself. */
export function localAwareness(clientID: number): YjsAwareness & { setRemote(client: number, state: object): void } {
  const states = new Map<number, Record<string, unknown>>();
  const listeners = new Set<() => void>();
  const changed = () => listeners.forEach((listener) => listener());
  return {
    clientID,
    getLocalState: () => states.get(clientID) ?? null,
    getStates: () => states,
    setLocalStateField(field, value) {
      states.set(clientID, { ...states.get(clientID), [field]: value });
      changed();
    },
    setRemote(client, state) {
      states.set(client, state as Record<string, unknown>);
      changed();
    },
    on: (_event, listener) => void listeners.add(listener as () => void),
    off: (_event, listener) => void listeners.delete(listener as () => void),
  };
}
