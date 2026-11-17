'use client';

import { useRef, type KeyboardEvent } from 'react';
import { Card } from '../../ui/card';
import { cn } from '../../ui/cn';
import { FOCUS_RING_BORDERLESS } from '../../ui/focus';
import { AuthorName } from './AuthorName';
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
  const { labels, controller, host } = env;
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
    <Card
      size="sm"
      className="quoin-comments-card gap-0 p-2 data-active:ring-indicator"
      data-active={active || undefined}
      onKeyDown={onKeyDown}
    >
      <button
        ref={header}
        type="button"
        aria-expanded={expanded}
        className={cn('flex w-full flex-col items-start gap-1 rounded-sm text-start', FOCUS_RING_BORDERLESS)}
        onClick={() => onToggle(expanded ? null : thread.id)}
      >
        <span className={removed ? 'text-xs text-muted-foreground italic' : 'quoin-comments-quote'}>
          {removed ? labels.textRemoved : anchorText}
        </span>
        {first !== undefined && (
          <span className="line-clamp-2 text-sm">
            <AuthorName author={first.author} tag={host.authorTag} /> {first.body}
          </span>
        )}
        <span className="text-xs text-muted-foreground">{labels.commentCount(thread.comments.length)}</span>
      </button>
      {expanded && (
        <div className="mt-3" role="group" aria-label={removed ? labels.textRemoved : labels.thread(anchorText)}>
          <ThreadView env={env} id={thread.id} thread={thread} onEnded={backToHeader} />
        </div>
      )}
    </Card>
  );
}
