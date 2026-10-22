import { useMemo, useRef } from 'react';
import { rangeRect } from '../../menus/floating/range-rect';
import { virtualAnchor } from '../../menus/floating/virtual-anchor';
import type { ViewController } from '../../view';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import { GHOST_WIDGET } from './ai-decorations';
import type { AiTarget } from './ai-target';

/** Where the end of the target is drawn, followed as it moves. */
export function useTargetAnchor(controller: ViewController, target: AiTarget) {
  const latest = useRef(target);
  useIsomorphicLayoutEffect(() => {
    latest.current = target;
  });
  return useMemo(() => {
    const end = () => {
      const { to } = latest.current;
      return { block: to.block, region: to.region, from: to.offset, to: to.offset };
    };
    return {
      current: virtualAnchor(
        () => rangeRect(controller, end()),
        () => controller.registry.get(end().block, end().region),
      ),
    };
  }, [controller]);
}

export const ghostElement = (controller: ViewController): HTMLElement | null =>
  controller.root?.querySelector<HTMLElement>(`[data-quoin-widget="${GHOST_WIDGET}"]`) ?? null;

/** The answer drawn in the document, which is drawn anew as it streams, so it is looked up each time it is measured. */
export function useGhostAnchor(controller: ViewController) {
  return useMemo(
    () => ({
      current: virtualAnchor(
        () => ghostElement(controller)?.getBoundingClientRect() ?? null,
        () => ghostElement(controller) ?? undefined,
      ),
    }),
    [controller],
  );
}
