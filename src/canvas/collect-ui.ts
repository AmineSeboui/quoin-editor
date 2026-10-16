import { voidRenderers } from '../blocks/void/void-renderers';
import type { AnyBlockDefinition } from '../registry';
import { defaultRenderers, type BlockRenderer } from '../view';

/** Every definition draws as a void block, except the types the canvas types in place. */
export function canvasRenderers(definitions: readonly AnyBlockDefinition[]): Readonly<Record<string, BlockRenderer>> {
  return { ...voidRenderers(definitions), ...defaultRenderers };
}
