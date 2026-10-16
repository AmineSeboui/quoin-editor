'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { coreBlocks } from '../blocks/core';
import { QuoinProvider } from '../context';
import { coreExtensions } from '../engine';
import { EditorView, useQuoinEditor } from '../view';
import type { BlockCanvasProps, QuoinEditorHandle } from './canvas-props';
import { canvasRenderers } from './collect-ui';
import { useDeleteReporter } from './use-delete-reporter';

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
    className,
    id,
    'aria-label': ariaLabel,
  },
  ref,
) {
  const [allExtensions] = useState(() => [...coreExtensions(), ...(extensions ?? [])]);
  const [focusOnMount] = useState(autoFocus);
  const controller = useQuoinEditor({ blocks, onChange, readOnly, extensions: allExtensions });
  useDeleteReporter(controller, onDelete);

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

  useEffect(() => {
    if (focusOnMount) controller.focus('start');
  }, [controller, focusOnMount]);

  return (
    <QuoinProvider value={{ blockTypes, upload, resolveAssetUrl, onError, controller }}>
      <EditorView
        controller={controller}
        renderers={canvasRenderers}
        className={className}
        id={id}
        aria-label={ariaLabel}
        placeholder={placeholder}
      />
    </QuoinProvider>
  );
});
