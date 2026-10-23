'use client';

import { MessageSquare } from 'lucide-react';
import type { RefObject } from 'react';
import { cn } from '../../ui/cn';
import { FOCUS_RING } from '../../ui/focus';
import type { CommentsEnv } from './comments-env';
import type { RailEntry } from './rail-entries';
import { useBlockAligned } from './use-block-aligned';

const GAP = 4;

type Group = { readonly block: string; readonly ids: readonly string[] };

function groupsOf(entries: readonly RailEntry[]): Group[] {
  const groups = new Map<string, string[]>();
  for (const { thread, ranges } of entries) {
    const block = ranges[0]?.block ?? '';
    groups.set(block, [...(groups.get(block) ?? []), thread.id]);
  }
  const removed = groups.get('');
  groups.delete('');
  return [...groups, ...(removed ? ([['', removed]] as const) : [])].map(([block, ids]) => ({ block, ids }));
}

type CommentMarkersProps = {
  env: CommentsEnv;
  box: RefObject<HTMLDivElement | null>;
  entries: readonly RailEntry[];
  onOpen(id: string, marker: HTMLElement): void;
};

/** On a narrow canvas, a button beside each block with threads, and one after them for threads whose text is gone. */
export function CommentMarkers({ env, box, entries, onOpen }: CommentMarkersProps) {
  const groups = groupsOf(entries);
  useBlockAligned(env.controller, box, GAP, groups.map(({ block, ids }) => `${block}:${ids}`).join(' '));
  return (
    <div ref={box} className="quoin-comments-markers">
      {groups.map(({ block, ids }) => (
        <button
          key={block}
          type="button"
          data-rail-item=""
          data-block={block}
          aria-label={env.labels.showComments(ids.length)}
          className={cn('quoin-comments-marker', FOCUS_RING)}
          onClick={(event) => onOpen(ids[0], event.currentTarget)}
        >
          <MessageSquare aria-hidden="true" />
          {ids.length}
        </button>
      ))}
    </div>
  );
}
