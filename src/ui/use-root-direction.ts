import { useState } from 'react';
import type { ViewController } from '../view';
import { useIsomorphicLayoutEffect } from '../view/react/use-isomorphic-layout-effect';
import { inlineDirection, type InlineDirection } from './direction';
import { watchDirection } from './watch-direction';

/**
 * The direction the canvas is laid out in, read from its root element once that is mounted and again whenever the page
 * turns it round. The menus and toolbars ask to be placed at the inline start or end, and whoever places them is drawn
 * in a portal outside the canvas, so it reads the direction through React rather than from the DOM around it.
 */
export function useRootDirection(controller: ViewController): InlineDirection {
  const [direction, setDirection] = useState<InlineDirection>('ltr');
  useIsomorphicLayoutEffect(() => {
    const root = controller.root;
    if (root === null) return;
    setDirection(inlineDirection(root));
    return watchDirection(root, setDirection);
  }, [controller]);
  return direction;
}
