import { insertBlockAfter, nodeSelection, replaceBlockStep, type BlockAttrs, type EngineBlock } from '../../engine';
import { specFor } from '../../engine/blocks/unknown-spec';
import type { InternalEditor } from '../../engine/extension/editor';
import { sameValue } from '../../engine/model/same-value';
import { HISTORY_GROUP } from '../../engine/state/history';
import type { ViewController } from '../../view';

type Data = Record<string, unknown>;

const internal = (controller: ViewController) => controller.editor as InternalEditor;

export function readBlockData(controller: ViewController, block: EngineBlock): Data {
  return internal(controller).codec.toQuoin(block).data;
}

// Read from the state at call time: an editor may write after an await, when the block has changed or gone.
export function writeBlockData(controller: ViewController, blockId: string, data: Data): void {
  const editor = internal(controller);
  const { doc, schema } = editor.state;
  const index = doc.index.get(blockId);
  if (index === undefined) return;
  const block = doc.blocks[index];
  const { attrs, regions } = specFor(schema, block.type).fromData(data, editor.codec.context);
  if (sameValue(attrs, block.attrs) && sameValue(regions, block.regions)) return;
  const tr = editor.createTransaction().step(replaceBlockStep({ ...block, attrs, regions }));
  controller.dispatch(tr.setMeta(HISTORY_GROUP, `block-data:${blockId}`));
}

/** The attributes a new block of the type takes for its initial data, or none to take its spec's own. */
export function attrsForData(controller: ViewController, type: string, data?: Data): BlockAttrs | undefined {
  const editor = internal(controller);
  return data && specFor(editor.state.schema, type).fromData(data, editor.codec.context).attrs;
}

export function insertAfterBlock(controller: ViewController, blockId: string, type: string, data?: Data): void {
  const editor = internal(controller);
  const attrs = attrsForData(controller, type, data);
  controller.edit(() => {
    editor.dispatch(editor.createTransaction().setSelection(nodeSelection(blockId)));
    return insertBlockAfter(type, attrs)(editor.state, editor.dispatch);
  });
}
