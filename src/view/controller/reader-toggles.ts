import type { EngineBlock } from '../../engine';
import type { ViewController } from './view-controller';

/** The open or closed state a reader gave a toggle, by block id. */
export type ReaderChoices = ReadonlyMap<string, boolean>;

export type ReaderToggles = {
  readonly choices: ReaderChoices;
  flip(block: EngineBlock): void;
  subscribe(listener: () => void): () => void;
};

export const NO_CHOICES: ReaderChoices = new Map();

const stores = new WeakMap<ViewController, ReaderToggles>();

export const shownOpen = (block: EngineBlock, choices: ReaderChoices): boolean =>
  choices.get(block.id) ?? block.attrs.open === true;

function createReaderToggles(controller: ViewController): ReaderToggles {
  let choices = NO_CHOICES;
  const listeners = new Set<() => void>();
  const set = (next: ReaderChoices) => {
    choices = next;
    for (const listener of [...listeners]) listener();
  };
  controller.subscribeReadOnly(() => {
    if (!controller.readOnly && choices.size > 0) set(NO_CHOICES);
  });
  return {
    get choices() {
      return choices;
    },
    flip(block) {
      set(new Map(choices).set(block.id, !shownOpen(block, choices)));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}

/**
 * The toggles a reader opened or closed in a read-only editor. They draw that way while the editor stays read-only, and
 * the document, its history and onChange never hear of it.
 */
export function readerToggles(controller: ViewController): ReaderToggles {
  let store = stores.get(controller);
  if (store === undefined) {
    store = createReaderToggles(controller);
    stores.set(controller, store);
  }
  return store;
}
