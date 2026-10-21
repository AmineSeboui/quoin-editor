import type { YjsAwareness } from '../index';

type State = Record<string, unknown>;
type Changes = { added: number[]; updated: number[]; removed: number[] };
type Listener = (...args: never[]) => void;

/**
 * An awareness in the shape of `y-protocols`' own: a state per client, the local one written field by field, and a
 * `change` event for every state that changed. `writes` counts the local writes of each field.
 */
export class FakeAwareness implements YjsAwareness {
  readonly states = new Map<number, State>();
  readonly listeners = new Set<Listener>();
  readonly writes: { field: string; value: unknown }[] = [];
  readonly peers = new Set<FakeAwareness>();

  constructor(readonly clientID: number) {}

  getLocalState(): State | null {
    return this.states.get(this.clientID) ?? null;
  }

  setLocalStateField(field: string, value: unknown): void {
    const state = { ...this.getLocalState(), [field]: value };
    this.writes.push({ field, value });
    this.put(this.clientID, state, 'local');
    for (const peer of this.peers) peer.setRemote(this.clientID, state);
  }

  getStates(): Map<number, State> {
    return this.states;
  }

  on(_event: 'change', listener: Listener): void {
    this.listeners.add(listener);
  }

  off(_event: 'change', listener: Listener): void {
    this.listeners.delete(listener);
  }

  /** What another client's awareness says, or `null` when that client is gone. */
  setRemote(client: number, state: State | null): void {
    this.put(client, state, 'remote');
  }

  private put(client: number, state: State | null, origin: string): void {
    const had = this.states.has(client);
    if (state === null) this.states.delete(client);
    else this.states.set(client, JSON.parse(JSON.stringify(state)) as State);
    const changes: Changes = {
      added: !had && state ? [client] : [],
      updated: had && state ? [client] : [],
      removed: had && !state ? [client] : [],
    };
    for (const listener of [...this.listeners])
      (listener as (changes: Changes, origin: string) => void)(changes, origin);
  }
}

/** Two awarenesses that hear each other's local changes at once. */
export function linkAwareness(a: FakeAwareness, b: FakeAwareness): void {
  a.peers.add(b);
  b.peers.add(a);
}
