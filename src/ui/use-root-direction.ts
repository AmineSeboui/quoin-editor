import { useState } from 'react';
import type { ViewController } from '../view';
import { useIsomorphicLayoutEffect } from '../view/react/use-isomorphic-layout-effect';
import { inlineDirection, type InlineDirection } from './direction';

/**
 * The direction the canvas is laid out in, read from its root element once that is mounted. The menus and toolbars ask
 * to be placed at the inline start or end, and whoever places them is drawn in a portal outside the canvas, so it reads
 * the direction through React rather than from the DOM around it.
 *
 * A page that turns round while the canvas is mounted is not followed, which matches the gutter: the direction is read
 * as the canvas mounts and again only if it is given another controller.
 */
export function useRootDirection(controller: ViewController): InlineDirection {
  const [direction, setDirection] = useState<InlineDirection>('ltr');
  useIsomorphicLayoutEffect(() => {
    const root = controller.root;
    if (root !== null) setDirection(inlineDirection(root));
  }, [controller]);
  return direction;
}
