'use client';

import { useRef, type KeyboardEvent } from 'react';
import { cn } from '../../ui/cn';
import { FOCUS_RING } from '../../ui/focus';
import type { CommentsEnv } from './comments-env';
import type { RailEntry } from './rail-entries';
import { ThreadView } from './ThreadView';

type ThreadCardProps = {
  env: CommentsEnv;
  entry: RailEntry;
  active: boolean;
  expanded: boolean;
  onToggle(id: string | null): void;
};

/** A thread in the rail or the sheet: its anchor text and first comment, opening in place to the whole thread. */
export function ThreadCard({ env, entry, active, expanded, onToggle }: ThreadCardProps) {
  const { labels, controller } = env;
  const { thread, anchorText, ranges } = entry;
  const header = useRef<HTMLButtonElement>(null);
  const [first] = thread.comments;
  const removed = ranges.length === 0;

  const backToHeader = () => {
    if (header.current?.isConnected) header.current.focus();
    else controller.focus();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !expanded) return;
    event.preventDefault();
    event.stopPropagation();
    onToggle(null);
    header.current?.focus();
  };

  return (
    <div className="quoin-comments-card" data-active={active || undefined} onKeyDown={onKeyDown}>
      <button
        ref={header}
        type="button"
        aria-expanded={expanded}
        className={cn('flex w-full flex-col items-start gap-1 rounded-sm text-start', FOCUS_RING)}
        onClick={() => onToggle(expanded ? null : thread.id)}
      >
        <span className={removed ? 'text-xs text-muted-foreground italic' : 'quoin-comments-quote'}>
          {removed ? labels.textRemoved : anchorText}
        </span>
        {first !== undefined && (
          <span className="line-clamp-2 text-sm">
            <span className="font-medium">{first.author.name}</span> {first.body}
          </span>
        )}
        <span className="text-xs text-muted-foreground">{labels.commentCount(thread.comments.length)}</span>
      </button>
      {expanded && (
        <div className="mt-3" role="group" aria-label={removed ? labels.textRemoved : labels.thread(anchorText)}>
          <ThreadView env={env} id={thread.id} thread={thread} onEnded={backToHeader} />
        </div>
      )}
    </div>
  );
}
