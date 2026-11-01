import { useCallback, useSyncExternalStore } from 'react';
import type { ViewController } from '../controller/view-controller';

const unwatched = () => () => {};

// A block shell watches only while it covers the selection, so the first engagement redraws the selected blocks and
// leaves the rest of a long document alone.
export function useEngaged(controller: ViewController, watching: boolean): boolean {
  const { engagement } = controller;
  const read = useCallback(() => engagement.engaged, [engagement]);
  return useSyncExternalStore(watching ? engagement.subscribe : unwatched, read, read);
}
