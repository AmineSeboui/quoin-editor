import type { EditorState } from '../../engine';
import { useViewController } from './editor-context';
import { useEditorState } from './use-editor-state';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

const wholeState = (state: EditorState) => state;

// Drawn after every block, so its layout effect runs once the hosts of the same commit have rendered.
export function SelectionWriter() {
  const controller = useViewController();
  const state = useEditorState(controller, wholeState);
  useIsomorphicLayoutEffect(() => controller.afterRender(), [controller, state]);
  return null;
}
