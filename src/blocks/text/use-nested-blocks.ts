import type { EditorState } from '../../engine';
import { descendantsEnd } from '../../engine/commands/block-helpers';
import { useEditorState, type ViewController } from '../../view';

const sameIds = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((id, index) => id === b[index]);

function nestedBlockIds({ doc }: EditorState, blockId: string): readonly string[] {
  const index = doc.index.get(blockId);
  if (index === undefined) return [];
  return doc.blocks.slice(index + 1, descendantsEnd(doc, index)).map((block) => block.id);
}

export function useNestedBlocks(controller: ViewController, blockId: string): readonly string[] {
  return useEditorState(controller, (state) => nestedBlockIds(state, blockId), sameIds);
}
