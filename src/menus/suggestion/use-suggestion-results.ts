import { useMemo, useRef, useState } from 'react';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';

export type SuggestionSource<T> = (query: string) => readonly T[] | Promise<readonly T[]>;

type Results<T> = { readonly items: readonly T[]; readonly pending: boolean };

type Answer<T> = { readonly query: string | null; readonly items: readonly T[] };

const FORGOTTEN: Answer<never> = { query: null, items: [] };
const CLOSED: Results<never> = { items: [], pending: false };

const isPromise = <T>(value: unknown): value is Promise<T> =>
  typeof (value as Promise<T> | null)?.then === 'function';

const toError = (reason: unknown) => (reason instanceof Error ? reason : new Error(String(reason)));

/**
 * The items for the query, asked of the source from an effect whenever the query or the source changes. A source that
 * answers with a promise keeps the items it answered last on show until the new ones arrive, an answer to a query the
 * user has typed past is dropped, and closing the menu forgets every answer.
 */
export function useSuggestionResults<T>(
  source: SuggestionSource<T>,
  query: string | null,
  onError: (error: Error) => void,
): Results<T> {
  const [answer, setAnswer] = useState<Answer<T>>(FORGOTTEN);
  const report = useRef(onError);
  useIsomorphicLayoutEffect(() => {
    report.current = onError;
  });

  useIsomorphicLayoutEffect(() => {
    if (query === null) {
      setAnswer(FORGOTTEN);
      return;
    }
    let current = true;
    const settle = (items?: readonly T[]) => {
      if (current) setAnswer((last) => ({ query, items: items ?? last.items }));
    };
    const fail = (reason: unknown) => {
      if (!current) return;
      settle();
      report.current(toError(reason));
    };
    try {
      const items = source(query);
      if (isPromise<readonly T[]>(items)) items.then(settle, fail);
      else settle(items);
    } catch (reason) {
      fail(reason);
    }
    return () => {
      current = false;
    };
  }, [source, query]);

  return useMemo(
    () => (query === null ? CLOSED : { items: answer.items, pending: answer.query !== query }),
    [query, answer],
  );
}
