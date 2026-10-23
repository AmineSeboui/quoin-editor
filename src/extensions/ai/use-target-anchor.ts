import { useMemo, useRef } from 'react';
import { rangeRect } from '../../menus/floating/range-rect';
import { virtualAnchor } from '../../menus/floating/virtual-anchor';
import type { ViewController } from '../../view';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
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
