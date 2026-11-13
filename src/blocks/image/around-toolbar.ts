'use client';

import { useMemo, type RefObject } from 'react';
import { virtualAnchor, type VirtualAnchor } from '../../menus/floating/virtual-anchor';

function around(a: DOMRect, b: DOMRect): DOMRect {
  const left = Math.min(a.left, b.left);
  const top = Math.min(a.top, b.top);
  return new DOMRect(left, top, Math.max(a.right, b.right) - left, Math.max(a.bottom, b.bottom) - top);
}

/**
 * An anchor around a part of a block and the floating toolbar that holds `inToolbar`, wherever the toolbar is drawn, so
 * a popover anchored to it goes beside both and never covers the toolbar, whichever side either one flips to.
 */
export function useAroundToolbar(
  part: RefObject<VirtualAnchor>,
  inToolbar: RefObject<HTMLElement | null>,
): RefObject<VirtualAnchor> {
  return useMemo(() => {
    const measure = () => {
      const box = part.current.getBoundingClientRect();
      const toolbar = inToolbar.current?.closest('[role="toolbar"]')?.getBoundingClientRect();
      return toolbar === undefined ? box : around(box, toolbar);
    };
    return { current: virtualAnchor(measure, () => part.current.contextElement) };
  }, [part, inToolbar]);
}
