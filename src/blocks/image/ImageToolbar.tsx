'use client';

import { useRef, useState } from 'react';
import { useQuoin } from '../../context';
import type { EditorState } from '../../engine';
import { blockById } from '../../engine/model/doc';
import type { ViewController } from '../../view';
import { useEditorState } from '../../view/react/use-editor-state';
import { str } from '../str';
import { useReplacePicker } from '../upload/use-replace-picker';
import { usePartAnchor } from '../void/block-part';
import { NodeToolbar } from '../void/NodeToolbar';
import { selectedBlock, useToolbarBlock } from '../void/use-toolbar-block';
import { AltTextPopover } from './AltTextPopover';
import { hasPicture, imageSource } from './image-source';
import { imageToolbarItems } from './image-toolbar-items';
import { uploadImage } from './image-upload';

const wholeState = (state: EditorState) => state;

const selectedImage = selectedBlock('IMAGE', hasPicture);

function download(src: string | null, doc: Document): void {
  if (src === null) return;
  const link = doc.createElement('a');
  link.href = src;
  link.download = '';
  link.target = '_blank';
  link.rel = 'noopener';
  link.click();
}

/**
 * The toolbar of the image selected as a whole, drawn while focus is in the editor or in the toolbar, and kept while
 * its alt text popover is open: focus moving between the popover's controls passes through the page for a moment.
 */
export function ImageToolbarOverlay({ controller }: { controller: ViewController }) {
  const [altFor, setAltFor] = useState<string | null>(null);
  const blockId = useToolbarBlock(controller, selectedImage, altFor);
  if (altFor !== null && altFor !== blockId) setAltFor(null);
  if (blockId === null) return null;
  return (
    <ImageToolbar
      key={blockId}
      blockId={blockId}
      controller={controller}
      editingAlt={altFor === blockId}
      onEditAlt={setAltFor}
    />
  );
}

type ImageToolbarProps = {
  blockId: string;
  controller: ViewController;
  editingAlt: boolean;
  onEditAlt(blockId: string | null): void;
};

/** Tab goes on from the toolbar to the width of the image. */
function ImageToolbar({ blockId, controller, editingAlt, onEditAlt }: ImageToolbarProps) {
  const { labels, resolveAssetUrl } = useQuoin();
  const state = useEditorState(controller, wholeState);
  const picker = useReplacePicker(controller, blockId, uploadImage, 'image/*');
  const altButton = useRef<HTMLButtonElement>(null);
  const anchor = usePartAnchor(controller, blockId, '.quoin-image-frame');

  const attrs = blockById(state.doc, blockId)?.attrs ?? {};
  const items = imageToolbarItems(blockId, labels, {
    replace: picker.open,
    editAlt: () => {
      onEditAlt(editingAlt ? null : blockId);
      if (editingAlt) controller.focus();
    },
    download: () => download(imageSource(attrs, resolveAssetUrl), controller.root?.ownerDocument ?? document),
  });

  return (
    <NodeToolbar
      blockId={blockId}
      controller={controller}
      label={labels.imageTools}
      anchor={anchor}
      items={items}
      next='[role="slider"][data-side="1"]'
      buttonRefs={{ alt: altButton }}
      popover={
        editingAlt && (
          <AltTextPopover
            blockId={blockId}
            controller={controller}
            anchor={anchor}
            opener={altButton}
            alt={str(attrs.alt)}
            onClose={() => onEditAlt(null)}
          />
        )
      }
    >
      {picker.input}
    </NodeToolbar>
  );
}
