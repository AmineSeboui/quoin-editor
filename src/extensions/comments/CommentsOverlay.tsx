'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuoin } from '../../context';
import { getPluginState, type EditorState } from '../../engine';
import type { ViewController } from '../../view';
import { useEditorState } from '../../view/react/use-editor-state';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import { commentsTransaction } from './comment-open';
import { CommentMarkers } from './CommentMarkers';
import type { CommentsEnv } from './comments-env';
import type { CommentsHost } from './comments-extension';
import type { CommentsLabels } from './comments-labels';
import { linkOf } from './comments-link';
import { commentsKey, type CommentsAction } from './comments-plugin';
import { CommentsRail } from './CommentsRail';
import { CommentsSheet } from './CommentsSheet';
import { railEntries } from './rail-entries';
import { ThreadPopover } from './ThreadPopover';
import { useAnchorClicks } from './use-anchor-clicks';
import { useCanvasWide } from './use-canvas-wide';
import { useThreads } from './use-threads';

const commentsOf = (state: EditorState) => getPluginState(state, commentsKey);
const docOf = (state: EditorState) => state.doc;

type CommentsOverlayProps = { controller: ViewController; host: CommentsHost; labels: CommentsLabels };

/** The rail or the markers and sheet of the threads, and the popover of the thread opened from its text. */
export function CommentsOverlay({ controller, host, labels }: CommentsOverlayProps) {
  const { onError } = useQuoin();
  const link = linkOf(controller.editor);
  useIsomorphicLayoutEffect(() => {
    link.report = onError;
  }, [link, onError]);
  useAnchorClicks(controller, host.threads);
  const threads = useThreads(host.threads);
  const value = useEditorState(controller, commentsOf);
  const doc = useEditorState(controller, docOf);
  const entries = useMemo(() => railEntries(doc, threads, value.ended), [doc, threads, value.ended]);
  const box = useRef<HTMLDivElement>(null);
  const wide = useCanvasWide(box);
  const [sheet, setSheet] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (wide) setSheet(false);
  }, [wide]);
  const env = useMemo<CommentsEnv>(() => ({ controller, host, labels, link }), [controller, host, labels, link]);

  const act = useCallback(
    (action: CommentsAction) => controller.editor.dispatch(commentsTransaction(controller.editor.state, action)),
    [controller],
  );
  const toggle = useCallback((id: string | null) => act({ type: 'activate', id }), [act]);
  const openSheet = (id: string, marker: HTMLElement) => {
    opener.current = marker;
    toggle(id);
    setSheet(true);
  };
  const returnFocus = () => {
    if (opener.current?.isConnected) opener.current.focus();
    else controller.focus();
  };
  const closeSheet = () => {
    setSheet(false);
    toggle(null);
  };

  return (
    <>
      {wide ? (
        <CommentsRail env={env} box={box} entries={entries} value={value} onToggle={toggle} />
      ) : (
        <CommentMarkers env={env} box={box} entries={entries} onOpen={openSheet} />
      )}
      {!wide && sheet && (
        <CommentsSheet
          env={env}
          entries={entries}
          value={value}
          onToggle={toggle}
          onClose={closeSheet}
          returnFocus={returnFocus}
        />
      )}
      {value.open && (
        <ThreadPopover
          env={env}
          open={value.open}
          threads={host.threads}
          onChoose={(id) => act({ type: 'open', open: { ids: [id], focus: true } })}
          onClose={() => act({ type: 'close' })}
        />
      )}
    </>
  );
}
