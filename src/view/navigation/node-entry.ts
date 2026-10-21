import type { ViewController } from '../controller/view-controller';

/**
 * Marks a block drawn as more than its text, such as an image over its caption. The arrows select it as a whole when
 * they arrive at it and when the caret leaves its text towards its start, where the rest of it is drawn.
 */
export const NODE_ENTRY = 'data-quoin-node-entry';

export const entersAsNode = (controller: ViewController, block: string): boolean =>
  controller.blockElement(block)?.querySelector(`[${NODE_ENTRY}]`) != null;
