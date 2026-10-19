import { replaceBlockStep, type EngineBlock } from '../../engine';
import { specFor } from '../../engine/blocks/unknown-spec';
import type { InternalEditor } from '../../engine/extension/editor';
import { sameValue } from '../../engine/model/same-value';
import { HISTORY_GROUP } from '../../engine/state/history';
import type { AnyBlockDefinition } from '../../registry';
import type { ViewController } from '../../view';
import { insertBlockToWrite } from '../insert-blocks';

type Data = Record<string, unknown>;

const internal = (controller: ViewController) => controller.editor as InternalEditor;

export function readBlockData(controller: ViewController, block: EngineBlock): Data {
  return internal(controller).codec.toQuoin(block).data;
}

// Read from the state at call time: an editor may write after an await, when the block has changed or gone. The write
// skips the view's edit(), which would hand focus that fell to the body to the block shell, away from the open editor.
export function writeBlockData(controller: ViewController, blockId: string, data: Data): void {
  const editor = internal(controller);
  const { doc, schema } = editor.state;
  const index = doc.index.get(blockId);
  if (index === undefined) return;
  const block = doc.blocks[index];
  const { attrs, regions } = specFor(schema, block.type).fromData(data, editor.codec.context);
  if (sameValue(attrs, block.attrs) && sameValue(regions, block.regions)) return;
  const tr = editor.createTransaction().step(replaceBlockStep({ ...block, attrs, regions }));
  editor.dispatch(tr.setMeta(HISTORY_GROUP, `block-data:${blockId}`));
}

export function insertAfterBlock(
  controller: ViewController,
  blockId: string,
  type: string,
  definition?: AnyBlockDefinition,
): void {
  const editor = internal(controller);
  const data = definition?.initialData?.();
  const content = data && specFor(editor.state.schema, type).fromData(data, editor.codec.context);
  controller.run(insertBlockToWrite({ type, ...content }, definition?.editor !== undefined, blockId));
}
