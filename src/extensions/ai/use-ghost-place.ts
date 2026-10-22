import type { RefObject } from 'react';
import type { ViewController } from '../../view';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';

const ROOM = '--quoin-ai-room';
const GAP = 4;

function place(controller: ViewController, root: HTMLElement, layer: HTMLElement, block: string, region: string) {
  const shell = controller.blockElement(block);
  if (shell === undefined || !shell.isConnected) {
    layer.style.visibility = 'hidden';
    return;
  }
  layer.style.visibility = '';
  const host = controller.registry.get(block, region) ?? shell;
  const origin = root.getBoundingClientRect();
  const scale = origin.width / root.offsetWidth || 1;
  const below = shell.getBoundingClientRect();
  const text = host.getBoundingClientRect();
  const left = (text.left - origin.left) / scale - root.clientLeft + root.scrollLeft;
  const top = (below.bottom - origin.top) / scale - root.clientTop + root.scrollTop + GAP;
  layer.style.transform = `translate(${left}px, ${top}px)`;
  layer.style.width = `${text.width / scale}px`;
  root.style.setProperty(ROOM, `${layer.offsetHeight + 2 * GAP}px`);
}

/**
 * Puts the layer under the block the answer is for, as wide as its text, and keeps that much room under the block, so
 * the answer covers no text. It follows every change, resize, scroll and font load, and moves nothing else.
 */
export function useGhostPlace(
  controller: ViewController,
  layer: RefObject<HTMLElement | null>,
  block: string,
  region: string,
): void {
  useIsomorphicLayoutEffect(() => {
    const root = controller.root;
    const element = layer.current;
    const view = root?.ownerDocument.defaultView;
    if (!root || !element || !view) return undefined;
    const update = () => place(controller, root, element, block, region);
    let frame = 0;
    const later = () => {
      view.cancelAnimationFrame(frame);
      frame = view.requestAnimationFrame(update);
    };
    update();
    const observer = new ResizeObserver(later);
    observer.observe(root);
    observer.observe(element);
    const unsubscribe = controller.editor.subscribe(later);
    const fonts = root.ownerDocument.fonts;
    root.addEventListener('scroll', later, { capture: true, passive: true });
    fonts?.addEventListener('loadingdone', later);
    return () => {
      view.cancelAnimationFrame(frame);
      observer.disconnect();
      unsubscribe();
      root.removeEventListener('scroll', later, { capture: true });
      fonts?.removeEventListener('loadingdone', later);
      root.style.removeProperty(ROOM);
    };
  }, [controller, layer, block, region]);
}
