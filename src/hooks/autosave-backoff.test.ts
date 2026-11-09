import { nextRetryDelay, type RetryPolicy } from './autosave-backoff';

const policy = (over: Partial<RetryPolicy> = {}): RetryPolicy => ({
  debounceMs: 10,
  maxBackoffMs: 1000,
  maxRetries: 8,
  isRetryable: () => true,
  ...over,
});

describe('nextRetryDelay', () => {
  it('backs off from the debounce, doubling each time, up to the ceiling', () => {
    expect(nextRetryDelay('e', 0, policy())).toBe(20);
    expect(nextRetryDelay('e', 1, policy())).toBe(40);
    expect(nextRetryDelay('e', 9, policy({ maxRetries: 20 }))).toBe(1000);
  });

  it('gives up once the retries are spent', () => {
    expect(nextRetryDelay('e', 8, policy())).toBeNull();
  });

  it('gives up on a failure the host calls final', () => {
    expect(nextRetryDelay('e', 0, policy({ isRetryable: () => false }))).toBeNull();
  });

  it('gives up when the host predicate throws, rather than letting the throw escape the save', () => {
    const throwing = policy({
      isRetryable: () => {
        throw new Error('the host predicate is broken');
      },
    });
    expect(nextRetryDelay('e', 0, throwing)).toBeNull();
  });
});
