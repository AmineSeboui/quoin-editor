import type { EditorState } from '../../engine';

export type Spoken = {
  readonly message: string;
  readonly state: EditorState | undefined;
  readonly serial: number;
  readonly at: number;
};

export type Announcer = {
  announce(message: string): void;
  current(): Spoken | null;
  subscribe(listener: () => void): () => void;
};

const THROTTLE_MS = 500;

// A message belongs to the state it was made in, `stateOf` being the state of this editor's own last change: the live
// region shows it until that moves on, so a collaborator's change does not take it away, and the same words said twice
// in a row, with a change between, are two announcements. The same words in the same state within the throttle window
// are one.
export function createAnnouncer(stateOf: () => EditorState | undefined, throttleMs = THROTTLE_MS): Announcer {
  let spoken: Spoken | null = null;
  const listeners = new Set<() => void>();
  return {
    announce(message) {
      const state = stateOf();
      const now = Date.now();
      if (spoken?.message === message && spoken.state === state && now - spoken.at < throttleMs) return;
      spoken = { message, state, serial: (spoken?.serial ?? 0) + 1, at: now };
      for (const listener of [...listeners]) listener();
    },
    current: () => (spoken?.state === stateOf() ? spoken : null),
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
