import type { Pos, Selection } from '../../engine';
import { blockRangeSelection, nodeSelection, sameSelection, textSelection } from '../../engine/state/selection';
import { domToPos } from '../controller/dom-selection';
import type { HostEntry } from '../controller/host-registry';
import type { ViewController } from '../controller/view-controller';
import { entryEdge } from '../navigation/neighbour-block';
import { createAutoScroll } from './auto-scroll';
import { blockAt, caretPosAt, hostAt } from './pointer-targets';
import { NATIVE_INTERACTION } from './native-interaction';
import { isCrossSelection } from './selection-decorations';

export type CrossBlockPointer = { attach(root: HTMLElement): () => void };

type Press =
  | { kind: 'text'; host: HostEntry; anchor: Pos | null }
  | { kind: 'blocks'; start: string; x: number; y: number };

const DRAGGING = 'data-quoin-dragging';
const DRAG_DISTANCE = 4;
const CONTROLS = `button, a, input, select, textarea, [${NATIVE_INTERACTION}]`;

const sameHost = (pos: Pos, host: HostEntry): boolean => pos.block === host.block && pos.region === host.region;

function anchorAtCrossing(controller: ViewController): Pos | null {
  const native = controller.domSelection();
  const anchor = native?.anchorNode && domToPos(controller.registry, native.anchorNode, native.anchorOffset);
  if (anchor) return anchor;
  const { selection } = controller.editor.state;
  return selection?.kind === 'text' ? selection.anchor : null;
}

export function createCrossBlockPointer(controller: ViewController): CrossBlockPointer {
  return {
    attach(root) {
      const doc = root.ownerDocument;
      const view = doc.defaultView as Window;
      let press: Press | null = null;
      let last = { x: 0, y: 0 };
      let preventMouseDown = false;
      const scroll = createAutoScroll(root, () => follow(last.x, last.y));

      function select(selection: Selection): void {
        if (sameSelection(selection, controller.editor.state.selection)) return;
        controller.dispatch(controller.editor.createTransaction().setSelection(selection));
      }

      function startDragging(): void {
        controller.dragging = true;
        root.setAttribute(DRAGGING, '');
      }

      function followText(current: Extract<Press, { kind: 'text' }>, x: number, y: number): void {
        const target = hostAt(controller, x, y);
        if (target === null) return;
        if (current.anchor === null) {
          if (target.element === current.host.element) return;
          current.anchor = anchorAtCrossing(controller);
          if (current.anchor === null) return;
          startDragging();
        }
        select(textSelection(current.anchor, caretPosAt(controller, target, x, y)));
      }

      function followBlocks(current: Extract<Press, { kind: 'blocks' }>, x: number, y: number): void {
        if (!controller.dragging && Math.hypot(x - current.x, y - current.y) < DRAG_DISTANCE) return;
        const block = blockAt(controller, x, y);
        if (block === null) return;
        startDragging();
        select(blockRangeSelection(current.start, block));
      }

      function follow(x: number, y: number): void {
        if (press?.kind === 'text') followText(press, x, y);
        else if (press?.kind === 'blocks') followBlocks(press, x, y);
      }

      function release(): boolean {
        doc.removeEventListener('pointermove', onPointerMove);
        doc.removeEventListener('pointerup', end);
        doc.removeEventListener('pointercancel', end);
        view.removeEventListener('blur', end);
        scroll.stop();
        press = null;
        const dragged = controller.dragging;
        controller.dragging = false;
        root.removeAttribute(DRAGGING);
        return dragged;
      }

      function end(): void {
        if (release()) controller.focus();
      }

      function onPointerMove(event: PointerEvent): void {
        if ((event.buttons & 1) === 0) return end();
        last = { x: event.clientX, y: event.clientY };
        follow(last.x, last.y);
        if (controller.dragging) scroll.update(last.y);
      }

      // A Shift+click that moves the head to another host is the editor's to make: the browser would stop at the
      // edge of the host the selection started in.
      function extendFrom(host: HostEntry, x: number, y: number): void {
        const { selection } = controller.editor.state;
        if (selection?.kind !== 'text') return;
        if (sameHost(selection.anchor, host) && !isCrossSelection(selection)) return;
        press = { kind: 'text', host, anchor: selection.anchor };
        preventMouseDown = true;
        startDragging();
        follow(x, y);
      }

      function onPointerDown(event: PointerEvent): void {
        end();
        preventMouseDown = false;
        if (event.button !== 0 || event.pointerType === 'touch') return;
        const target = event.target as Element;
        const host = controller.registry.locate(target);
        const block = host === null ? controller.blockAt(target) : undefined;
        const control = target.closest(CONTROLS);
        if (host !== null) {
          press = { kind: 'text', host, anchor: null };
          if (event.shiftKey) extendFrom(host, event.clientX, event.clientY);
        } else if (block !== undefined && !(control && root.contains(control))) {
          press = { kind: 'blocks', start: block, x: event.clientX, y: event.clientY };
          // A node selection is otherwise read from the native one, and Firefox leaves none after a press on a block
          // with no text, such as a divider.
          if (!event.shiftKey && entryEdge(controller, block, 1).kind === 'node') {
            controller.nodeReveal.pressed(block);
            select(nodeSelection(block));
          }
        } else {
          return;
        }
        doc.addEventListener('pointermove', onPointerMove);
        doc.addEventListener('pointerup', end);
        doc.addEventListener('pointercancel', end);
        view.addEventListener('blur', end);
      }

      function onMouseDown(event: MouseEvent): void {
        if (preventMouseDown) event.preventDefault();
        preventMouseDown = false;
      }

      root.addEventListener('pointerdown', onPointerDown);
      root.addEventListener('mousedown', onMouseDown);
      return () => {
        release();
        root.removeEventListener('pointerdown', onPointerDown);
        root.removeEventListener('mousedown', onMouseDown);
      };
    },
  };
}
