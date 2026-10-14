import { attachInput, type AttachedInput } from '../input/attach-input';
import type { CrossMode } from '../selection/cross-mode';
import { createSelectionSync, type SelectionSync } from './selection-sync';
import type { ViewController } from './view-controller';

export type RootBinding = {
  readonly root: HTMLElement;
  readonly input: AttachedInput;
  readonly selectionSync: SelectionSync;
  detach(): void;
};

export function bindRoot(
  controller: ViewController,
  root: HTMLElement,
  cross: CrossMode,
  committed: () => void,
): RootBinding {
  const selectionSync = createSelectionSync(root.ownerDocument, () => controller.readSelectionFromDom());
  const input = attachInput(controller, root);
  const unsubscribe = controller.editor.subscribe(committed);
  const detachCross = cross.attach(root);
  selectionSync.start();
  return {
    root,
    input,
    selectionSync,
    detach() {
      selectionSync.stop();
      input.detach();
      unsubscribe();
      detachCross();
    },
  };
}
