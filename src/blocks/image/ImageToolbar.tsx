'use client';

import { useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { useQuoin } from '../../context';
import type { EditorState } from '../../engine';
import { blockById } from '../../engine/model/doc';
import { ToolbarButton } from '../../menus/bubble/bubble-items';
import { bubblePart } from '../../menus/bubble/bubble-part';
import { useRovingFocus } from '../../menus/bubble/use-roving-focus';
import { useSelectionSettled } from '../../menus/bubble/use-selection-settled';
import { keepFocus } from '../../menus/floating/keep-focus';
import { useFocusKey } from '../../menus/floating/use-focus-key';
import { virtualAnchor } from '../../menus/floating/virtual-anchor';
import { FLOATING_TOOLBAR } from '../../ui/menu-styles';
import { Popover, PopoverAnchor, PopoverContent } from '../../ui/popover';
import { preventDefault } from '../../ui/prevent-default';
import type { ViewController } from '../../view';
import { isComposingKey } from '../../view/input/keydown';
import { useEditorState } from '../../view/react/use-editor-state';
import { useReadOnly } from '../../view/react/use-read-only';
import { str } from '../str';
import { AltTextPopover } from './AltTextPopover';
import { hasPicture, imageSource } from './image-source';
import { imageToolbarItems } from './image-toolbar-items';
import { uploadImage } from './image-upload';

const wholeState = (state: EditorState) => state;

function selectedImage({ doc, selection }: EditorState): string | null {
  const block = selection?.kind === 'node' ? blockById(doc, selection.block) : undefined;
  return block?.type === 'IMAGE' && hasPicture(block.attrs) ? block.id : null;
}

const part = (controller: ViewController, blockId: string, selector: string) =>
  controller.blockElement(blockId)?.querySelector<HTMLElement>(selector) ?? undefined;

function download(src: string | null, doc: Document): void {
  if (src === null) return;
  const link = doc.createElement('a');
  link.href = src;
  link.download = '';
  link.target = '_blank';
  link.rel = 'noopener';
  link.click();
}

/** The toolbar of the image selected as a whole, drawn while focus is in the editor or in the toolbar. */
export function ImageToolbarOverlay({ controller }: { controller: ViewController }) {
  const blockId = useEditorState(controller, selectedImage);
  const readOnly = useReadOnly(controller);
  const settled = useSelectionSettled(controller);
  if (blockId === null || readOnly || !settled) return null;
  return <ImageToolbar key={blockId} blockId={blockId} controller={controller} />;
}

/** Alt+F10 moves into the toolbar, Tab goes on to the width of the image, and Escape goes back to the image. */
function ImageToolbar({ blockId, controller }: { blockId: string; controller: ViewController }) {
  const { labels, upload, resolveAssetUrl, onError } = useQuoin();
  const state = useEditorState(controller, wholeState);
  const roving = useRovingFocus();
  const picker = useRef<HTMLInputElement>(null);
  const [editingAlt, setEditingAlt] = useState(false);
  const anchor = useMemo(() => {
    const picture = () => part(controller, blockId, '.quoin-image-frame');
    return { current: virtualAnchor(() => picture()?.getBoundingClientRect() ?? null, picture) };
  }, [controller, blockId]);
  useFocusKey(controller, roving.focusCurrent);

  const attrs = blockById(state.doc, blockId)?.attrs ?? {};
  const items = imageToolbarItems(blockId, labels, {
    replace: upload && (() => picker.current?.click()),
    editAlt: () => setEditingAlt(true),
    download: () => download(imageSource(attrs, resolveAssetUrl), picker.current?.ownerDocument ?? document),
  });

  const replace = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file === undefined || !upload) return;
    controller.announce(labels.uploading);
    uploadImage(controller, blockId, file, { upload, resolveAssetUrl }).catch((cause: unknown) =>
      onError(cause instanceof Error ? cause : new Error(String(cause))),
    );
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (!roving.owns(event.target) || isComposingKey(controller, event.nativeEvent)) return;
    const tab = event.key === 'Tab' && !event.altKey && !event.ctrlKey && !event.metaKey;
    if (tab && !event.shiftKey) part(controller, blockId, '[role="slider"][data-side="1"]')?.focus();
    else if (tab || event.key === 'Escape') controller.focus();
    else return roving.onKeyDown(event);
    event.preventDefault();
  };

  return (
    <Popover open modal={false}>
      <PopoverAnchor virtualRef={anchor} />
      <PopoverContent
        ref={roving.ref}
        role="toolbar"
        aria-label={labels.imageTools}
        side="top"
        className={FLOATING_TOOLBAR}
        onOpenAutoFocus={preventDefault}
        onCloseAutoFocus={preventDefault}
        onPointerDown={keepFocus}
        onMouseDown={keepFocus}
        onFocus={roving.onFocus}
        onKeyDown={onKeyDown}
        {...bubblePart(controller)}
      >
        {items.map((item) => (
          <ToolbarButton key={item.id} item={item} state={state} controller={controller} />
        ))}
        <input ref={picker} type="file" accept="image/*" hidden tabIndex={-1} onChange={replace} />
      </PopoverContent>
      {editingAlt && (
        <AltTextPopover
          blockId={blockId}
          controller={controller}
          anchor={anchor}
          alt={str(attrs.alt)}
          onClose={() => setEditingAlt(false)}
        />
      )}
    </Popover>
  );
}
