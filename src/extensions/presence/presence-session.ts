import type * as Y from 'yjs';
import { sharedChange } from '../../engine/collab/apply-remote';
import type { CommandFactories } from '../../engine/commands/chain';
import type { Editor } from '../../engine/extension/editor';
import { getPluginState } from '../../engine/state/editor-state';
import { sameSelection } from '../../engine/state/selection';
import { fromAware, toAware } from '../../yjs/awareness';
import type { Shared } from '../../yjs/shared';
import type { YjsAwareness, YjsCollaboration } from '../../yjs/index';
import type { Person, PresenceLink } from './presence-link';
import { PRESENCE, presenceKey, samePeer, samePeers, type Peer } from './presence-plugin';

const THROTTLE_MS = 50;
const IDLE_MS = 2000;

// A colour goes into a style attribute, so only a hex colour, a name or a colour function of numbers is kept.
const COLOR = /^(#[\da-f]{3,8}|[a-z]+|(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\([\d\s.,%/+-]*\))$/i;
const safeColor = (value: unknown) => (typeof value === 'string' && COLOR.test(value) ? value : undefined);

type User = { name: string; color?: unknown };
const userOf = (state: Record<string, unknown>): User | null => {
  const { user } = state;
  return typeof user === 'object' && user !== null && typeof (user as User).name === 'string' ? (user as User) : null;
};

// The session that last named its user in each awareness, which alone takes the user out of it.
const namedBy = new WeakMap<YjsAwareness, object>();

type Seen = { name: string; key: string; idle: boolean; timer?: ReturnType<typeof setTimeout> };

export type PresenceSession = { activeChanged(): void; stop(): void };

/**
 * Shares this editor's selection through awareness while its view is active, and hands the editor the collaborators
 * awareness holds, as a remote change that moves nothing, whenever they or the shared text change.
 */
export function startPresence(
  editor: Editor<CommandFactories>,
  collaboration: YjsCollaboration,
  awareness: YjsAwareness,
  link: PresenceLink,
  sharedOf: () => Shared | null,
): PresenceSession {
  const { doc, user } = collaboration;
  const seen = new Map<number, Seen>();
  let heard = false;
  let writing = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let dirty = false;

  // An editor the collaboration did not connect, as a second one it was given, leaves awareness to the first.
  const bound = sharedOf() !== null;
  // This client's own writes change nothing it draws, so they are not read back.
  const put = (field: string, value: unknown) => {
    if (!bound) return;
    writing = true;
    try {
      awareness.setLocalStateField(field, value);
    } finally {
      writing = false;
    }
  };
  const write = (selection: unknown) => put('selection', selection);
  const tick = () => {
    timer = undefined;
    if (!dirty || !link.active) return;
    dirty = false;
    const shared = sharedOf();
    write(shared === null ? null : toAware(shared, editor.state.selection));
    timer = setTimeout(tick, THROTTLE_MS);
  };
  const schedule = () => {
    dirty = true;
    timer ??= setTimeout(tick, 0);
  };

  const refresh = () => {
    const before = getPluginState(editor.state, presenceKey);
    const peers: Peer[] = [];
    const joined: Person[] = [];
    const gone = new Set(seen.keys());
    for (const [client, state] of awareness.getStates()) {
      const found = client === awareness.clientID ? null : userOf(state);
      if (found === null) continue;
      gone.delete(client);
      const key = JSON.stringify(state.selection ?? null);
      let known = seen.get(client);
      if (known === undefined && heard) joined.push({ client, name: found.name });
      if (known?.key !== key) {
        clearTimeout(known?.timer);
        const fresh: Seen = { name: found.name, key, idle: false };
        fresh.timer = setTimeout(() => {
          fresh.idle = true;
          refresh();
        }, IDLE_MS);
        seen.set(client, (known = fresh));
      }
      const selection = fromAware(sharedOf(), editor.state.doc, editor.state.schema, state.selection);
      const peer = { client, name: found.name, color: safeColor(found.color), selection, idle: known.idle };
      // A collaborator that did not change keeps its object, and with it the decorations drawn for it.
      peers.push(before.find((last) => samePeer(last, peer)) ?? peer);
    }
    const left = [...gone].map((client) => {
      const { name, timer: idle } = seen.get(client)!;
      clearTimeout(idle);
      seen.delete(client);
      return { client, name };
    });
    if (heard && joined.length + left.length > 0)
      for (const listener of [...link.listeners]) listener({ joined, left });
    heard = true;
    if (samePeers(peers, before)) return;
    editor.dispatch(sharedChange(editor, []).setMeta(PRESENCE, peers));
  };
  const changed = () => {
    if (!writing) refresh();
  };
  const afterTransaction = (transaction: Y.Transaction) => {
    if (!transaction.local && seen.size > 0) refresh();
  };
  const stopEditor = editor.subscribe((state, tr) => {
    if (tr !== null && tr.origin !== 'remote' && !sameSelection(tr.before.selection, state.selection)) schedule();
  });

  put('user', { name: user.name, color: user.color });
  write(null);
  awareness.on('change', changed);
  doc.on('afterTransaction', afterTransaction);
  refresh();
  if (link.active) schedule();
  const session: PresenceSession = {
    activeChanged() {
      if (link.active) return schedule();
      clearTimeout(timer);
      timer = undefined;
      write(null);
    },
    stop() {
      awareness.off('change', changed);
      doc.off('afterTransaction', afterTransaction);
      stopEditor();
      clearTimeout(timer);
      for (const { timer: idle } of seen.values()) clearTimeout(idle);
      write(null);
      // Left in place by a mount that follows in the same task, as StrictMode's, rather than leaving and coming back.
      queueMicrotask(() => {
        if (namedBy.get(awareness) === session) put('user', null);
      });
    },
  };
  if (bound) namedBy.set(awareness, session);
  return session;
}
