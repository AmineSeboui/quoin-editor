import type { ViewController } from '../../view';

/** The element inside a table's scroller that its controls are drawn into, so that they scroll with it. */
export const CONTROLS_SLOT = 'data-quoin-table-controls';

export const controlsSlot = (controller: ViewController, blockId: string): HTMLElement | null =>
  controller.blockElement(blockId)?.querySelector<HTMLElement>(`[${CONTROLS_SLOT}]`) ?? null;
