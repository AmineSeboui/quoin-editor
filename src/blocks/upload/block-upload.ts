import { setAttrsStep } from '../../engine';
import { blockById } from '../../engine/model/doc';
import type { UploadFn, UploadResult } from '../../types';
import type { ViewController } from '../../view';
import { str } from '../str';

export type BlockUploadHost = {
  upload: UploadFn;
  resolveAssetUrl: (storageKey: string) => string;
  /** Called once the upload is in and about to be written, while the block is still drawn as it was. */
  onLand?: () => void;
};

/** Uploads a file into a block, as the image and file blocks do. */
export type BlockUploader = (controller: ViewController, blockId: string, file: File, host: BlockUploadHost) => Promise<void>;

/** The type of block an upload goes into, and the category the host's upload function hears. */
export type UploadTarget = { type: string; category: string };

const newestUploads = new WeakMap<ViewController, Map<string, object>>();

export function claimUpload(controller: ViewController, blockId: string): object {
  const token = {};
  const uploads = newestUploads.get(controller) ?? new Map<string, object>();
  newestUploads.set(controller, uploads.set(blockId, token));
  return token;
}

export const isNewestUpload = (controller: ViewController, blockId: string, token: object): boolean =>
  newestUploads.get(controller)?.get(blockId) === token;

type Asset = { url: string; storageKey: string };

/** What a block of the type holds, while the canvas can be written to. */
export function assetOf(controller: ViewController, blockId: string, type: string): Asset | null {
  const block = blockById(controller.editor.state.doc, blockId);
  if (block?.type !== type || controller.readOnly) return null;
  return { url: str(block.attrs.url), storageKey: str(block.attrs.storageKey) };
}

export const sameAsset = (a: Asset | null, b: Asset | null): boolean =>
  a !== null && b !== null && a.url === b.url && a.storageKey === b.storageKey;

export function writeAttrs(controller: ViewController, blockId: string, patch: Record<string, unknown>, recorded: boolean) {
  const tr = controller.editor.createTransaction().step(setAttrsStep(blockId, patch));
  controller.dispatch(recorded ? tr : tr.setMeta('addToHistory', false));
}

/**
 * Uploads a file into a block and hands what the host stored to `land`. Of two uploads into one block, the one started
 * last wins, and none lands once the block holds something else or the canvas is read-only.
 */
export async function uploadInto(
  controller: ViewController,
  blockId: string,
  file: File,
  { type, category }: UploadTarget,
  { upload, onLand }: BlockUploadHost,
  land: (stored: UploadResult, token: object) => Promise<void> | void,
): Promise<void> {
  const token = claimUpload(controller, blockId);
  const before = assetOf(controller, blockId, type);
  const stored = await upload(file, category);
  if (!isNewestUpload(controller, blockId, token) || !sameAsset(assetOf(controller, blockId, type), before)) return;
  onLand?.();
  await land(stored, token);
}
