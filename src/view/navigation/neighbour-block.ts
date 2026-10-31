import type { EngineBlock, EngineDoc, Pos, Selection } from '../../engine';
import { isTextFlow } from '../../engine/commands/block-helpers';
import { endOf, nodeSelection, primaryRegion, startOf } from '../../engine/state/selection';
import type { ViewController } from '../controller/view-controller';
import { entersAsNode } from './node-entry';
import { visibleBlockIndexes } from './visible-blocks';
import { dispatchSelection } from '../controller/dispatch-selection';

const anyBlock = () => true;

/** The first visible block `accept` takes from `from` on, or from the edge of the document for a null `from`. */
export function neighbourBlock(
  doc: EngineDoc,
  from: string | null,
  direction: -1 | 1,
  accept: (block: EngineBlock) => boolean = anyBlock,
): EngineBlock | null {
  const index = from === null ? -direction * Infinity : doc.index.get(from);
  if (index === undefined) return null;
  const visible = visibleBlockIndexes(doc);
  const ahead = direction < 0 ? visible.filter((at) => at < index).reverse() : visible.filter((at) => at > index);
  const found = ahead.find((at) => accept(doc.blocks[at]));
  return found === undefined ? null : doc.blocks[found];
}

// A block whose entry region is drawn without a host, such as an image or a table under the void fallback, can hold
// no caret, so it is node-selected like a void block.
export function entryEdge(controller: ViewController, block: string, direction: -1 | 1): Selection {
  const { doc, schema } = controller.editor.state;
  const edge = direction < 0 ? endOf(doc, schema, block) : startOf(doc, schema, block);
  if (edge.kind !== 'text') return edge;
  const drawn = controller.registry.get(edge.head.block, edge.head.region) !== undefined;
  return drawn && !entersAsNode(controller, block) ? edge : nodeSelection(block);
}

/** The block itself, for a caret leaving its text towards the start of a block drawn as more than its text. */
export const ownNode = (controller: ViewController, block: string, direction: -1 | 1): Selection | null =>
  direction < 0 && entersAsNode(controller, block) ? nodeSelection(block) : null;

// A text block whose renderer threw has no host and the model puts a caret at its start, so arrows pass over it.
export const canBeEntered = (controller: ViewController) => (block: EngineBlock): boolean => {
  const { schema } = controller.editor.state;
  const region = isTextFlow(schema, block) ? primaryRegion(schema, block) : null;
  return region === null || controller.registry.get(block.id, region) !== undefined || entersAsNode(controller, block.id);
};

export const holdsTextHead = (controller: ViewController) => (block: EngineBlock): boolean =>
  isTextFlow(controller.editor.state.schema, block) && entryEdge(controller, block.id, 1).kind === 'text';

export function neighbourHead(controller: ViewController, from: string | null, direction: -1 | 1): Pos | null {
  const target = neighbourBlock(controller.editor.state.doc, from, direction, holdsTextHead(controller));
  const edge = target && entryEdge(controller, target.id, direction);
  return edge?.kind === 'text' ? edge.head : null;
}

export function moveToNeighbour(controller: ViewController, from: string | null, direction: -1 | 1): boolean {
  const target = neighbourBlock(controller.editor.state.doc, from, direction, canBeEntered(controller));
  if (target === null) return false;
  dispatchSelection(controller, entryEdge(controller, target.id, direction));
  return true;
}
