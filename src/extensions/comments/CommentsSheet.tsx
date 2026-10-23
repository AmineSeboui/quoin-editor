'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '../../ui/button';
import type { CommentsEnv } from './comments-env';
import type { CommentsState } from './comments-plugin';
import type { RailEntry } from './rail-entries';
import { ThreadCard } from './ThreadCard';

type CommentsSheetProps = {
  env: CommentsEnv;
  entries: readonly RailEntry[];
  value: CommentsState;
  onToggle(id: string | null): void;
  onClose(): void;
  /** Gives focus back to what opened the sheet, unless a click outside closed it. */
  returnFocus(): void;
};

/**
 * The open threads over the foot of a narrow canvas, the one opened from its marker unfolded: a dialog that leaves the
 * page usable, whose Escape and close button give focus back to the marker.
 */
export function CommentsSheet({ env, entries, value, onToggle, onClose, returnFocus }: CommentsSheetProps) {
  const { labels } = env;
  const content = useRef<HTMLDivElement>(null);
  const outside = useRef(false);
  const focusOpened = (event: Event) => {
    const opened = content.current?.querySelector<HTMLElement>('[aria-expanded="true"]');
    if (!opened) return;
    event.preventDefault();
    opened.focus();
  };
  return (
    <DialogPrimitive.Root
      open
      modal={false}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          ref={content}
          aria-describedby={undefined}
          className="quoin quoin-comments-sheet"
          onOpenAutoFocus={focusOpened}
          onInteractOutside={() => {
            outside.current = true;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (!outside.current) returnFocus();
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <DialogPrimitive.Title className="text-sm font-semibold">{labels.comments}</DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={labels.close}>
                <XIcon />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <ul aria-label={labels.comments} className="flex flex-col gap-2">
            {entries.map((entry) => (
              <li key={entry.thread.id}>
                <ThreadCard
                  env={env}
                  entry={entry}
                  active={value.active === entry.thread.id}
                  expanded={value.active === entry.thread.id}
                  onToggle={onToggle}
                />
              </li>
            ))}
          </ul>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
