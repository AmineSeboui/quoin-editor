import { useSyncExternalStore } from 'react';

const FINE = '(pointer: fine)';

const query = () => (typeof window.matchMedia === 'function' ? window.matchMedia(FINE) : null);

function subscribe(notify: () => void): () => void {
  const list = query();
  list?.addEventListener('change', notify);
  return () => list?.removeEventListener('change', notify);
}

const read = () => query()?.matches ?? true;
const readOnServer = () => false;

export function useFinePointer(): boolean {
  return useSyncExternalStore(subscribe, read, readOnServer);
}
