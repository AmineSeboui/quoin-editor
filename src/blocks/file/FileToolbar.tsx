'use client';

import { useQuoin } from '../../context';
import type { ViewController } from '../../view';
import { useReplacePicker } from '../upload/use-replace-picker';
import { usePartAnchor } from '../void/block-part';
import { deleteItem, replaceItem } from '../void/node-toolbar-items';
import { NodeToolbar } from '../void/NodeToolbar';
import { selectedBlock, useToolbarBlock } from '../void/use-toolbar-block';
import { hasFile } from './file-source';
import { uploadFile } from './file-upload';

const selectedFile = selectedBlock('FILE', hasFile);

/** The toolbar of the file card selected as a whole, drawn while focus is in the editor or in the toolbar. */
export function FileToolbarOverlay({ controller }: { controller: ViewController }) {
  const blockId = useToolbarBlock(controller, selectedFile);
  return blockId === null ? null : <FileToolbar key={blockId} blockId={blockId} controller={controller} />;
}

/** Replace and delete the file. Tab goes on from the toolbar to the download link of the card. */
function FileToolbar({ blockId, controller }: { blockId: string; controller: ViewController }) {
  const { labels } = useQuoin();
  const picker = useReplacePicker(controller, blockId, uploadFile);
  const anchor = usePartAnchor(controller, blockId, '.quoin-file-card');
  const items = [...replaceItem(labels.replaceFile, picker.open), deleteItem(blockId, labels.delete)];
  return (
    <NodeToolbar
      blockId={blockId}
      controller={controller}
      label={labels.fileTools}
      anchor={anchor}
      items={items}
      next=".quoin-file-download"
    >
      {picker.input}
    </NodeToolbar>
  );
}
