import type { EditorState } from '../engine';
import { descendantsEnd } from '../engine/commands/block-helpers';
import { requireBlockIndex } from '../engine/model/doc';
import { selectedBlockIds } from '../engine/state/selection';

function selectedWith(state: EditorState, blockId: string): string[] | null {
  const { doc, selection } = state;
  const selected = selectedBlockIds(doc, selection);
  const ofBlocks = selection?.kind === 'blocks' || (selection?.kind === 'text' && selected.length > 1);
  return ofBlocks && selected.includes(blockId) ? selected : null;
}

/** The blocks a press on a block's handle acts on: the selection holding the block, or the block and its nested ones. */
export function handleTargets(state: EditorState, blockId: string): string[] {
  const selected = selectedWith(state, blockId);
  if (selected !== null) return selected;
  const { doc } = state;
  const index = requireBlockIndex(doc, blockId);
  return doc.blocks.slice(index, descendantsEnd(doc, index)).map((block) => block.id);
}

// A block moved, copied or deleted takes its nested blocks along, but Turn into, Color, Tone and Icon restyle only the
// block itself: applied to the nested blocks they would rewrite their types and colours.
export function styleTargets(state: EditorState, blockId: string): string[] {
  return selectedWith(state, blockId) ?? [blockId];
}
