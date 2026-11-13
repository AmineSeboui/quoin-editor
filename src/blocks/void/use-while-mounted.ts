import { useCallback, useEffect, useRef } from 'react';

/** The callback, doing nothing once the component that holds it has unmounted, so a late call cannot act for it. */
export function useWhileMounted(callback: () => void): () => void {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return useCallback(() => {
    if (mounted.current) callback();
  }, [callback]);
}
