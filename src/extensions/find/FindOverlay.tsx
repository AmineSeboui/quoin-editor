'use client';

import { useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getPluginState, type EditorState } from '../../engine';
import type { ViewController } from '../../view';
import { useEditorState } from '../../view/react/use-editor-state';
import { useReadOnly } from '../../view/react/use-read-only';
import type { FindLabels } from './find-labels';
import { findKey } from './find-plugin';
import { FindPanel } from './FindPanel';
import { useFindShortcut } from './use-find-shortcut';

type Props = { controller: ViewController; labels: FindLabels };

/** The find panel of the canvas, drawn over the page while a search is open. */
export function FindOverlay({ controller, labels }: Props) {
  const readOnly = useReadOnly(controller);
  const value = useEditorState(
    controller,
    useCallback((state: EditorState) => getPluginState(state, findKey), []),
  );
  useFindShortcut(controller);
  if (!value.open) return null;
  const page = controller.root?.ownerDocument.body;
  if (page === undefined) return null;
  return createPortal(<FindPanel controller={controller} labels={labels} value={value} readOnly={readOnly} />, page);
}
