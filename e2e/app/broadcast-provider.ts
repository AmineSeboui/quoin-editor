import * as Y from 'yjs';
import type { YjsAwareness } from 'quoin-editor/yjs';

type State = Record<string, unknown>;
type Message =
  | { type: 'hello'; vector: Uint8Array }
  | { type: 'update'; update: Uint8Array }
  | { type: 'awareness'; client: number; state: State | null };

// The awareness of y-protocols in miniature: one state per client, sent whole on every local change.
class ChannelAwareness implements YjsAwareness {
  private readonly states = new Map<number, State>();
  private readonly listeners = new Set<() => void>();

  constructor(
    readonly clientID: number,
    private readonly send: (message: Message) => void,
  ) {}

  getLocalState = () => this.states.get(this.clientID) ?? null;
  getStates = () => this.states;
  on = (_event: 'change', listener: () => void) => void this.listeners.add(listener);
  off = (_event: 'change', listener: () => void) => void this.listeners.delete(listener);

  setLocalStateField(field: string, value: unknown) {
    this.receive(this.clientID, { ...this.getLocalState(), [field]: value });
    this.announce();
  }

  announce(state = this.getLocalState()) {
    this.send({ type: 'awareness', client: this.clientID, state });
  }

  receive(client: number, state: State | null) {
    if (state === null) this.states.delete(client);
    else this.states.set(client, state);
    for (const listener of [...this.listeners]) listener();
  }
}

/**
 * A provider for the harness: the pages of one browser context share a Yjs document and their awareness through a
 * BroadcastChannel, as a server would relay them. A page that opens asks the others for what it lacks.
 */
export function broadcastProvider(doc: Y.Doc, name: string, batch = false): { awareness: YjsAwareness; leave(): void } {
  const channel = new BroadcastChannel(name);
  let open = true;
  const send = (message: Message) => open && channel.postMessage(message);
  const awareness = new ChannelAwareness(doc.clientID, send);
  doc.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin !== channel) send({ type: 'update', update });
  });
  const held: Uint8Array[] = [];
  const applyHeld = () => held.splice(0).forEach((update) => Y.applyUpdate(doc, update, channel));
  channel.onmessage = ({ data }: MessageEvent<Message>) => {
    if (data.type === 'update') {
      if (!batch) Y.applyUpdate(doc, data.update, channel);
      else if (held.push(data.update) === 1) setTimeout(applyHeld, 120);
    } else if (data.type === 'awareness') awareness.receive(data.client, data.state);
    else {
      send({ type: 'update', update: Y.encodeStateAsUpdate(doc, data.vector) });
      awareness.announce();
    }
  };
  send({ type: 'hello', vector: Y.encodeStateVector(doc) });
  // Leaving disconnects, as a provider does: whatever the page writes afterwards, a blur on closing included, reaches no
  // one, so it cannot bring this client back on the other pages.
  const leave = () => {
    awareness.announce(null);
    open = false;
    channel.close();
  };
  addEventListener('pagehide', leave);
  return { awareness, leave };
}
