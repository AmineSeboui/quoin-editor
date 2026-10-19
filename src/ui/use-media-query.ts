import { useCallback, useSyncExternalStore } from 'react';

const listOf = (query: string) => (typeof window.matchMedia === 'function' ? window.matchMedia(query) : null);

const readOnServer = () => false;

/** Whether the media query matches, `unsupported` where the browser cannot tell, and false on the server. */
export function useMediaQuery(query: string, unsupported: boolean): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const list = listOf(query);
      list?.addEventListener('change', notify);
      return () => list?.removeEventListener('change', notify);
    },
    [query],
  );
  const read = () => listOf(query)?.matches ?? unsupported;
  return useSyncExternalStore(subscribe, read, readOnServer);
}
