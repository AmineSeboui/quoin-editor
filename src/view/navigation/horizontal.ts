import { isTextFlow, regionLength } from '../../engine/commands/block-helpers';
import { requireBlockIndex } from '../../engine/model/doc';
import { isCollapsed, textSelection } from '../../engine/state/selection';
import type { ViewController } from '../controller/view-controller';
import { entryEdge, moveToNeighbour, neighbourBlock } from './neighbour-block';

export function moveHorizontally(controller: ViewController, direction: -1 | 1, extend: boolean): boolean {
  controller.goalX = null;
  const { editor } = controller;
  const { state } = editor;
  const { selection, doc, schema } = state;
  if (selection?.kind === 'node') return !extend && moveToNeighbour(controller, selection.block, direction);
  if (selection?.kind !== 'text' || (!extend && !isCollapsed(selection))) return false;
  const { head } = selection;
  const length = regionLength(doc.blocks[requireBlockIndex(doc, head.block)], head.region);
  if (direction < 0 ? head.offset > 0 : head.offset < length) return false;
  if (!extend) return moveToNeighbour(controller, head.block, direction);
  const target = neighbourBlock(doc, head.block, direction, (block) => isTextFlow(schema, block));
  const edge = target && entryEdge(state, target.id, direction);
  if (edge?.kind !== 'text') return false;
  controller.dispatch(editor.createTransaction().setSelection(textSelection(selection.anchor, edge.head)));
  return true;
}
