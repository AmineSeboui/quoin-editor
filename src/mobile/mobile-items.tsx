import {
  Bold,
  Code,
  Italic,
  ListIndentDecrease,
  ListIndentIncrease,
  Plus,
  Redo2,
  Strikethrough,
  Undo2,
} from 'lucide-react';
import { redo, undo, type Command } from '../engine';
import { headBlockId } from '../engine/commands/block-helpers';
import { indent, outdent } from '../engine/commands/block-structure';
import type { ToolbarItem } from '../extensions/ui-types';
import { addBlockBelow } from '../gutter/add-block-below';
import type { QuoinLabels } from '../i18n/labels';
import { linkItem, markItem } from '../menus/bubble/bubble-items';
import type { ViewController } from '../view';

export type MobileItems = { addBlock: ToolbarItem; editing: readonly ToolbarItem[] };

function commandItem(id: string, title: string, icon: ToolbarItem['icon'], command: Command): ToolbarItem {
  return { id, title, icon, run: (controller) => void controller.run(command) };
}

function addBlockAtCaret(controller: ViewController): void {
  const block = headBlockId(controller.editor.state.selection);
  if (block !== null) addBlockBelow(controller, block);
}

/** The toolbar's own buttons: Add block, which goes before Turn into, and the ones that format and edit after it. */
export function mobileItems(labels: QuoinLabels, openLink: () => void): MobileItems {
  return {
    addBlock: { id: 'add-block', title: labels.addBelow, icon: Plus, run: addBlockAtCaret },
    editing: [
      markItem('bold', labels.bold, Bold),
      markItem('italic', labels.italic, Italic),
      markItem('strike', labels.strike, Strikethrough),
      markItem('code', labels.code, Code),
      linkItem(labels, openLink),
      commandItem('indent', labels.indent, ListIndentIncrease, indent),
      commandItem('outdent', labels.outdent, ListIndentDecrease, outdent),
      commandItem('undo', labels.undo, Undo2, undo),
      commandItem('redo', labels.redo, Redo2, redo),
    ],
  };
}
