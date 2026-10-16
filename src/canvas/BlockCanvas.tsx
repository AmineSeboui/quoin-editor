'use client';

import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { coreBlocks } from '../blocks/core';
import { VoidEditingContext } from '../blocks/void/use-void-editing';
import { createVoidEditing } from '../blocks/void/void-editing';
import { QuoinProvider } from '../context';
import { coreExtensions } from '../engine';
import { BlockContextMenu } from '../gutter/BlockContextMenu';
import { coreBlockMenuActions, menuActions } from '../gutter/block-menu-items';
import { blockMenuKeymap } from '../gutter/block-menu-keymap';
import { Gutter } from '../gutter/Gutter';
import { resolveLabels } from '../i18n/labels';
import { cn } from '../ui/cn';
import { EditorView, useQuoinEditor } from '../view';
import { defaultBlockLink } from './block-link';
import type { BlockCanvasProps, QuoinEditorHandle } from './canvas-props';
import { canvasRenderers } from './collect-ui';
import { createCanvasUiStore } from './ui-store';
import { useBlockLinkTarget } from './use-block-link-target';
import { useDeleteReporter } from './use-delete-reporter';

// Room at the start of every line for the gutter, whose controls grow to 44 px squares on a touch screen.
const GUTTER_ROOM = 'ps-12 pointer-coarse:ps-24';

export const BlockCanvas = forwardRef<QuoinEditorHandle, BlockCanvasProps>(function BlockCanvas(
  {
    blocks,
    onChange,
    onDelete,
    blockTypes = coreBlocks,
    extensions,
    upload,
    resolveAssetUrl,
    onError,
    readOnly = false,
    autoFocus = false,
    placeholder,
    labels: labelOverrides,
    blockLink = defaultBlockLink,
    className,
    id,
    'aria-label': ariaLabel,
  },
  ref,
) {
  const [voidEditing] = useState(createVoidEditing);
  const [uiStore] = useState(createCanvasUiStore);
  const [allExtensions] = useState(() => [
    ...coreExtensions(),
    voidEditing.extension,
    blockMenuKeymap(uiStore),
    ...(extensions ?? []),
  ]);
  const labels = useMemo(() => resolveLabels(labelOverrides), [labelOverrides]);
  const renderers = useMemo(() => canvasRenderers(blockTypes), [blockTypes]);
  const [focusOnMount] = useState(autoFocus);
  const controller = useQuoinEditor({ blocks, onChange, readOnly, extensions: allExtensions });
  useDeleteReporter(controller, onDelete);
  useBlockLinkTarget(controller, focusOnMount);
  const actions = useMemo(() => {
    const onCopied = () => controller.announcer.announce(labels.copied);
    return menuActions(coreBlockMenuActions(labels, { blockLink, onCopied, resolveAssetUrl }));
  }, [controller, labels, blockLink, resolveAssetUrl]);

  useImperativeHandle(
    ref,
    () => ({
      editor: controller.editor,
      controller,
      focus: (target) => controller.focus(target),
      toMarkdown: (options) => controller.editor.toMarkdown({ comments: options?.comments, resolveAssetUrl }),
    }),
    [controller, resolveAssetUrl],
  );

  return (
    <QuoinProvider value={{ blockTypes, upload, resolveAssetUrl, onError, controller, labels }}>
      <VoidEditingContext.Provider value={voidEditing}>
        <EditorView
          controller={controller}
          renderers={renderers}
          className={cn(GUTTER_ROOM, className)}
          id={id}
          aria-label={ariaLabel ?? labels.document}
          hint={labels.editorHint}
          paragraphLabel={labels.paragraph}
          selectedContentLabel={labels.selectedContent}
          unsupportedBlockLabel={labels.unsupportedBlock}
          placeholder={placeholder}
        >
          {!readOnly && <Gutter controller={controller} store={uiStore} actions={actions} />}
          {!readOnly && <BlockContextMenu controller={controller} store={uiStore} actions={actions} />}
        </EditorView>
      </VoidEditingContext.Provider>
    </QuoinProvider>
  );
});
