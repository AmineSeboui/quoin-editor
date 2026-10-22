'use client';

import { useEffect, useId, useMemo } from 'react';
import { useQuoin } from '../../context';
import { fromMarkdown, toPlainText, type EditorState } from '../../engine';
import type { ViewController } from '../../view';
import { useEditorState } from '../../view/react/use-editor-state';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import { useReadOnly } from '../../view/react/use-read-only';
import { watchCanvasFocus } from '../canvas-focus';
import type { AiStream } from './ai-actions';
import type { AiEnv } from './ai-env';
import type { AiLabels } from './ai-labels';
import { linkOf } from './ai-link';
import { aiState } from './ai-plugin';
import { targetGone } from './ai-target';
import { PRIMARY } from './AiBar';
import { discard, noteFocus } from './ai-flow';
import { endRun } from './ai-session';
import { AiGhost } from './AiGhost';
import { AiMenu } from './AiMenu';

const goneOf = (state: EditorState) => {
  const { target, ghost } = aiState(state);
  return target !== null && ghost !== null && targetGone(state.doc, target);
};

const plainText = (markdown: string) => toPlainText(fromMarkdown(markdown));

type AiOverlayProps = { controller: ViewController; stream: AiStream; labels: AiLabels };

/** The AI menu while it is open, and the bar under an answer while one is shown. Nothing on a read-only canvas. */
export function AiOverlay({ controller, stream, labels }: AiOverlayProps) {
  const { onError } = useQuoin();
  const link = linkOf(controller.editor);
  useIsomorphicLayoutEffect(() => {
    link.report = onError;
    link.ended = (phase, output) =>
      controller.announce((phase === 'done' ? labels.written : labels.halted)(plainText(output)));
  }, [link, onError, controller, labels]);
  const value = useEditorState(controller, aiState);
  const gone = useEditorState(controller, goneOf);
  const readOnly = useReadOnly(controller);
  const env = useMemo<AiEnv>(() => ({ controller, stream, labels }), [controller, stream, labels]);
  const barId = useId();
  const showing = value.ghost !== null;

  // Escape in the text while an answer is shown takes focus to its bar, the way back to Accept and Discard.
  useEffect(() => {
    if (!showing) return;
    const toBar = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return false;
      const bar = controller.root?.ownerDocument.getElementById(barId);
      bar?.querySelector<HTMLElement>(`[${PRIMARY}]`)?.focus();
      return bar != null;
    };
    controller.keyInterceptors.add(toBar);
    return () => void controller.keyInterceptors.delete(toBar);
  }, [controller, showing, barId]);

  // Focus arriving in the canvas from outside it makes every empty line one a Space opens the menu on again. The
  // canvas's own menus and toolbars, portaled out of it, are not outside it.
  useEffect(() => {
    const root = controller.root;
    if (!root) return;
    let away = true;
    return watchCanvasFocus(controller, root.ownerDocument, (inside, node) => {
      if (!inside) away = true;
      else if (root.contains(node as Node)) {
        if (away) noteFocus(controller.editor);
        away = false;
      }
    });
  }, [controller]);

  // A canvas made read-only ends the answer: its stream is aborted at once, and the answer goes once the change is in.
  useEffect(
    () =>
      controller.subscribeReadOnly(() => {
        if (!controller.readOnly) return;
        endRun(link);
        queueMicrotask(() => {
          if (link.mounts > 0 && aiState(controller.editor.state).target !== null) discard(controller.editor);
        });
      }),
    [controller, link],
  );

  if (readOnly || value.target === null) return null;
  return (
    <>
      {value.menu !== null && <AiMenu env={env} target={value.target} fromSpace={value.menu.fromSpace} />}
      {value.ghost !== null && (
        <AiGhost env={env} ghost={value.ghost} target={value.target} gone={gone} barId={barId} />
      )}
    </>
  );
}
