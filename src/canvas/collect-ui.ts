import { textRenderers } from '../blocks/text/text-renderers';
import { voidRenderers } from '../blocks/void/void-renderers';
import type { AnyBlockDefinition } from '../registry';
import type { BlockRenderer } from '../view';

/** Every definition draws as a void block, except the types the canvas draws itself: its text blocks and the divider. */
export function canvasRenderers(definitions: readonly AnyBlockDefinition[]): Readonly<Record<string, BlockRenderer>> {
  return { ...voidRenderers(definitions), ...textRenderers };
}
