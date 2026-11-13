import type { ViewController } from '../../view';

type UploadTarget = { takes(file: File): boolean; start(file: File): void };

const targets = new WeakMap<ViewController, Map<string, UploadTarget>>();

/** Offers a block with nothing uploaded yet the files pasted while it is selected as a whole. */
export function offerUploadTarget(controller: ViewController, blockId: string, target: UploadTarget): () => void {
  const offered = targets.get(controller) ?? new Map<string, UploadTarget>();
  targets.set(controller, offered.set(blockId, target));
  return () => {
    if (offered.get(blockId) === target) offered.delete(blockId);
  };
}

/** Starts the first file the block selected as a whole takes uploading into it, and returns the files it left. */
export function fillSelectedBlock(controller: ViewController, files: readonly File[]): readonly File[] {
  const { selection } = controller.editor.state;
  const target = selection?.kind === 'node' ? targets.get(controller)?.get(selection.block) : undefined;
  const taken = target && files.find((file) => target.takes(file));
  if (taken === undefined) return files;
  target!.start(taken);
  return files.filter((file) => file !== taken);
}
