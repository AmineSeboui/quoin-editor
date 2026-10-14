import type { EngineBlock, EngineDoc, Pos, Selection } from '../../engine';
import { isTextFlow } from '../../engine/commands/block-helpers';
import { endOf, nodeSelection, startOf } from '../../engine/state/selection';
import type { ViewController } from '../controller/view-controller';
import { visibleBlockIndexes } from './visible-blocks';

const anyBlock = () => true;

export function neighbourBlock(
  doc: EngineDoc,
  from: string,
  direction: -1 | 1,
  accept: (block: EngineBlock) => boolean = anyBlock,
): EngineBlock | null {
  const index = doc.index.get(from);
  if (index === undefined) return null;
  const visible = visibleBlockIndexes(doc);
  const ahead = direction < 0 ? visible.filter((at) => at < index).reverse() : visible.filter((at) => at > index);
  const found = ahead.find((at) => accept(doc.blocks[at]));
  return found === undefined ? null : doc.blocks[found];
}

// A block whose entry region is drawn without a host, such as an image or a table under the void fallback, can hold
// no caret, so it is node-selected like a void block.
export function entryEdge({ editor, registry }: ViewController, block: string, direction: -1 | 1): Selection {
  const { doc, schema } = editor.state;
  const edge = direction < 0 ? endOf(doc, schema, block) : startOf(doc, schema, block);
  return edge.kind === 'text' && !registry.get(edge.head.block, edge.head.region) ? nodeSelection(block) : edge;
}

export const holdsTextHead = (controller: ViewController) => (block: EngineBlock): boolean =>
  isTextFlow(controller.editor.state.schema, block) && entryEdge(controller, block.id, 1).kind === 'text';

export function neighbourHead(controller: ViewController, from: string, direction: -1 | 1): Pos | null {
  const target = neighbourBlock(controller.editor.state.doc, from, direction, holdsTextHead(controller));
  const edge = target && entryEdge(controller, target.id, direction);
  return edge?.kind === 'text' ? edge.head : null;
}

export function moveToNeighbour(controller: ViewController, from: string, direction: -1 | 1): boolean {
  const { editor } = controller;
  const target = neighbourBlock(editor.state.doc, from, direction);
  if (target === null) return false;
  controller.dispatch(editor.createTransaction().setSelection(entryEdge(controller, target.id, direction)));
  return true;
}
