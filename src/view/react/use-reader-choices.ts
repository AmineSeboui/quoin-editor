import { useSyncExternalStore } from 'react';
import type { EngineBlock } from '../../engine';
import { readerToggles, shownOpen, type ReaderChoices } from '../controller/reader-toggles';
import type { ViewController } from '../controller/view-controller';

export function useReaderChoices(controller: ViewController): ReaderChoices {
  const store = readerToggles(controller);
  return useSyncExternalStore(store.subscribe, () => store.choices, () => store.choices);
}

/** Whether a toggle draws open: as the document says, or as a reader of a read-only editor set it. */
export function useToggleOpen(controller: ViewController, block: EngineBlock): boolean {
  return shownOpen(block, useReaderChoices(controller));
}
