import type { Pos, TextSelection } from '../../engine';
import { regionLength } from '../../engine/commands/block-helpers';
import { requireBlockIndex } from '../../engine/model/doc';
import { nextGraphemeOffset, prevGraphemeOffset } from '../../engine/model/graphemes';
import { inlineText } from '../../engine/model/inline';
import { selectionRange, textSelection } from '../../engine/state/selection';
import type { ViewController } from '../controller/view-controller';
import { neighbourHead } from './neighbour-block';
import { dispatchSelection } from '../controller/dispatch-selection';

function moveHead(controller: ViewController, { anchor }: TextSelection, head: Pos): true {
  dispatchSelection(controller, textSelection(anchor, head));
  return true;
}

function blockOf(controller: ViewController, { block }: Pos) {
  const { doc } = controller.editor.state;
  return doc.blocks[requireBlockIndex(doc, block)];
}

export function collapseCross(controller: ViewController, selection: TextSelection, direction: -1 | 1): true {
  const { from, to } = selectionRange(controller.editor.state.doc, selection) as { from: Pos; to: Pos };
  dispatchSelection(controller, textSelection(direction < 0 ? from : to));
  return true;
}

export function crossHeadVertically(controller: ViewController, selection: TextSelection, direction: -1 | 1): true {
  const { head } = selection;
  const edge = neighbourHead(controller, head.block, direction);
  if (edge !== null) {
    const end = regionLength(blockOf(controller, edge), edge.region);
    return moveHead(controller, selection, { ...edge, offset: Math.min(head.offset, end) });
  }
  const end = regionLength(blockOf(controller, head), head.region);
  return moveHead(controller, selection, { ...head, offset: direction < 0 ? 0 : end });
}

export function crossHeadHorizontally(controller: ViewController, selection: TextSelection, direction: -1 | 1): true {
  const { head } = selection;
  const text = inlineText(blockOf(controller, head).regions[head.region] ?? []);
  if (direction < 0 ? head.offset > 0 : head.offset < text.length) {
    const offset = direction < 0 ? prevGraphemeOffset(text, head.offset) : nextGraphemeOffset(text, head.offset);
    return moveHead(controller, selection, { ...head, offset });
  }
  const edge = neighbourHead(controller, head.block, direction);
  return edge === null || moveHead(controller, selection, edge);
}
