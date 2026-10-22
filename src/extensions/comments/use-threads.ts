import { useSyncExternalStore } from 'react';
import type { CommentThread, CommentThreads } from './comment-threads';

/** The host's threads, drawn again each time the host sets them. */
export function useThreads(threads: CommentThreads): readonly CommentThread[] {
  return useSyncExternalStore(threads.subscribe, threads.get, threads.get);
}
