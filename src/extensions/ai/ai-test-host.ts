import type { AiRequest, AiStream } from './ai-actions';

type Queued = IteratorResult<unknown> | { readonly error: unknown };

/** One request the fake host was asked, answered chunk by chunk as the test says. */
export type FakeCall = {
  readonly request: AiRequest;
  readonly signal: AbortSignal;
  push(chunk: unknown): void;
  end(): void;
  fail(error: unknown): void;
  returned: boolean;
};

/** A host whose answers stream only as the test pushes them. */
export function fakeAiHost() {
  const calls: FakeCall[] = [];
  const stream = vi.fn<AiStream>((request, signal) => {
    const queue: Queued[] = [];
    let wake: (() => void) | null = null;
    const add = (item: Queued) => {
      queue.push(item);
      wake?.();
    };
    const call: FakeCall = {
      request,
      signal,
      push: (value) => add({ value, done: false }),
      end: () => add({ value: undefined, done: true }),
      fail: (error) => add({ error }),
      returned: false,
    };
    calls.push(call);
    const iterator = {
      async next(): Promise<IteratorResult<string>> {
        while (queue.length === 0) await new Promise<void>((resolve) => (wake = resolve));
        const item = queue.shift()!;
        if ('error' in item) throw item.error;
        return item as IteratorResult<string>;
      },
      async return(): Promise<IteratorResult<string>> {
        call.returned = true;
        return { value: undefined, done: true };
      },
    };
    return { [Symbol.asyncIterator]: () => iterator };
  });
  return { stream, calls, last: () => calls[calls.length - 1] };
}

/** Lets the chunks pushed so far be read and drawn: a frame and the promises before it. */
export const nextFrame = () => new Promise((resolve) => setTimeout(resolve, 40));
