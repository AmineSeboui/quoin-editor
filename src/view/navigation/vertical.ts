import type { EngineBlock, Selection } from '../../engine';
import { isTextFlow } from '../../engine/commands/block-helpers';
import { primaryRegion, textSelection } from '../../engine/state/selection';
import { domToPos, posToDom } from '../controller/dom-selection';
import type { ViewController } from '../controller/view-controller';
import { caretFromPoint } from './caret-from-point';
import { caretClientRect, isOnFirstLine, isOnLastLine, lineEdgeRect } from './line-edges';
import { entryEdge, holdsTextHead, moveToNeighbour, neighbourBlock } from './neighbour-block';

// caretFromPoint only finds content inside the viewport.
function lineInView(host: HTMLElement, last: boolean): DOMRect | null {
  const line = lineEdgeRect(host, last);
  const view = host.ownerDocument.defaultView;
  if (!line || !view || (line.top >= 0 && line.bottom <= view.innerHeight)) return line;
  host.scrollIntoView({ block: 'nearest' });
  return lineEdgeRect(host, last);
}

function landAtGoal(controller: ViewController, block: EngineBlock, direction: -1 | 1): Selection | null {
  const { schema } = controller.editor.state;
  const region = isTextFlow(schema, block) ? primaryRegion(schema, block) : null;
  const host = region === null ? undefined : controller.registry.get(block.id, region);
  const { goalX } = controller;
  if (!host || goalX === null) return null;
  const line = lineInView(host, direction < 0);
  if (!line) return null;
  const box = host.getBoundingClientRect();
  const x = Math.min(Math.max(goalX, box.left), box.right - 1);
  const point = caretFromPoint(host.ownerDocument, x, line.top + line.height / 2);
  const pos = point && domToPos(controller.registry, point.node, point.offset);
  return pos && pos.block === block.id && pos.region === region ? textSelection(pos) : null;
}

export function moveVertically(controller: ViewController, direction: -1 | 1, extend: boolean): boolean {
  const { editor, registry } = controller;
  const { state } = editor;
  const { selection, doc } = state;
  if (selection?.kind === 'node') return !extend && moveToNeighbour(controller, selection.block, direction);
  if (selection?.kind !== 'text') return false;
  const { head } = selection;
  const host = registry.get(head.block, head.region);
  const point = posToDom(registry, head);
  if (!host || !point || !(direction < 0 ? isOnFirstLine(host, point) : isOnLastLine(host, point))) return false;
  const target = neighbourBlock(doc, head.block, direction, extend ? holdsTextHead(controller) : undefined);
  if (target === null) return false;
  controller.goalX ??= caretClientRect(point)?.left ?? null;
  const landing = landAtGoal(controller, target, direction) ?? entryEdge(controller, target.id, direction);
  const next = extend && landing.kind === 'text' ? textSelection(selection.anchor, landing.head) : landing;
  controller.dispatch(editor.createTransaction().setSelection(next));
  return true;
}
