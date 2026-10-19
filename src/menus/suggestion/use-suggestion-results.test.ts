import { act, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
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

  it('asks its source from an effect, never while rendering', () => {
    let rendering = false;
    const askedWhileRendering: boolean[] = [];
    const source = (query: string) => {
      askedWhileRendering.push(rendering);
      return [query];
    };
    const { result, rerender } = renderHook(
      ({ query }) => {
        rendering = true;
        const results = useSuggestionResults(source, query, vi.fn());
        rendering = false;
        return results;
      },
      { initialProps: { query: 'a' } },
    );
    rerender({ query: 'ab' });
    expect(result.current).toEqual({ items: ['ab'], pending: false });
    expect(askedWhileRendering).toEqual([false, false]);
  });

  it('leaves no rejection unhandled when StrictMode runs its effect twice, and reports the failure once', async () => {
    const unhandled: unknown[] = [];
    const listen = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', listen);
    try {
      const onError = vi.fn();
      const source = () => Promise.reject(new Error('offline'));
      const { result } = renderHook(() => useSuggestionResults(source, 'a', onError), { wrapper: StrictMode });
      await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
      expect(unhandled).toEqual([]);
      expect(onError.mock.calls).toEqual([[new Error('offline')]]);
      expect(result.current).toEqual({ items: [], pending: false });
    } finally {
      process.off('unhandledRejection', listen);
    }
  });

  it('forgets its answers when the menu closes, and drops one that arrives after', async () => {
    const { source, answer } = asyncSource();
    const { result, rerender } = renderHook(({ query }) => useSuggestionResults(source, query, vi.fn()), {
      initialProps: { query: 'a' as string | null },
    });
    await answer('a', ['ada']);
    rerender({ query: 'ab' });
    rerender({ query: null });
    rerender({ query: 'b' });
    expect(result.current).toEqual({ items: [], pending: true });
    await answer('ab', ['abe']);
    expect(result.current).toEqual({ items: [], pending: true });
    await answer('b', ['bea']);
    expect(result.current).toEqual({ items: ['bea'], pending: false });
  });

  it('reports a source that throws and settles on the items it had', () => {
    const onError = vi.fn();
    const source = (query: string) => {
      if (query === 'ab') throw new Error('broken');
      return ['ada'];
    };
    const { result, rerender } = renderHook(({ query }) => useSuggestionResults(source, query, onError), {
      initialProps: { query: 'a' },
    });
    rerender({ query: 'ab' });
    expect(onError).toHaveBeenCalledWith(new Error('broken'));
    expect(result.current).toEqual({ items: ['ada'], pending: false });
  });

  it('is pending again when the source changes, until the new source answers', async () => {
    const first = asyncSource();
    const second = asyncSource();
    const { result, rerender } = renderHook(({ source }) => useSuggestionResults(source, 'a', vi.fn()), {
      initialProps: { source: first.source },
    });
    await first.answer('a', ['ada']);
    rerender({ source: second.source });
    expect(result.current).toEqual({ items: ['ada'], pending: true });
    await second.answer('a', ['alan']);
    expect(result.current).toEqual({ items: ['alan'], pending: false });
  });
});
