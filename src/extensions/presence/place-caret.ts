import { getPluginState, type Pos } from '../../engine';
import { domMapOf, type ViewController } from '../../view';
import { clipBoxes } from '../overflow-clip';
import { presenceKey } from './presence-plugin';

// The box of the place at `pos` in `host`: a collapsed range there, or the character before or after it, or the host.
function caretBox(host: HTMLElement, offset: number): DOMRect | null {
  const map = domMapOf(host);
  if (!map || !host.isConnected) return null;
  const doc = host.ownerDocument;
  const spans: [number, number, 'start' | 'end'][] = [
    [offset, offset, 'start'],
    [offset - 1, offset, 'end'],
    [offset, offset + 1, 'start'],
  ];
  for (const [from, to, side] of spans) {
    if (from < 0 || to > map.length) continue;
    const range = doc.createRange();
    const start = map.toDom(from, from === to ? -1 : 1);
    const end = map.toDom(to, -1);
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    const rects = range.getClientRects();
    const rect = side === 'end' ? rects[rects.length - 1] : rects[0];
    if (rect === undefined) continue;
    return new DOMRect(side === 'end' ? rect.right : rect.left, rect.top, 0, rect.height);
  }
  const box = host.getBoundingClientRect();
  return new DOMRect(box.left, box.top, 0, box.height);
}

function inside(box: DOMRect, area: DOMRect): boolean {
  return box.left >= area.left && box.left <= area.right && box.bottom > area.top && box.top < area.bottom;
}

/**
 * Puts a collaborator's caret over the character its selection's head is at, in the root's own pixels however the
 * root is scaled, or hides it where that character is not drawn or is scrolled out of the boxes that clip it; near
 * their edges the caret and its name are cut off where they are. The host is given to `observer`, so a reflow of its
 * text places the caret again.
 */
export function placeCaret(
  controller: ViewController,
  root: HTMLElement,
  caret: HTMLElement,
  observer: ResizeObserver,
) {
  const client = Number(caret.dataset.client);
  const peer = getPluginState(controller.editor.state, presenceKey).find((one) => one.client === client);
  const head = peer?.selection?.kind === 'text' ? peer.selection.head : null;
  const host = head && controller.registry.get(head.block, head.region);
  const box = host ? caretBox(host, (head as Pos).offset) : null;
  const areas = host ? clipBoxes(host, root) : [];
  const shown = box !== null && areas.every((area) => inside(box, area));
  caret.style.visibility = shown ? '' : 'hidden';
  if (!shown) return;
  observer.observe(host!);
  const origin = root.getBoundingClientRect();
  const scale = origin.width / root.offsetWidth || 1;
  const left = (box.left - origin.left) / scale - root.clientLeft + root.scrollLeft;
  const top = (box.top - origin.top) / scale - root.clientTop + root.scrollTop;
  caret.style.transform = `translate(${left}px, ${top}px)`;
  caret.style.height = `${box.height / scale}px`;
  const cut = (past: (area: DOMRect) => number) => `${Math.max(...areas.map(past)) / scale + 1}px`;
  caret.style.clipPath = areas[0] ? `inset(-99px ${cut((a) => box.left - a.right)} -99px ${cut((a) => a.left - box.left)})` : '';
}
