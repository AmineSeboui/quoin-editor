import { regionLength } from '../../engine/commands/block-helpers';
import { requireBlockIndex } from '../../engine/model/doc';
import { isCollapsed, textSelection } from '../../engine/state/selection';
import type { ViewController } from '../controller/view-controller';
import { isCrossSelection } from '../selection/selection-decorations';
import { collapseCross, crossHeadHorizontally } from './cross-moves';
import { moveToNeighbour, neighbourHead } from './neighbour-block';

export function moveHorizontally(controller: ViewController, direction: -1 | 1, extend: boolean): boolean {
  controller.goalX = null;
  const { editor } = controller;
  const { state } = editor;
  const { selection, doc } = state;
  if (selection?.kind === 'node') return !extend && moveToNeighbour(controller, selection.block, direction);
  if (selection?.kind !== 'text') return false;
  if (isCrossSelection(selection)) {
    const move = extend ? crossHeadHorizontally : collapseCross;
    return move(controller, selection, direction);
  }
  if (!extend && !isCollapsed(selection)) return false;
  const { head } = selection;
  const length = regionLength(doc.blocks[requireBlockIndex(doc, head.block)], head.region);
  if (direction < 0 ? head.offset > 0 : head.offset < length) return false;
  if (!extend) return moveToNeighbour(controller, head.block, direction);
  const edge = neighbourHead(controller, head.block, direction);
  if (edge === null) return false;
  controller.dispatch(editor.createTransaction().setSelection(textSelection(selection.anchor, edge)));
  return true;
}
