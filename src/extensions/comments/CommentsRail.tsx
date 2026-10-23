'use client';

import type { RefObject } from 'react';
import type { CommentsEnv } from './comments-env';
import type { CommentsState } from './comments-plugin';
import type { RailEntry } from './rail-entries';
import { ThreadCard } from './ThreadCard';
import { useBlockAligned } from './use-block-aligned';

const GAP = 8;

type CommentsRailProps = {
  env: CommentsEnv;
  box: RefObject<HTMLDivElement | null>;
  entries: readonly RailEntry[];
  value: CommentsState;
  onToggle(id: string | null): void;
};

export const layoutKey = (entries: readonly RailEntry[], value: CommentsState) =>
  `${value.active} ${value.open !== null} ${entries.map(({ thread, ranges }) => `${thread.id}:${ranges[0]?.block}`)}`;

/** The open threads beside a wide canvas, each level with the block its text starts in, as a named list. */
export function CommentsRail({ env, box, entries, value, onToggle }: CommentsRailProps) {
  useBlockAligned(env.controller, box, GAP, layoutKey(entries, value));
  return (
    <div ref={box} className="quoin-comments-rail">
      <ul aria-label={env.labels.comments}>
        {entries.map((entry) => (
          <li key={entry.thread.id} data-rail-item="" data-block={entry.ranges[0]?.block ?? ''}>
            <ThreadCard
              env={env}
              entry={entry}
              active={value.active === entry.thread.id}
              expanded={value.active === entry.thread.id && value.open === null}
              onToggle={onToggle}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
