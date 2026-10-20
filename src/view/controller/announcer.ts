import type { EditorState } from '../../engine';

export type Spoken = { readonly message: string; readonly state: EditorState; readonly serial: number };

export type Announcer = {
  announce(message: string): void;
  current(): Spoken | null;
  subscribe(listener: () => void): () => void;
};

const THROTTLE_MS = 500;

// A message belongs to the state it was made in: the live region shows it until the state moves on, so the same words
// said twice in a row, with a change between, are two announcements. The same words in the same state within the
// throttle window are one.
export function createAnnouncer(stateOf: () => EditorState, throttleMs = THROTTLE_MS): Announcer {
  let spoken: Spoken | null = null;
  let spokenAt = 0;
  const listeners = new Set<() => void>();
  return {
    announce(message) {
      const state = stateOf();
      const now = Date.now();
      if (spoken?.message === message && spoken.state === state && now - spokenAt < throttleMs) return;
      spoken = { message, state, serial: (spoken?.serial ?? 0) + 1 };
      spokenAt = now;
      for (const listener of [...listeners]) listener();
    },
    current: () => spoken,
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
