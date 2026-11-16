'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useDirection } from '@radix-ui/react-direction';
import { useRef } from 'react';
import { X } from '../../icons';
import { escapeWithin } from '../../ui/escape-within';
import { IconButton } from '../../ui/icon-button';
import type { CommentsEnv } from './comments-env';
import type { CommentsState } from './comments-plugin';
import type { RailEntry } from './rail-entries';
import { ThreadCard } from './ThreadCard';
import { SheetContent, SheetTitle } from '../../ui/sheet';

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
  const dir = useDirection();
  const outside = useRef(false);
  const escape = escapeWithin(content, onClose);
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
        <SheetContent
          ref={content}
          side="bottom"
          dir={dir}
          aria-describedby={undefined}
          className="quoin quoin-comments-sheet max-h-[60vh] gap-2 overflow-y-auto px-4 py-3"
          onOpenAutoFocus={focusOpened}
          onEscapeKeyDown={escape.onEscapeKeyDown}
          onKeyDownCapture={escape.onKeyDownCapture}
          onInteractOutside={() => {
            outside.current = true;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (!outside.current) returnFocus();
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <SheetTitle>{labels.comments}</SheetTitle>
            <DialogPrimitive.Close asChild>
              <IconButton type="button" variant="ghost" size="icon-sm" label={labels.close}>
                <X />
              </IconButton>
            </DialogPrimitive.Close>
          </div>
          <ul aria-label={labels.comments} className="flex list-none flex-col gap-2">
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
        </SheetContent>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
