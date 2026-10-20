import { useEffect, useState } from 'react';

/** `value` once it has stayed the same for `delay` ms, and null at once whenever it is null or changes. */
export function useRestedValue<T>(value: T | null, delay: number): T | null {
  const [rested, setRested] = useState<T | null>(null);
  useEffect(() => {
    if (value === null) return;
    const timer = setTimeout(() => setRested(value), delay);
    return () => {
      clearTimeout(timer);
      setRested(null);
    };
  }, [value, delay]);
  return value !== null && Object.is(rested, value) ? value : null;
}
