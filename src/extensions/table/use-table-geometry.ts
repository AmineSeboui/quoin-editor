'use client';

import { useState } from 'react';
import type { ViewController } from '../../view';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import { measureTable, sameGeometry, type TableGeometry } from './table-geometry';

/**
 * Where the table of the block is drawn, from the slot its controls are drawn in. Both scroll together, so the measure
 * holds while the table scrolls, and it is taken again once an edit or a resize has been drawn.
 */
export function useTableGeometry(controller: ViewController, blockId: string, slot: HTMLElement): TableGeometry | null {
  const [geometry, setGeometry] = useState<TableGeometry | null>(null);

  useIsomorphicLayoutEffect(() => {
    const table = controller.blockElement(blockId)?.querySelector('table');
    const view = slot.ownerDocument.defaultView;
    if (!table || !view) return;
    const measure = () => {
      const next = measureTable(table, slot.getBoundingClientRect());
      setGeometry((current) => (sameGeometry(current, next) ? current : next));
    };
    measure();
    let frame = 0;
    const later = () => {
      view.cancelAnimationFrame(frame);
      frame = view.requestAnimationFrame(measure);
    };
    const unsubscribe = controller.editor.subscribe(later);
    const observer = new ResizeObserver(later);
    observer.observe(table);
    view.addEventListener('resize', later);
    return () => {
      view.cancelAnimationFrame(frame);
      unsubscribe();
      observer.disconnect();
      view.removeEventListener('resize', later);
    };
  }, [controller, blockId, slot]);

  return geometry;
}
