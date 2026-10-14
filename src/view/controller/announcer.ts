import type { EditorState } from '../../engine';

export type Spoken = { readonly message: string; readonly state: EditorState };

export type Announcer = {
  announce(message: string): void;
  current(): Spoken | null;
  subscribe(listener: () => void): () => void;
};

// A message belongs to the state it was made in: the live region shows it until the state moves on, so the same words
// said twice in a row, with a change between, are two announcements.
export function createAnnouncer(stateOf: () => EditorState): Announcer {
  let spoken: Spoken | null = null;
  const listeners = new Set<() => void>();
  return {
    announce(message) {
      spoken = { message, state: stateOf() };
      for (const listener of [...listeners]) listener();
    },
    current: () => spoken,
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
