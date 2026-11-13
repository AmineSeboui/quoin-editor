import type { EditorState } from '../../engine';
import { descendantsEnd } from '../../engine/commands/block-helpers';
import { sameItems } from '../../engine/model/same-items';
import type { ViewController } from '../controller/view-controller';
import { useEditorState } from './use-editor-state';

function nestedBlockIds({ doc }: EditorState, blockId: string): readonly string[] {
  const index = doc.index.get(blockId);
  if (index === undefined) return [];
  return doc.blocks.slice(index + 1, descendantsEnd(doc, index)).map((block) => block.id);
}

export function useNestedBlocks(controller: ViewController, blockId: string): readonly string[] {
  return useEditorState(controller, (state) => nestedBlockIds(state, blockId), sameItems);
}
