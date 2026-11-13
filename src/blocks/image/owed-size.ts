import { blockById } from '../../engine/model/doc';
import type { ViewController } from '../../view';
import type { IntrinsicSize } from '../intrinsic-size';
import { assetOf, isNewestUpload, sameAsset, writeAttrs } from '../upload/block-upload';

type Measured = { storageKey: string; size: IntrinsicSize; token: object };

const owedSizes = new WeakMap<ViewController, Map<string, Measured>>();

const showsKey = (controller: ViewController, blockId: string, storageKey: string): boolean =>
  sameAsset(assetOf(controller, blockId, 'IMAGE'), { url: '', storageKey });

/**
 * Writes the size measured from a key to an image block that shows that key, unless an upload into the block started
 * since. A size measured once the key had gone, as when the upload was undone first, is owed to the block until it
 * shows the key again, as a redo makes it, which `payOwedSize` hears of.
 */
export function writeSize(controller: ViewController, blockId: string, measured: Measured): void {
  if (!isNewestUpload(controller, blockId, measured.token)) return;
  if (showsKey(controller, blockId, measured.storageKey)) writeAttrs(controller, blockId, { ...measured.size }, false);
  else owedSizes.set(controller, (owedSizes.get(controller) ?? new Map()).set(blockId, measured));
}

export function payOwedSize(controller: ViewController, blockId: string): void {
  const owing = owedSizes.get(controller);
  const owed = owing?.get(blockId);
  if (owed === undefined || !showsKey(controller, blockId, owed.storageKey)) return;
  owing!.delete(blockId);
  const unsized = blockById(controller.editor.state.doc, blockId)?.attrs.width === undefined;
  if (unsized && isNewestUpload(controller, blockId, owed.token)) writeAttrs(controller, blockId, { ...owed.size }, false);
}
