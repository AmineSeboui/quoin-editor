import { useRef, type CSSProperties } from 'react';
import { getPluginState, type EditorState, type Pos } from '../../engine';
import { domMapOf, useEditorState, type ViewController } from '../../view';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import type { PresenceLabels } from './presence-labels';
import { presenceKey, type Peer } from './presence-plugin';

type Shown = Pick<Peer, 'client' | 'name' | 'color' | 'idle'>;

const shownOf = (state: EditorState): readonly Shown[] =>
  getPluginState(state, presenceKey).flatMap(({ client, name, color, idle, selection }) =>
    selection?.kind === 'text' ? [{ client, name, color, idle }] : [],
  );

const sameShown = (a: readonly Shown[], b: readonly Shown[]) => JSON.stringify(a) === JSON.stringify(b);

// The box of the place at `pos`: a collapsed range there, or the character before or after it, or the host itself.
function caretBox(controller: ViewController, { block, region, offset }: Pos): DOMRect | null {
  const host = controller.registry.get(block, region);
  const map = host && domMapOf(host);
  if (!host || !map || !host.isConnected) return null;
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
    const x = side === 'end' ? rect.right : rect.left;
    return new DOMRect(x, rect.top, 0, rect.height);
  }
  const box = host.getBoundingClientRect();
  return new DOMRect(box.left, box.top, 0, box.height);
}

function place(controller: ViewController, root: HTMLElement, caret: HTMLElement): void {
  const client = Number(caret.dataset.client);
  const peer = getPluginState(controller.editor.state, presenceKey).find((one) => one.client === client);
  const box = peer?.selection?.kind === 'text' ? caretBox(controller, peer.selection.head) : null;
  caret.style.visibility = box === null ? 'hidden' : '';
  if (box === null) return;
  const origin = root.getBoundingClientRect();
  const left = box.left - origin.left - root.clientLeft + root.scrollLeft;
  const top = box.top - origin.top - root.clientTop + root.scrollTop;
  caret.style.transform = `translate(${left}px, ${top}px)`;
  caret.style.height = `${box.height}px`;
}

/**
 * Each collaborator's caret, a line in their colour with their name, drawn over the text rather than in it, so it
 * changes nothing of the caret's moves, the selection, composition or copying. Hidden from assistive technology.
 */
export function RemoteCarets({ controller, labels }: { controller: ViewController; labels: PresenceLabels }) {
  const shown = useEditorState(controller, shownOf, sameShown);
  const box = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const root = controller.root;
    const view = root?.ownerDocument.defaultView;
    if (!root || !view || box.current === null) return undefined;
    const carets = Array.from(box.current.children) as HTMLElement[];
    const update = () => carets.forEach((caret) => place(controller, root, caret));
    update();
    let frame = 0;
    const later = () => {
      view.cancelAnimationFrame(frame);
      frame = view.requestAnimationFrame(update);
    };
    const unsubscribe = controller.editor.subscribe(later);
    const observer = new ResizeObserver(later);
    observer.observe(root);
    return () => {
      view.cancelAnimationFrame(frame);
      unsubscribe();
      observer.disconnect();
    };
  }, [controller, shown]);

  return (
    <div ref={box} className="quoin-presence-carets" aria-hidden="true">
      {shown.map(({ client, name, color, idle }) => (
        <div
          key={client}
          data-client={client}
          data-idle={idle ? '' : undefined}
          className="quoin-presence-caret"
          style={color === undefined ? undefined : ({ '--quoin-presence': color } as CSSProperties)}
        >
          <span className="quoin-presence-name">{labels.caret(name)}</span>
        </div>
      ))}
    </div>
  );
}
