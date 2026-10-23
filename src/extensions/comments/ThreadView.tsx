'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '../../ui/button';
import { useReadOnly } from '../../view/react/use-read-only';
import { endThread } from './comment-actions';
import type { CommentThread } from './comment-threads';
import { CommentItem } from './CommentItem';
import type { CommentsEnv } from './comments-env';
import { ReplyBox } from './ReplyBox';

type ThreadViewProps = {
  env: CommentsEnv;
  id: string;
  thread: CommentThread | undefined;
  /** Called once the thread is resolved or deleted while focus was in it, to give focus a place to go. */
  onEnded(): void;
};

/** A thread's comments, a field to reply, and Resolve and Delete, which a read-only canvas leaves out. */
export function ThreadView({ env, id, thread, onEnded }: ThreadViewProps) {
  const { controller, host, labels, link } = env;
  const readOnly = useReadOnly(controller);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const comments = thread?.comments ?? [];

  const end = async (call: (threadId: string) => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    const ended = await endThread(controller.editor, link, call, id, host.threads);
    if (alive.current) setBusy(false);
    // Focus follows only from the thread, or from nowhere once the thread closed under it.
    const active = document.activeElement;
    const stayed = active === null || active === document.body || root.current?.contains(active) === true;
    if (ended && stayed) onEnded();
  };

  return (
    <div ref={root} className="flex flex-col gap-3">
      {comments.length > 0 && (
        <ol className="flex flex-col gap-3">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} labels={labels} />
          ))}
        </ol>
      )}
      <ReplyBox env={env} threadId={id} first={comments.length === 0} />
      {!readOnly && (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            aria-disabled={busy || undefined}
            onClick={() => void end(host.onResolve)}
          >
            {labels.resolve}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            aria-disabled={busy || undefined}
            onClick={() => void end(host.onDelete)}
          >
            {labels.delete}
          </Button>
        </div>
      )}
    </div>
  );
}
