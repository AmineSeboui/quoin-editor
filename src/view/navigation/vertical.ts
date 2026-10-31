import type { BlockRangeSelection, EngineBlock, Pos, Selection, TextSelection } from '../../engine';
import { isTextFlow } from '../../engine/commands/block-helpers';
import { blockRangeSelection, primaryRegion, textSelection } from '../../engine/state/selection';
import { posToDom } from '../controller/dom-selection';
import type { ViewController } from '../controller/view-controller';
import { isCrossSelection } from '../selection/selection-decorations';
import { caretInHost } from './caret-in-host';
import { collapseCross } from './cross-moves';
import { adjacentLineMiddle, caretClientRect, isOnFirstLine, isOnLastLine, lineEdgeRect } from './line-edges';
import { canBeEntered, entryEdge, holdsTextHead, moveToNeighbour, neighbourBlock, ownNode } from './neighbour-block';
import { stayOnLine } from './stay-on-line';
import { dispatchSelection } from '../controller/dispatch-selection';

// caretFromPoint only finds content inside the viewport.
function lineInView(host: HTMLElement, last: boolean): DOMRect | null {
  const line = lineEdgeRect(host, last);
  const view = host.ownerDocument.defaultView;
  if (!line || !view || (line.top >= 0 && line.bottom <= view.innerHeight)) return line;
  host.scrollIntoView({ block: 'nearest' });
  return lineEdgeRect(host, last);
}

function caretAtGoal(controller: ViewController, host: HTMLElement, at: Omit<Pos, 'offset'>, y: number): Pos | null {
  const { goalX } = controller;
  const view = host.ownerDocument.defaultView;
  if (goalX === null || !view || y < 0 || y > view.innerHeight) return null;
  const pos = caretInHost(controller.registry, host, host.getBoundingClientRect(), at, goalX, y);
  if (!pos) return null;
  return stayOnLine(pos, y, (p) => {
    const dom = posToDom(controller.registry, p);
    return dom && caretClientRect(dom);
  });
}

function landAtGoal(controller: ViewController, block: EngineBlock, direction: -1 | 1): Selection | null {
  const { schema } = controller.editor.state;
  const region = isTextFlow(schema, block) ? primaryRegion(schema, block) : null;
  const host = region === null ? undefined : controller.registry.get(block.id, region);
  if (!host || region === null || controller.goalX === null) return null;
  const line = lineInView(host, direction < 0);
  const pos = line && caretAtGoal(controller, host, { block: block.id, region }, line.top + line.height / 2);
  return pos ? textSelection(pos) : null;
}

// The browser keeps its own goal column across the moves it makes inside a host, but not across a caret the editor
// put down, so a caret that stopped short of the goal at the end of a shorter line is moved by the editor, as is the
// head of a selection across hosts, which the browser does not hold.
function moveInHost(
  controller: ViewController,
  host: HTMLElement,
  head: Pos,
  caret: DOMRect | null,
  direction: -1 | 1,
): Pos | null {
  const { goalX } = controller;
  const native = !isCrossSelection(controller.editor.state.selection);
  if (goalX === null || !caret || (native && Math.abs(caret.left - goalX) < caret.height / 2)) return null;
  const y = adjacentLineMiddle(host, caret, direction);
  const pos = y === null ? null : caretAtGoal(controller, host, head, y);
  return pos && pos.offset !== head.offset ? pos : null;
}

function landing(
  controller: ViewController,
  { head }: TextSelection,
  direction: -1 | 1,
  extend: boolean,
): Selection | null {
  const { registry } = controller;
  const host = registry.get(head.block, head.region);
  const point = posToDom(registry, head);
  if (!host || !point) return null;
  const caret = caretClientRect(point);
  controller.goalX ??= caret?.left ?? null;
  if (!(direction < 0 ? isOnFirstLine(host, point) : isOnLastLine(host, point))) {
    const pos = moveInHost(controller, host, head, caret, direction);
    return pos && textSelection(pos);
  }
  const own = extend ? null : ownNode(controller, head.block, direction);
  if (own !== null) return own;
  const accept = extend ? holdsTextHead(controller) : canBeEntered(controller);
  const target = neighbourBlock(controller.editor.state.doc, head.block, direction, accept);
  return target && (landAtGoal(controller, target, direction) ?? entryEdge(controller, target.id, direction));
}

// A selection across hosts is drawn by the editor, so the browser can make none of its moves: past the first or the
// last line of the document the head goes to the edge of its block.
function moveText(controller: ViewController, selection: TextSelection, direction: -1 | 1, extend: boolean): boolean {
  const edge = isCrossSelection(selection) ? entryEdge(controller, selection.head.block, -direction as -1 | 1) : null;
  const next = landing(controller, selection, direction, extend) ?? edge;
  if (next === null) {
    controller.nativeVerticalMove = true;
    return false;
  }
  const moved = extend && next.kind === 'text' ? textSelection(selection.anchor, next.head) : next;
  dispatchSelection(controller, moved);
  return true;
}

function extendBlocks(controller: ViewController, { anchor, head }: BlockRangeSelection, direction: -1 | 1): boolean {
  const next = neighbourBlock(controller.editor.state.doc, head, direction);
  if (next === null) return false;
  dispatchSelection(controller, blockRangeSelection(anchor, next.id));
  return true;
}

export function moveVertically(controller: ViewController, direction: -1 | 1, extend: boolean): boolean {
  const { selection } = controller.editor.state;
  if (selection?.kind === 'node') return !extend && moveToNeighbour(controller, selection.block, direction);
  if (selection?.kind === 'blocks') return extend && extendBlocks(controller, selection, direction);
  if (selection?.kind !== 'text') return false;
  if (extend || !isCrossSelection(selection)) return moveText(controller, selection, direction, extend);
  controller.goalX = null;
  return collapseCross(controller, selection, direction);
}
