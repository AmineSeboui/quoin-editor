import { Trash, Upload } from 'lucide-react';
import { deleteBlocks } from '../../engine/commands/block-structure';
import type { ToolbarItem } from '../../extensions/ui-types';
import { runOnBlocks } from '../../gutter/run-on-blocks';

/** The button that uploads a file in place of what the block holds, offered while the canvas can upload. */
export const replaceItem = (title: string, run: (() => void) | undefined): ToolbarItem[] =>
  run ? [{ id: 'replace', title, icon: Upload, run }] : [];

/** The button that deletes the block and gives focus back to the editor. */
export const deleteItem = (blockId: string, title: string): ToolbarItem => ({
  id: 'delete',
  title,
  icon: Trash,
  run: (controller) => {
    runOnBlocks(controller, [blockId], deleteBlocks);
    controller.focus();
  },
});
