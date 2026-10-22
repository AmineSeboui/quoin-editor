import { createCommentThreads, type CommentThread, type CommentThreads } from 'quoin-editor/comments';

type Message = { type: 'hello' } | { type: 'threads'; threads: readonly CommentThread[] };

/**
 * A comments service in miniature: the pages of one browser context keep one list of threads through a
 * BroadcastChannel, each page sending the whole list when it changes it, and a page that opens asks for it.
 */
export function sharedCommentThreads(name: string): CommentThreads {
  const threads = createCommentThreads();
  const channel = new BroadcastChannel(`${name}-comments`);
  let receiving = false;
  threads.subscribe(() => {
    if (!receiving) channel.postMessage({ type: 'threads', threads: threads.get() } satisfies Message);
  });
  channel.onmessage = ({ data }: MessageEvent<Message>) => {
    if (data.type === 'hello') {
      if (threads.get().length > 0) channel.postMessage({ type: 'threads', threads: threads.get() } satisfies Message);
      return;
    }
    receiving = true;
    threads.set(data.threads);
    receiving = false;
  };
  channel.postMessage({ type: 'hello' } satisfies Message);
  addEventListener('pagehide', () => channel.close());
  return threads;
}
