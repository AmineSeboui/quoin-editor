'use client';

import { useMemo, useRef } from 'react';
import type { EditorState } from '../../engine';
import { rangeRect } from '../../menus/floating/range-rect';
import { virtualAnchor } from '../../menus/floating/virtual-anchor';
import { Popover, PopoverAnchor, PopoverContent } from '../../ui/popover';
import { useEditorState } from '../../view/react/use-editor-state';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import { anchorText, commentAnchors, type AnchorRange } from './comment-anchors';
import type { CommentThreads } from './comment-threads';
import type { CommentsEnv } from './comments-env';
import type { OpenThreads } from './comments-plugin';
import { REPLY_FIELD } from './ReplyBox';
import { ThreadChooser } from './ThreadChooser';
import { ThreadView } from './ThreadView';

const docOf = (state: EditorState) => state.doc;

// Focus is taken only from the canvas and its own menus and toolbars, all marked `.quoin`, or from nowhere: never from
// a control of the page the person moved to while the host was answering.
function focusIsOurs(content: HTMLElement | null): boolean {
  const active = content?.ownerDocument.activeElement ?? null;
  return active === null || active === active.ownerDocument.body || active.closest('.quoin') !== null;
}

type ThreadPopoverProps = {
  env: CommentsEnv;
  open: OpenThreads;
  threads: CommentThreads;
  onChoose(id: string): void;
  onClose(): void;
};

/**
 * The thread of the anchor clicked, or the list of threads there, beside its text: a dialog that leaves the canvas
 * editable. Opened from the keyboard it takes focus, and Escape gives it back to the text.
 */
export function ThreadPopover({ env, open, threads, onChoose, onClose }: ThreadPopoverProps) {
  const { controller, labels } = env;
  const doc = useEditorState(controller, docOf);
  const anchors = commentAnchors(doc);
  const ids = open.ids.filter((id) => anchors.has(id));
  const first: AnchorRange | undefined = anchors.get(ids[0] ?? '')?.[0];
  const latest = useRef(first);
  useIsomorphicLayoutEffect(() => {
    latest.current = first;
  });
  const anchor = useMemo(
    () => ({
      current: virtualAnchor(
        () => (latest.current ? rangeRect(controller, latest.current) : null),
        () => latest.current && controller.registry.get(latest.current.block, latest.current.region),
      ),
    }),
    [controller],
  );
  const content = useRef<HTMLDivElement>(null);
  if (first === undefined) return null;

  const textOf = (id: string) => anchorText(doc, anchors.get(id) ?? []);
  const single = ids.length === 1;
  const backToText = () => controller.focus();
  const focusInside = (event: Event) => {
    event.preventDefault();
    if (!open.focus || !focusIsOurs(content.current)) return;
    const target = content.current?.querySelector<HTMLElement>(`[${REPLY_FIELD}], button`);
    target?.focus();
  };
  const onEscape = (event: KeyboardEvent) => {
    event.preventDefault();
    // Not handed on to the canvas, whose Escape would select the block: this Escape closes the popover alone.
    event.stopPropagation();
    const inside = content.current?.contains(content.current.ownerDocument.activeElement) ?? false;
    onClose();
    if (inside) backToText();
  };
  const choices = ids.map((id) => ({ id, anchorText: textOf(id), preview: threads.find(id)?.comments[0]?.body ?? '' }));

  return (
    <Popover
      open
      modal={false}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <PopoverAnchor virtualRef={anchor} />
      <PopoverContent
        key={ids.join(' ')}
        ref={content}
        aria-label={single ? labels.thread(textOf(ids[0])) : labels.threadsHere}
        side="bottom"
        align="start"
        className="w-80 p-3"
        onOpenAutoFocus={focusInside}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onEscapeKeyDown={onEscape}
      >
        {single ? (
          <ThreadView env={env} id={ids[0]} thread={threads.find(ids[0])} onEnded={backToText} />
        ) : (
          <ThreadChooser env={env} choices={choices} onChoose={onChoose} />
        )}
      </PopoverContent>
    </Popover>
  );
}
