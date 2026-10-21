import { SmilePlus } from 'lucide-react';
import type { EditorState } from '../../engine';
import { styleTargets, type BlockMenuAction } from '../../gutter/block-menu-items';
import { allCallouts } from './all-callouts';
import type { EmojiLabels } from './emoji-labels';
import { requestIcon } from './icon-request';

// The blocks the menu's own Tone and Icon restyle: the selection the block is in, or the block alone, without the
// blocks nested in it.
function calloutsFor(state: EditorState, blockIds: readonly string[]): readonly string[] | null {
  if (blockIds.length === 0 || !state.doc.index.has(blockIds[0])) return null;
  const targets = styleTargets(state, blockIds[0]);
  return allCallouts(state, targets) ? targets : null;
}

/** The block menu action that opens the emoji picker for the icon of a callout, offered when the menu is for callouts. */
export const chooseIconAction = (labels: EmojiLabels): BlockMenuAction => ({
  id: 'choose-icon',
  label: labels.chooseIcon,
  icon: SmilePlus,
  available: (state, blockIds) => calloutsFor(state, blockIds) !== null,
  run: (controller, blockIds) => {
    const blocks = calloutsFor(controller.editor.state, blockIds);
    if (blocks !== null) requestIcon(controller, { blocks });
  },
});
