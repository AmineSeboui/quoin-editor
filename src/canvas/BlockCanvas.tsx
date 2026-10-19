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
import { resolveLabels } from '../i18n/resolve-labels';
import { bubbleExtension, BubbleItemsProvider } from '../menus/bubble/bubble-extension';
import { linkExtension } from '../menus/link/link-extension';
import { slashExtension, SlashItemsProvider } from '../menus/slash/slash-extension';
import { MobileToolbar } from '../mobile/MobileToolbar';
import { shortcutsExtension, shortcutsSlashItem } from '../shortcuts/shortcuts-extension';
import { cn } from '../ui/cn';
import { EditorView, useQuoinEditor, type BlockPlaceholder } from '../view';
import { defaultBlockLink } from './block-link';
import type { BlockCanvasProps, QuoinEditorHandle } from './canvas-props';
import { collectUi } from './collect-ui';
import { insertUploads } from './insert-uploads';
import { placeholderFor } from './placeholders';
import { CanvasUiProvider, createCanvasUiStore } from './ui-store';
import { useBlockLinkTarget } from './use-block-link-target';
import { useDeleteReporter } from './use-delete-reporter';
import { useStructureAnnouncements } from './use-structure-announcements';
import { useTypedInPlaceWarning } from './use-typed-in-place-warning';

// Room at the start of every line for the gutter: two small controls, or on a touch screen one 44 px handle.
const GUTTER_ROOM = 'ps-12';

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
    slashExtension(),
    bubbleExtension(),
    linkExtension(uiStore),
    shortcutsExtension(uiStore),
    ...(extensions ?? []),
  ]);
  const labels = useMemo(() => resolveLabels(labelOverrides), [labelOverrides]);
  const ui = useMemo(() => collectUi(allExtensions, blockTypes, readOnly), [allExtensions, blockTypes, readOnly]);
  useTypedInPlaceWarning(blockTypes, readOnly);
  const [focusOnMount] = useState(autoFocus);
  const controller = useQuoinEditor({
    blocks,
    onChange,
    readOnly,
    extensions: allExtensions,
    render: ui.render,
    onFiles: (files, at) => void insertUploads(controller, files, at, { upload, onError: onError ?? console.error }),
  });
  useDeleteReporter(controller, onDelete);
  useBlockLinkTarget(controller, focusOnMount);
  useStructureAnnouncements(controller, labels);
  const actions = useMemo(() => {
    const onCopied = () => controller.announce(labels.copied);
    return menuActions(coreBlockMenuActions(labels, { blockLink, onCopied, resolveAssetUrl }), ui.blockMenuItems);
  }, [controller, labels, blockLink, resolveAssetUrl, ui.blockMenuItems]);
  const slashItems = useMemo(
    () => [shortcutsSlashItem(labels, uiStore), ...ui.slashItems],
    [labels, uiStore, ui.slashItems],
  );
  const blockPlaceholder = useMemo<BlockPlaceholder>(() => {
    const placeholderLabels = placeholder === undefined ? labels : { ...labels, placeholderEmpty: placeholder };
    return (state, block) => placeholderFor(state, block, placeholderLabels);
  }, [labels, placeholder]);

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
        <SlashItemsProvider value={slashItems}>
          <BubbleItemsProvider value={ui.bubbleItems}>
            <CanvasUiProvider value={uiStore}>
              <EditorView
                controller={controller}
                renderers={ui.renderers}
                className={cn(GUTTER_ROOM, className)}
                id={id}
                aria-label={ariaLabel ?? labels.document}
                hint={labels.editorHint}
                paragraphLabel={labels.paragraph}
                selectedContentLabel={labels.selectedContent}
                unsupportedBlockLabel={labels.unsupportedBlock}
                placeholder={placeholder ?? labels.placeholderEmpty}
                blockPlaceholder={blockPlaceholder}
                blocksSelectedLabel={labels.blocksSelected}
              >
                {!readOnly && <Gutter controller={controller} store={uiStore} actions={actions} />}
                {!readOnly && <BlockContextMenu controller={controller} store={uiStore} actions={actions} />}
                {ui.overlays.map((Overlay, index) => (
                  <Overlay key={index} controller={controller} />
                ))}
              </EditorView>
              {!readOnly && <MobileToolbar controller={controller} />}
            </CanvasUiProvider>
          </BubbleItemsProvider>
        </SlashItemsProvider>
      </VoidEditingContext.Provider>
    </QuoinProvider>
  );
});
