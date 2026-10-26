import { useCallback, useRef, type RefObject } from 'react';
import type { ViewController } from '../../view';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import { clipOf } from '../overflow-clip';
import { keepReaderStill } from './keep-reader-still';
import { spaceBelow } from './space-below';

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
  const { padding, gap } = spaceBelow(shell);
  const left = (text.left - origin.left) / scale - root.clientLeft + root.scrollLeft;
  const top = (below.bottom - origin.top) / scale - padding - root.clientTop + root.scrollTop + GAP;
  layer.style.transform = `translate(${left}px, ${top}px)`;
  layer.style.width = `${text.width / scale}px`;
  clipAside(layer, text, clipOf(host, root), scale);
  const room = Math.max(0, layer.offsetHeight + 2 * GAP - padding - gap);
  keepReaderStill(root, shell, () => root.style.setProperty(ROOM, `${room}px`));
}

// Under text inside a scroller of the canvas, such as a wide table's, the answer shows only where that text can.
function clipAside(layer: HTMLElement, text: DOMRect, clip: HTMLElement | null, scale: number): void {
  const area = clip?.getBoundingClientRect();
  const start = area === undefined ? 0 : Math.max(0, area.left - text.left) / scale;
  const end = area === undefined ? 0 : Math.max(0, text.right - area.right) / scale;
  layer.style.clipPath = start > 0 || end > 0 ? `inset(0 ${end}px 0 ${start}px)` : '';
  if (start + end >= text.width / scale && text.width > 0) layer.style.visibility = 'hidden';
}

/**
 * Puts the layer under the block the answer is for, as wide as its text, and keeps that much room under the block, so
 * the answer covers no text. It follows every change, resize, scroll and font load, and moves nothing else. What it
 * returns places the layer at once, for a layout effect that has just changed what the layer holds: the room then
 * grows in the frame the answer does, never a frame after it.
 */
export function useGhostPlace(
  controller: ViewController,
  layer: RefObject<HTMLElement | null>,
  block: string,
  region: string,
): () => void {
  const placeNow = useRef<() => void>(() => {});
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
    placeNow.current = update;
    const observer = new ResizeObserver(later);
    observer.observe(root);
    observer.observe(element);
    const host = controller.registry.get(block, region);
    if (host) observer.observe(host);
    const unsubscribe = controller.editor.subscribe(later);
    const fonts = root.ownerDocument.fonts;
    root.addEventListener('scroll', later, { capture: true, passive: true });
    fonts?.addEventListener('loadingdone', later);
    return () => {
      placeNow.current = () => {};
      view.cancelAnimationFrame(frame);
      observer.disconnect();
      unsubscribe();
      root.removeEventListener('scroll', later, { capture: true });
      fonts?.removeEventListener('loadingdone', later);
      root.style.removeProperty(ROOM);
    };
  }, [controller, layer, block, region]);
  return useCallback(() => placeNow.current(), []);
}
