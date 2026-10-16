import { useEffect, useMemo, useRef, useState } from 'react';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';

export type SuggestionSource<T> = (query: string) => readonly T[] | Promise<readonly T[]>;

type Results<T> = { readonly items: readonly T[]; readonly pending: boolean };

type Resolved<T> = { readonly request: Promise<readonly T[]>; readonly items: readonly T[] };

const isPromise = <T>(value: unknown): value is Promise<T> =>
  typeof (value as Promise<T> | null)?.then === 'function';

const toError = (reason: unknown) => (reason instanceof Error ? reason : new Error(String(reason)));

/**
 * The items for the query. A source that answers with a promise keeps the items it answered last on show until the
 * new ones arrive, and an answer to a query the user has typed past is dropped.
 */
export function useSuggestionResults<T>(
  source: SuggestionSource<T>,
  query: string | null,
  onError: (error: Error) => void,
): Results<T> {
  const answer = useMemo(() => (query === null ? null : source(query)), [source, query]);
  const [resolved, setResolved] = useState<Resolved<T> | null>(null);
  const report = useRef(onError);
  useIsomorphicLayoutEffect(() => {
    report.current = onError;
  });

  useEffect(() => {
    if (!isPromise<readonly T[]>(answer)) return;
    let current = true;
    answer.then(
      (items) => {
        if (current) setResolved({ request: answer, items });
      },
      (reason: unknown) => {
        if (!current) return;
        setResolved((last) => ({ request: answer, items: last?.items ?? [] }));
        report.current(toError(reason));
      },
    );
    return () => {
      current = false;
    };
  }, [answer]);

  return useMemo(() => {
    if (answer === null) return { items: [], pending: false };
    if (!isPromise<readonly T[]>(answer)) return { items: answer, pending: false };
    return { items: resolved?.items ?? [], pending: resolved?.request !== answer };
  }, [answer, resolved]);
}
