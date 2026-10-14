import type { EditorState } from '../../engine';
import type { ViewController } from '../controller/view-controller';
import { createCrossBlockPointer } from './cross-block-pointer';
import { createPainter, type Painter } from './paint-selection';
import { isCrossSelection, type PaintMode } from './selection-decorations';
import { clearSink, heldBySink } from './selection-sink';

export type CrossMode = {
  readonly active: boolean;
  readonly mode: PaintMode;
  attach(root: HTMLElement): () => void;
  sync(): void;
  syncLater(): void;
};

type Attached = { readonly root: HTMLElement; readonly view: Window; readonly painter: Painter };

const CROSS = 'data-quoin-cross';

export function createCrossMode(controller: ViewController): CrossMode {
  let attached: Attached | null = null;
  let active = false;
  let synced: EditorState | null = null;
  let frame: number | null = null;

  function sync(): void {
    const { state } = controller.editor;
    const cross = isCrossSelection(state.selection);
    synced = state;
    if (cross) {
      attached?.root.setAttribute(CROSS, '');
      attached?.painter.paint(controller);
    } else if (active) {
      attached?.root.removeAttribute(CROSS);
      attached?.painter.clear();
    }
    if (!heldBySink(state.selection)) clearSink(controller);
    active = cross;
  }

  // A transaction dispatched straight on the editor reaches the hosts through React, so it is painted on the next
  // frame, once they have rendered.
  function syncLater(): void {
    if (attached === null || frame !== null) return;
    frame = attached.view.requestAnimationFrame(() => {
      frame = null;
      if (controller.editor.state !== synced) sync();
    });
  }

  return {
    get active() {
      return active;
    },
    get mode() {
      return attached?.painter.mode ?? 'highlight';
    },
    attach(root) {
      const view = root.ownerDocument.defaultView as Window;
      const current: Attached = { root, view, painter: createPainter(view) };
      attached = current;
      const detachPointer = createCrossBlockPointer(controller).attach(root);
      sync();
      return () => {
        detachPointer();
        if (frame !== null) view.cancelAnimationFrame(frame);
        frame = null;
        current.painter.clear();
        root.removeAttribute(CROSS);
        if (attached === current) attached = null;
        active = false;
      };
    },
    sync,
    syncLater,
  };
}
