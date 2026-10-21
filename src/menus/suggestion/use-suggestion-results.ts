import { useMemo, useRef, useState } from 'react';
import { toError } from '../../to-error';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';

export type SuggestionSource<T> = (query: string) => readonly T[] | Promise<readonly T[]>;

type Results<T> = { readonly items: readonly T[]; readonly pending: boolean };

type Answer<T> = {
  readonly source: SuggestionSource<T> | null;
  readonly query: string | null;
  readonly items: readonly T[];
};

const FORGOTTEN: Answer<never> = { source: null, query: null, items: [] };
const CLOSED: Results<never> = { items: [], pending: false };

const isPromise = <T>(value: unknown): value is Promise<T> =>
  typeof (value as Promise<T> | null)?.then === 'function';

/**
 * The items for the query, asked of the source from an effect whenever the query or the source changes. Until the
 * current source answers the current query, the items answered last stay on show as pending, an answer to a query the
 * user has typed past or from a source since replaced is dropped, and closing the menu forgets every answer.
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
      if (current) setAnswer((last) => ({ source, query, items: items ?? last.items }));
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
    () =>
      query === null ? CLOSED : { items: answer.items, pending: answer.source !== source || answer.query !== query },
    [source, query, answer],
  );
}
