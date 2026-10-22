'use client';

import { useEffect, useId, useMemo } from 'react';
import { useQuoin } from '../../context';
import { fromMarkdown, toPlainText, type EditorState } from '../../engine';
import type { ViewController } from '../../view';
import { useEditorState } from '../../view/react/use-editor-state';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import { useReadOnly } from '../../view/react/use-read-only';
import type { AiStream } from './ai-actions';
import type { AiEnv } from './ai-env';
import type { AiLabels } from './ai-labels';
import { linkOf } from './ai-link';
import { aiState } from './ai-plugin';
import { targetGone } from './ai-target';
import { AiGhost } from './AiGhost';
import { AiMenu } from './AiMenu';

const goneOf = (state: EditorState) => {
  const { target, ghost } = aiState(state);
  return target !== null && ghost !== null && (ghost.lost || targetGone(state.doc, target));
};

type AiOverlayProps = { controller: ViewController; stream: AiStream; labels: AiLabels };

/** The AI menu while it is open, and the bar under an answer while one is shown. Nothing on a read-only canvas. */
export function AiOverlay({ controller, stream, labels }: AiOverlayProps) {
  const { onError } = useQuoin();
  const link = linkOf(controller.editor);
  useIsomorphicLayoutEffect(() => {
    link.report = onError;
    link.written = (output) => controller.announce(labels.written(toPlainText(fromMarkdown(output))));
  }, [link, onError, controller, labels]);
  const value = useEditorState(controller, aiState);
  const gone = useEditorState(controller, goneOf);
  const readOnly = useReadOnly(controller);
  const env = useMemo<AiEnv>(() => ({ controller, stream, labels }), [controller, stream, labels]);
  const barId = useId();
  const showing = value.ghost !== null;

  // The bar takes an Escape pressed in the text to bring focus to itself, so the canvas does not act on it as well.
  useEffect(() => {
    if (!showing) return;
    const toBar = (event: KeyboardEvent) =>
      event.key === 'Escape' && controller.root?.ownerDocument.getElementById(barId) != null;
    controller.keyInterceptors.add(toBar);
    return () => void controller.keyInterceptors.delete(toBar);
  }, [controller, showing, barId]);

  if (readOnly || value.target === null) return null;
  return (
    <>
      {value.menu !== null && <AiMenu env={env} target={value.target} fromSpace={value.menu.fromSpace} />}
      {value.ghost !== null && <AiGhost env={env} ghost={value.ghost} gone={gone} barId={barId} />}
    </>
  );
}
