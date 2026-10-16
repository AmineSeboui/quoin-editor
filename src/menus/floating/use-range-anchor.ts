import { useMemo, useRef, useState, type RefObject } from 'react';
import type { SuggestionRange } from '../../extensions/ui-types';
import type { ViewController } from '../../view';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import { rangeRect } from './range-rect';
import { sideFor, virtualAnchor, type MenuSide, type VirtualAnchor } from './virtual-anchor';

type RangeAnchor = { anchor: RefObject<VirtualAnchor | null>; side: MenuSide };

/**
 * An anchor at a range of text, renewed as the range changes so a menu follows it, and the side the menu opens on,
 * chosen once where the range starts so it does not flip while the query is typed.
 */
export function useRangeAnchor(controller: ViewController, range: SuggestionRange | null): RangeAnchor {
  const anchor = useMemo(
    () => ({ current: range && virtualAnchor(() => rangeRect(controller, range)) }),
    [controller, range],
  );
  const [side, setSide] = useState<MenuSide>('bottom');
  const latest = useRef(range);
  const start = range === null ? null : `${range.block} ${range.region} ${range.from}`;

  useIsomorphicLayoutEffect(() => {
    latest.current = range;
  });
  useIsomorphicLayoutEffect(() => {
    const rect = latest.current && rangeRect(controller, latest.current);
    if (rect) setSide(sideFor(rect, window.innerHeight));
  }, [controller, start]);

  return { anchor, side };
}
