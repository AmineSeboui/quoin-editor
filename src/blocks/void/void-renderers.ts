import { createElement } from 'react';
import type { AnyBlockDefinition } from '../../registry';
import type { BlockRenderProps, BlockRenderer } from '../../view';
import { VoidBlock } from './VoidBlock';

// One renderer per definition object, so a host passing a new array of the same definitions never remounts an open
// editor.
const renderers = new WeakMap<AnyBlockDefinition, BlockRenderer>();

function rendererFor(definition: AnyBlockDefinition): BlockRenderer {
  const known = renderers.get(definition);
  if (known !== undefined) return known;
  const renderer = (props: BlockRenderProps) => createElement(VoidBlock, { ...props, definition });
  renderers.set(definition, renderer);
  return renderer;
}

/** A void block renderer for each type, the last definition of a type winning as in `blockByType`. */
export function voidRenderers(definitions: readonly AnyBlockDefinition[]): Record<string, BlockRenderer> {
  return Object.fromEntries(definitions.map((definition) => [definition.type, rendererFor(definition)]));
}
