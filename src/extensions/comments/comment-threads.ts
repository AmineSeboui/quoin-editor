export type CommentAuthor = { readonly name: string; readonly avatarUrl?: string };

export type CommentUser = CommentAuthor & { readonly id: string };

/** One comment of a thread. `body` is plain text, drawn as written with its line breaks; `createdAt` is ISO 8601. */
export type ThreadComment = {
  readonly id: string;
  readonly author: CommentAuthor;
  readonly body: string;
  readonly createdAt: string;
};

export type CommentThread = {
  readonly id: string;
  readonly resolved: boolean;
  readonly comments: readonly ThreadComment[];
};

/**
 * The host's comment threads, which the canvas reads while it stays mounted: `set` them again whenever the host's copy
 * changes, as after a reply is saved or a collaborator resolves a thread.
 */
export type CommentThreads = {
  get(): readonly CommentThread[];
  set(threads: readonly CommentThread[]): void;
  find(id: string): CommentThread | undefined;
  subscribe(listener: () => void): () => void;
};

const NO_THREADS: readonly CommentThread[] = [];

export function createCommentThreads(initial: readonly CommentThread[] = NO_THREADS): CommentThreads {
  let threads = initial;
  let byId: ReadonlyMap<string, CommentThread> | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => threads,
    set(next) {
      if (next === threads) return;
      threads = next;
      byId = null;
      for (const listener of [...listeners]) listener();
    },
    find(id) {
      byId ??= new Map(threads.map((thread) => [thread.id, thread]));
      return byId.get(id);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
