import { hidingToggle } from '../commands/collapsed-toggle';
import { requireBlockIndex } from '../model/doc';
import type { BlockRangeSelection, EngineDoc, Pos, Selection, TextSelection } from '../model/types';
import type { Schema } from '../schema/types';
import { blockEnd } from '../transform/block-edges';
import { blockRangeSelection, endOf, textSelection } from './selection';

const hiderOf = (doc: EngineDoc, id: string): number | null => hidingToggle(doc, requireBlockIndex(doc, id) + 1);

function toggleEnd(doc: EngineDoc, schema: Schema, toggle: number): Pos {
  const end = endOf(doc, schema, doc.blocks[toggle].id);
  return end.kind === 'text' ? end.head : blockEnd(doc.blocks[toggle]);
}

function visibleText(doc: EngineDoc, schema: Schema, selection: TextSelection): Selection {
  const [anchor, head] = [selection.anchor, selection.head].map((pos) => {
    const hider = hiderOf(doc, pos.block);
    return hider === null ? pos : toggleEnd(doc, schema, hider);
  });
  return anchor === selection.anchor && head === selection.head ? selection : textSelection(anchor, head);
}

function visibleBlocks(doc: EngineDoc, schema: Schema, selection: BlockRangeSelection): Selection {
  const ids = [selection.anchor, selection.head];
  const indexes = ids.map((id) => requireBlockIndex(doc, id));
  const from = Math.min(...indexes);
  const to = Math.max(...indexes);
  const hiders = indexes.map((index) => hidingToggle(doc, index + 1));
  const [anchor, head] = ids.map((id, i) => {
    const hider = hiders[i];
    return hider === null || (hider >= from && hider <= to) ? id : doc.blocks[hider].id;
  });
  if (anchor === selection.anchor && head === selection.head) return selection;
  const [anchorHider, headHider] = hiders;
  if (anchorHider !== null && anchorHider === headHider) return textSelection(toggleEnd(doc, schema, anchorHider));
  return blockRangeSelection(anchor, head);
}

// A closed toggle draws none of its children, so a selection never rests in them: an end inside them moves to the end
// of the toggle's own text. A block range that covers the toggle keeps the children it selects along with it.
export function visibleSelection(doc: EngineDoc, schema: Schema, selection: Selection | null): Selection | null {
  if (selection === null) return null;
  switch (selection.kind) {
    case 'text':
      return visibleText(doc, schema, selection);
    case 'node': {
      const hider = hiderOf(doc, selection.block);
      return hider === null ? selection : textSelection(toggleEnd(doc, schema, hider));
    }
    case 'blocks':
      return visibleBlocks(doc, schema, selection);
  }
}
