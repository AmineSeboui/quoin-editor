import type { BlockRangeSelection, EngineBlock, Pos, Selection, TextSelection } from '../../engine';
import { isTextFlow } from '../../engine/commands/block-helpers';
import { blockRangeSelection, primaryRegion } from '../../engine/state/selection';
import { posToDom } from '../controller/dom-selection';
import type { ViewController } from '../controller/view-controller';
import { isCrossSelection } from '../selection/selection-decorations';
import { caretInHost } from './caret-in-host';
import { collapseCross, crossHeadVertically, moveHead } from './cross-moves';
import { adjacentLineMiddle, caretClientRect, isOnFirstLine, isOnLastLine, lineEdgeRect } from './line-edges';
import { canBeEntered, entryEdge, holdsTextHead, moveToNeighbour, neighbourBlock, ownNode } from './neighbour-block';
import { stayOnLine } from './stay-on-line';
import { dispatchSelection } from '../controller/dispatch-selection';
import { glyphsAround, upstreamCaret } from './glyph';

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
  return caretInHost(controller.registry, host, host.getBoundingClientRect(), at, goalX, y);
}

const keepOnLine = ({ registry }: ViewController, pos: Pos, y: number): TextSelection =>
  stayOnLine(pos, y, glyphsAround(registry, pos));

function landAtGoal(controller: ViewController, block: EngineBlock, direction: -1 | 1): Selection | null {
  const { schema } = controller.editor.state;
  const region = isTextFlow(schema, block) ? primaryRegion(schema, block) : null;
  const host = region === null ? undefined : controller.registry.get(block.id, region);
  if (!host || region === null || controller.goalX === null) return null;
  const line = lineInView(host, direction < 0);
  if (!line) return null;
  const y = line.top + line.height / 2;
  const pos = caretAtGoal(controller, host, { block: block.id, region }, y);
  return pos && keepOnLine(controller, pos, y);
}

// The browser keeps its own goal column across the moves it makes inside a host, but not across a caret the editor
// put down, so a caret that stopped short of the goal at the end of a shorter line is moved by the editor, as is the
// head of a selection across hosts, which the browser does not hold. A browser landing past the end of a line before a
// soft wrap leaves typed text to start the next line, so that landing is the editor's too.
function moveInHost(
  controller: ViewController,
  host: HTMLElement,
  head: Pos,
  caret: DOMRect | null,
  direction: -1 | 1,
): TextSelection | null {
  const { goalX } = controller;
  if (goalX === null || !caret) return null;
  const atGoal = Math.abs(caret.left - goalX) < caret.height / 2;
  const native = atGoal && !isCrossSelection(controller.editor.state.selection);
  const y = adjacentLineMiddle(host, caret, direction);
  if (y === null) return null;
  const pos = caretAtGoal(controller, host, head, y);
  const next = pos && keepOnLine(controller, pos, y);
  if (!next || next.head.offset === head.offset) return null;
  return native && next.head === pos && next.assoc === undefined ? null : next;
}

function landing(
  controller: ViewController,
  { head, assoc }: TextSelection,
  direction: -1 | 1,
  extend: boolean,
): Selection | null {
  const { registry } = controller;
  const host = registry.get(head.block, head.region);
  const point = posToDom(registry, head);
  if (!host || !point) return null;
  const caret = (assoc === -1 && upstreamCaret(registry, head)) || caretClientRect(point);
  controller.goalX ??= caret?.left ?? null;
  if (!(direction < 0 ? isOnFirstLine(host, point, caret) : isOnLastLine(host, point, caret))) {
    return moveInHost(controller, host, head, caret, direction);
  }
  const own = extend ? null : ownNode(controller, head.block, direction);
  if (own !== null) return own;
  const accept = extend ? holdsTextHead(controller) : canBeEntered(controller);
  const target = neighbourBlock(controller.editor.state.doc, head.block, direction, accept);
  return target && (landAtGoal(controller, target, direction) ?? entryEdge(controller, target.id, direction));
}

// A selection across hosts is drawn by the editor, so the browser can make none of its moves.
function moveText(controller: ViewController, selection: TextSelection, direction: -1 | 1, extend: boolean): boolean {
  const next = landing(controller, selection, direction, extend);
  if (next === null) {
    if (isCrossSelection(selection)) return crossHeadVertically(controller, selection, direction);
    controller.nativeVerticalMove = true;
    return false;
  }
  if (extend && next.kind === 'text') return moveHead(controller, selection, next.head);
  dispatchSelection(controller, next);
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
