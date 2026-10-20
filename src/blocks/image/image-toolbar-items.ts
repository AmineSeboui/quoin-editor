import { AlignCenter, AlignLeft, AlignRight, Download, Pencil, Trash, Upload } from 'lucide-react';
import { alignOrUndefined } from '../../engine/blocks/data-fields';
import { deleteBlocks } from '../../engine/commands/block-structure';
import { blockById } from '../../engine/model/doc';
import type { ToolbarItem } from '../../extensions/ui-types';
import { runOnBlocks } from '../../gutter/run-on-blocks';
import type { QuoinLabels } from '../../i18n/labels';
import { setBlockAttrs } from '../text/set-block-attrs';

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
    ...(replace ? [{ id: 'replace', title: labels.replaceImage, icon: Upload, run: replace }] : []),
    { id: 'alt', title: labels.altText, icon: Pencil, run: editAlt },
    { id: 'download', title: labels.download, icon: Download, run: download },
    {
      id: 'delete',
      title: labels.delete,
      icon: Trash,
      run: (controller) => {
        runOnBlocks(controller, [blockId], deleteBlocks);
        controller.focus();
      },
    },
  ];
}
