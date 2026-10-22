import type { RefObject } from 'react';
import type { ViewController } from '../../view';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import { stackTops } from './rail-layout';

function topOf(controller: ViewController, root: HTMLElement, block: string): number | null {
  const shell = block === '' ? undefined : controller.blockElement(block);
  if (shell === undefined) return null;
  return shell.getBoundingClientRect().top - root.getBoundingClientRect().top - root.clientTop + root.scrollTop;
}

function place(controller: ViewController, box: HTMLElement, gap: number): void {
  const root = box.parentElement;
  if (root === null) return;
  const items = Array.from(box.querySelectorAll<HTMLElement>('[data-rail-item]'));
  const tops = stackTops(
    items.map((item) => ({ top: topOf(controller, root, item.dataset.block ?? ''), height: item.offsetHeight })),
    gap,
  );
  items.forEach((item, i) => (item.style.transform = `translateY(${tops[i]}px)`));
}

/**
 * Puts each `[data-rail-item]` of a box level with the block its `data-block` names, stacked where they would overlap,
 * again after every change, resize and redraw. It moves the items alone and never scrolls the page.
 */
export function useBlockAligned(
  controller: ViewController,
  box: RefObject<HTMLElement | null>,
  gap: number,
  key: string,
): void {
  useIsomorphicLayoutEffect(() => {
    const element = box.current;
    const view = element?.ownerDocument.defaultView;
    if (!element || !view) return undefined;
    const update = () => place(controller, element, gap);
    update();
    let frame = 0;
    const later = () => {
      view.cancelAnimationFrame(frame);
      frame = view.requestAnimationFrame(update);
    };
    const unsubscribe = controller.editor.subscribe(later);
    const observer = new ResizeObserver(later);
    if (element.parentElement) observer.observe(element.parentElement);
    element.querySelectorAll('[data-rail-item]').forEach((item) => observer.observe(item));
    return () => {
      view.cancelAnimationFrame(frame);
      unsubscribe();
      observer.disconnect();
    };
  }, [controller, box, gap, key]);
}
