import { createMentionSource, SEARCH_DELAY_MS } from './mention-source';
import type { MentionResult } from './mention-feature';

const ada: MentionResult = { id: '42', label: 'Ada' };

function sourceWith(search: (query: string) => unknown, asked: (query: string) => boolean = () => true) {
  const onError = vi.fn();
  const mention = createMentionSource({
    search: search as (query: string) => Promise<readonly MentionResult[]>,
    isAsked: asked,
    onError,
  });
  return { ...mention, onError };
}

const settled = async <T>(promise: Promise<T>) => {
  let value: T | undefined;
  void promise.then((answer) => (value = answer));
  await vi.advanceTimersByTimeAsync(0);
  return value;
};

describe('the mention source', () => {
  beforeEach(() => void vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
  afterEach(() => void vi.useRealTimers());

  it('asks the search once the query has rested for 120 ms, for the last query only', async () => {
    const search = vi.fn(async () => [ada]);
    const { source } = sourceWith(search);
    expect(SEARCH_DELAY_MS).toBe(120);
    void source('a');
    await vi.advanceTimersByTimeAsync(100);
    const last = source('ad');
    await vi.advanceTimersByTimeAsync(119);
    expect(search).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(search.mock.calls).toEqual([['ad']]);
    expect(await settled(last)).toEqual([ada]);
  });

  it('asks nothing for a query the menu no longer asks once the wait ends, nor after cancel', async () => {
    const search = vi.fn(async () => [ada]);
    const closed = sourceWith(search, () => false);
    void closed.source('ad');
    await vi.advanceTimersByTimeAsync(120);
    const cancelled = sourceWith(search);
    void cancelled.source('ad');
    cancelled.cancel();
    await vi.advanceTimersByTimeAsync(120);
    expect(search).not.toHaveBeenCalled();
  });

  it('answers no results and reports the error when the search rejects or throws', async () => {
    const rejecting = sourceWith(() => Promise.reject(new Error('offline')));
    const answer = rejecting.source('a');
    await vi.advanceTimersByTimeAsync(120);
    expect(await settled(answer)).toEqual([]);
    expect(rejecting.onError).toHaveBeenCalledWith(new Error('offline'));

    const throwing = sourceWith(() => {
      throw 'broken';
    });
    const thrown = throwing.source('a');
    await vi.advanceTimersByTimeAsync(120);
    expect(await settled(thrown)).toEqual([]);
    expect(throwing.onError).toHaveBeenCalledWith(new Error('broken'));
  });

  it('keeps only the results with a string id and label, and none of an answer that is not a list', async () => {
    const mixed = sourceWith(async () => [ada, { id: 7, label: 'Seven' }, null, { id: '8' }, { id: '9', label: 'Nine', kind: 'page' }]);
    const answer = mixed.source('a');
    await vi.advanceTimersByTimeAsync(120);
    expect(await settled(answer)).toEqual([ada, { id: '9', label: 'Nine', kind: 'page' }]);

    const odd = sourceWith(async () => ({ results: [ada] }));
    const none = odd.source('a');
    await vi.advanceTimersByTimeAsync(120);
    expect(await settled(none)).toEqual([]);
  });
});
