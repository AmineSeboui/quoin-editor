'use client';

import { useState, type PointerEvent } from 'react';
import type { ViewController } from '../../view';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';

/**
 * Whether a press that started on an embed's cover is still going. The canvas selects the block at pointerdown, and the
 * cover has to stay under the pointer until its click: lifted any sooner, the release lands in the frame, the click
 * never comes, and focus never reaches the editor. So the press is noted in the capture phase, which React runs before
 * the canvas's own listener draws the selection. Only the primary button counts, as only it selects the block.
 */
export function useCoverPress(controller: ViewController): {
  pressing: boolean;
  onPress(event: PointerEvent<HTMLElement>): void;
} {
  const [pressing, setPressing] = useState(false);
  useIsomorphicLayoutEffect(() => {
    const doc = controller.root?.ownerDocument;
    if (!pressing || doc === undefined) return;
    const release = () => setPressing(false);
    doc.addEventListener('click', release);
    doc.addEventListener('pointercancel', release);
    doc.addEventListener('dragend', release);
    return () => {
      doc.removeEventListener('click', release);
      doc.removeEventListener('pointercancel', release);
      doc.removeEventListener('dragend', release);
    };
  }, [controller, pressing]);
  const onPress = (event: PointerEvent<HTMLElement>) => {
    if (event.button === 0) setPressing(true);
  };
  return { pressing, onPress };
}
