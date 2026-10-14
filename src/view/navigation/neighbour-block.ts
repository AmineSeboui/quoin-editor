import type { EditorState, EngineBlock, EngineDoc, Selection } from '../../engine';
import { endOf, startOf } from '../../engine/state/selection';
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

export function entryEdge({ doc, schema }: EditorState, block: string, direction: -1 | 1): Selection {
  return direction < 0 ? endOf(doc, schema, block) : startOf(doc, schema, block);
}

export function moveToNeighbour(controller: ViewController, from: string, direction: -1 | 1): boolean {
  const { editor } = controller;
  const target = neighbourBlock(editor.state.doc, from, direction);
  if (target === null) return false;
  controller.dispatch(editor.createTransaction().setSelection(entryEdge(editor.state, target.id, direction)));
  return true;
}
