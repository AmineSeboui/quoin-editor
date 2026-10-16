import type { RefObject } from 'react';
import type { ViewController } from '../view';
import { useIsomorphicLayoutEffect } from '../view/react/use-isomorphic-layout-effect';

const GAP = 4;
const VOID_LINE = 24;

function firstLine(shell: HTMLElement): { top: number; height: number } {
  const host = shell.querySelector<HTMLElement>('[data-quoin-host]');
  if (host === null) {
    const box = shell.getBoundingClientRect();
    return { top: box.top, height: Math.min(box.height, VOID_LINE) };
  }
  const style = getComputedStyle(host);
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
  return { top: host.getBoundingClientRect().top + (parseFloat(style.paddingTop) || 0), height: lineHeight };
}

function place(controller: ViewController, root: HTMLElement, gutter: HTMLElement, block: string): void {
  const shell = controller.blockElement(block);
  if (shell === undefined) {
    gutter.style.visibility = 'hidden';
    return;
  }
  const rootBox = root.getBoundingClientRect();
  const line = firstLine(shell);
  const top = line.top + (line.height - gutter.offsetHeight) / 2 - rootBox.top - root.clientTop + root.scrollTop;
  const left = shell.getBoundingClientRect().left - rootBox.left - root.clientLeft + root.scrollLeft;
  gutter.style.transform = `translate(${left - gutter.offsetWidth - GAP}px, ${top}px)`;
  gutter.style.visibility = '';
}

// The gutter is moved in place rather than through React state, so the pointer crossing blocks and every edit that
// shifts the layout draw nothing but the gutter. Positions are read once the frame's edits have reached the hosts.
export function useGutterPosition(
  controller: ViewController,
  gutter: RefObject<HTMLElement | null>,
  block: string | null,
): void {
  useIsomorphicLayoutEffect(() => {
    const element = gutter.current;
    const root = controller.root;
    const view = root?.ownerDocument.defaultView;
    if (element === null || root === null || !view || block === null) return;
    const update = () => place(controller, root, element, block);
    update();
    let frame = 0;
    const later = () => {
      view.cancelAnimationFrame(frame);
      frame = view.requestAnimationFrame(update);
    };
    const unsubscribe = controller.editor.subscribe(later);
    const observer = new ResizeObserver(later);
    observer.observe(root);
    view.addEventListener('resize', later);
    return () => {
      view.cancelAnimationFrame(frame);
      unsubscribe();
      observer.disconnect();
      view.removeEventListener('resize', later);
    };
  }, [controller, gutter, block]);
}
