import type { ComponentType } from 'react';
import { ArrowDown, ArrowUp, Copy, CopyPlus, Link, Trash } from 'lucide-react';
import { blockRangeSelection, toMarkdown, type Command, type Editor, type EditorState } from '../engine';
import { descendantsEnd, selectedBlockRange } from '../engine/commands/block-helpers';
import { deleteBlocks, duplicateBlocks, moveBlocksDown, moveBlocksUp } from '../engine/commands/block-structure';
import { runCommands } from '../engine/commands/run-commands';
import { setSelection } from '../engine/commands/selection-commands';
import type { InternalEditor } from '../engine/extension/editor';
import { createDoc, requireBlockIndex } from '../engine/model/doc';
import { selectedBlockIds } from '../engine/state/selection';
import type { QuoinLabels } from '../i18n/labels';
import type { ViewController } from '../view';
import { copyText } from './copy-text';
import { noChange, runOnBlocks } from './run-on-blocks';

export type BlockMenuAction = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** A key in the keymap's own form, such as `Mod-d`. */
  shortcut?: string;
  destructive?: boolean;
  run(controller: ViewController, blockIds: string[]): void;
  available?(state: EditorState, blockIds: string[]): boolean;
};

export type CoreBlockMenuOptions = {
  blockLink: (id: string) => string;
  onCopied?: () => void;
  resolveAssetUrl?: (storageKey: string) => string;
};

const rangeOf = (blockIds: readonly string[]) => blockRangeSelection(blockIds[0], blockIds[blockIds.length - 1]);

/** The selected blocks when `blockId` is among them, else the block and the blocks nested under it. */
export function menuTargets(state: EditorState, blockId: string): string[] {
  const { doc, selection } = state;
  const selected = selectedBlockIds(doc, selection);
  const ofBlocks = selection?.kind === 'blocks' || (selection?.kind === 'text' && selected.length > 1);
  if (ofBlocks && selected.includes(blockId)) return selected;
  const index = requireBlockIndex(doc, blockId);
  return doc.blocks.slice(index, descendantsEnd(doc, index)).map((block) => block.id);
}

/** The core actions with those of extensions after them, and the destructive ones last. */
export function menuActions(core: readonly BlockMenuAction[], extra: readonly BlockMenuAction[] = []): BlockMenuAction[] {
  return [...core.filter((action) => !action.destructive), ...extra, ...core.filter((action) => action.destructive)];
}

// Copied as the subtree a duplicate or a delete would take, so a copy of a parent brings its children.
function markdownOf(editor: Editor, blockIds: readonly string[], resolveAssetUrl?: (key: string) => string): string {
  const { doc } = editor.state;
  const range = selectedBlockRange(doc, rangeOf(blockIds));
  if (range === null) return '';
  const blocks = (editor as InternalEditor).codec.blocksFromDoc(createDoc(doc.blocks.slice(range.start, range.end)));
  return toMarkdown(blocks, { schema: editor.schema, resolveAssetUrl });
}

const applies = (command: Command) => (state: EditorState, blockIds: string[]) =>
  blockIds.every((id) => state.doc.index.has(id)) && runCommands(state, [setSelection(rangeOf(blockIds)), command]).ok;

export function coreBlockMenuActions(labels: QuoinLabels, options: CoreBlockMenuOptions): BlockMenuAction[] {
  const copy = (controller: ViewController, blockIds: string[], text: string) => {
    void copyText(text).then((copied) => {
      if (copied) options.onCopied?.();
    });
    runOnBlocks(controller, blockIds, noChange);
  };
  return [
    {
      id: 'duplicate',
      label: labels.duplicate,
      icon: CopyPlus,
      shortcut: 'Mod-d',
      run: (controller, blockIds) => runOnBlocks(controller, blockIds, duplicateBlocks()),
    },
    {
      id: 'copy',
      label: labels.copy,
      icon: Copy,
      run: (controller, blockIds) =>
        copy(controller, blockIds, markdownOf(controller.editor, blockIds, options.resolveAssetUrl)),
    },
    {
      id: 'copy-link',
      label: labels.copyLink,
      icon: Link,
      run: (controller, blockIds) => copy(controller, blockIds, options.blockLink(blockIds[0])),
    },
    {
      id: 'move-up',
      label: labels.moveUp,
      icon: ArrowUp,
      shortcut: 'Mod-Shift-ArrowUp',
      run: (controller, blockIds) => runOnBlocks(controller, blockIds, moveBlocksUp),
      available: applies(moveBlocksUp),
    },
    {
      id: 'move-down',
      label: labels.moveDown,
      icon: ArrowDown,
      shortcut: 'Mod-Shift-ArrowDown',
      run: (controller, blockIds) => runOnBlocks(controller, blockIds, moveBlocksDown),
      available: applies(moveBlocksDown),
    },
    {
      id: 'delete',
      label: labels.delete,
      icon: Trash,
      destructive: true,
      run: (controller, blockIds) => runOnBlocks(controller, blockIds, deleteBlocks),
    },
  ];
}
