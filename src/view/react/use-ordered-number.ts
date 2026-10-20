import type { ViewController } from '../controller/view-controller';
import { orderedNumber } from './list-numbers';
import { useEditorState } from './use-editor-state';

export function useOrderedNumber(controller: ViewController, blockId: string): number {
  return useEditorState(controller, ({ doc }) => {
    const index = doc.index.get(blockId);
    return index === undefined ? 1 : orderedNumber(doc, index);
  });
}
