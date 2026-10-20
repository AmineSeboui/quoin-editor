import { AlignCenter, AlignLeft, AlignRight, Download, Pencil } from 'lucide-react';
import { alignOrUndefined } from '../../engine/blocks/data-fields';
import { blockById } from '../../engine/model/doc';
import type { ToolbarItem } from '../../extensions/ui-types';
import type { QuoinLabels } from '../../i18n/labels';
import { setBlockAttrs } from '../text/set-block-attrs';
import { deleteItem, replaceItem } from '../void/node-toolbar-items';

export type ImageActions = { replace?: () => void; editAlt(): void; download(): void };

const ALIGNS = [
  ['left', AlignLeft, 'alignLeft'],
  ['center', AlignCenter, 'alignCenter'],
  ['right', AlignRight, 'alignRight'],
] as const;

/** The buttons of an image's toolbar: its alignments, a new upload when uploads are set up, alt text, download, delete. */
export function imageToolbarItems(blockId: string, labels: QuoinLabels, actions: ImageActions): ToolbarItem[] {
  const aligns = ALIGNS.map(
    ([align, icon, label]): ToolbarItem => ({
      id: align,
      title: labels[label],
      icon,
      isActive: (state) => (alignOrUndefined(blockById(state.doc, blockId)?.attrs.align) ?? 'left') === align,
      run: (controller) => setBlockAttrs(controller, blockId, { align }),
    }),
  );
  const { replace, editAlt, download } = actions;
  return [
    ...aligns,
    ...replaceItem(labels.replaceImage, replace),
    { id: 'alt', title: labels.altText, icon: Pencil, run: editAlt },
    { id: 'download', title: labels.download, icon: Download, run: download },
    deleteItem(blockId, labels.delete),
  ];
}
