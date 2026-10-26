import type { ViewController } from '../../view';

/**
 * Calls `place` now and whenever what it places may have moved with no change of its own: after each change of the
 * editor and each resize of the root, or of an element `place` hands the observer, in the next frame; as a font arrives;
 * and at once, in the frame it is drawn, when a scroller inside the canvas scrolls. Returns the stop.
 */
export function followLayout(
  controller: ViewController,
  root: HTMLElement,
  place: (observer: ResizeObserver) => void,
): () => void {
  const view = root.ownerDocument.defaultView!;
  let frame = 0;
  const update = () => place(observer);
  const later = () => {
    view.cancelAnimationFrame(frame);
    frame = view.requestAnimationFrame(update);
  };
  const observer = new ResizeObserver(later);
  update();
  observer.observe(root);
  const unsubscribe = controller.editor.subscribe(later);
  const fonts = root.ownerDocument.fonts;
  root.addEventListener('scroll', update, { capture: true, passive: true });
  fonts?.addEventListener('loadingdone', later);
  return () => {
    view.cancelAnimationFrame(frame);
    unsubscribe();
    observer.disconnect();
    root.removeEventListener('scroll', update, { capture: true });
    fonts?.removeEventListener('loadingdone', later);
  };
}
