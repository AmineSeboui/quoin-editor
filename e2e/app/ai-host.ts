import { aiExtension, type AiRequest } from 'quoin-editor/ai';

type Item = { chunk: string } | { end: true } | { error: string };

// Stands in for a host's model. Nothing streams on a timer: each chunk, the end or a failure of the last request comes
// only when the test calls window.__quoinAi, so no test depends on the machine's speed.
function channel() {
  const queue: Item[] = [];
  let wake: (() => void) | null = null;
  return {
    add(item: Item) {
      queue.push(item);
      wake?.();
    },
    async next(): Promise<Item> {
      while (queue.length === 0) await new Promise<void>((resolve) => (wake = resolve));
      return queue.shift()!;
    },
  };
}

export function aiHost() {
  const requests: AiRequest[] = [];
  let current: ReturnType<typeof channel> | null = null;
  const host = {
    requests,
    aborted: 0,
    push: (chunk: string) => current?.add({ chunk }),
    end: () => current?.add({ end: true }),
    fail: (error: string) => current?.add({ error }),
  };
  window.__quoinAi = host;
  return aiExtension({
    async *stream(request, signal) {
      requests.push(request);
      const own = channel();
      current = own;
      signal.addEventListener('abort', () => {
        host.aborted += 1;
        own.add({ end: true });
      });
      for (;;) {
        const item = await own.next();
        if ('error' in item) throw new Error(item.error);
        if ('end' in item) return;
        yield item.chunk;
      }
    },
  });
}
