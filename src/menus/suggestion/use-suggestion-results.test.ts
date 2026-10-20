import { act, renderHook } from '@testing-library/react';
import { useSuggestionResults } from './use-suggestion-results';

type Deferred = { resolve(items: readonly string[]): void; reject(reason: unknown): void };

function asyncSource() {
  const pending = new Map<string, Deferred>();
  const source = (query: string) =>
    new Promise<readonly string[]>((resolve, reject) => pending.set(query, { resolve, reject }));
  const answer = (query: string, items: readonly string[]) => act(async () => pending.get(query)!.resolve(items));
  const fail = (query: string) => act(async () => pending.get(query)!.reject(new Error('offline')));
  return { source, answer, fail };
}

describe('useSuggestionResults', () => {
  it('answers a synchronous source at once', () => {
    const source = (query: string) => ['alpha', 'beta'].filter((item) => item.startsWith(query));
    const { result, rerender } = renderHook(({ query }) => useSuggestionResults(source, query, vi.fn()), {
      initialProps: { query: 'a' as string | null },
    });
    expect(result.current).toEqual({ items: ['alpha'], pending: false });
    rerender({ query: null });
    expect(result.current).toEqual({ items: [], pending: false });
  });

  it('keeps the last answer on show while the next is pending, and drops an answer typed past', async () => {
    const { source, answer } = asyncSource();
    const { result, rerender } = renderHook(({ query }) => useSuggestionResults(source, query, vi.fn()), {
      initialProps: { query: 'a' },
    });
    expect(result.current).toEqual({ items: [], pending: true });
    await answer('a', ['ada']);
    expect(result.current).toEqual({ items: ['ada'], pending: false });
    rerender({ query: 'ad' });
    rerender({ query: 'ada' });
    expect(result.current).toEqual({ items: ['ada'], pending: true });
    await answer('ada', ['ada lovelace']);
    await answer('ad', ['adam']);
    expect(result.current).toEqual({ items: ['ada lovelace'], pending: false });
  });

  it('reports a failed answer and settles on the items it had', async () => {
    const { source, answer, fail } = asyncSource();
    const onError = vi.fn();
    const { result, rerender } = renderHook(({ query }) => useSuggestionResults(source, query, onError), {
      initialProps: { query: 'a' },
    });
    await answer('a', ['ada']);
    rerender({ query: 'ab' });
    await fail('ab');
    expect(onError).toHaveBeenCalledWith(new Error('offline'));
    expect(result.current).toEqual({ items: ['ada'], pending: false });
  });
});
