'use client';

import { useMemo, type RefObject } from 'react';
import { virtualAnchor, type VirtualAnchor } from '../../menus/floating/virtual-anchor';
import type { ViewController } from '../../view';

export const blockPart = (controller: ViewController, blockId: string, selector: string): HTMLElement | undefined =>
  controller.blockElement(blockId)?.querySelector<HTMLElement>(selector) ?? undefined;

/** An anchor for a floating control over a part of a drawn block, measured wherever the part is drawn now. */
export function usePartAnchor(controller: ViewController, blockId: string, selector: string): RefObject<VirtualAnchor> {
  return useMemo(() => {
    const part = () => blockPart(controller, blockId, selector);
    return { current: virtualAnchor(() => part()?.getBoundingClientRect() ?? null, part) };
  }, [controller, blockId, selector]);
}
