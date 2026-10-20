import { setAttrsStep } from '../../engine';
import { blockById } from '../../engine/model/doc';
import type { UploadFn } from '../../types';
import type { ViewController } from '../../view';
import { intrinsicSize } from '../intrinsic-size';
import { str } from '../str';
import { resolvedAsset } from './image-source';

export type ImageUploadHost = {
  upload: UploadFn;
  resolveAssetUrl: (storageKey: string) => string;
  /** Called once the upload is in and about to be written, while the block is still drawn without its picture. */
  onLand?: () => void;
};

const newestUploads = new WeakMap<ViewController, Map<string, object>>();

function claim(controller: ViewController, blockId: string): object {
  const token = {};
  const uploads = newestUploads.get(controller) ?? new Map<string, object>();
  newestUploads.set(controller, uploads.set(blockId, token));
  return token;
}

const isNewest = (controller: ViewController, blockId: string, token: object): boolean =>
  newestUploads.get(controller)?.get(blockId) === token;

type Picture = { url: string; storageKey: string };

// The picture an image block shows, while the canvas can be written to.
function pictureOf(controller: ViewController, blockId: string): Picture | null {
  const block = blockById(controller.editor.state.doc, blockId);
  if (block?.type !== 'IMAGE' || controller.readOnly) return null;
  return { url: str(block.attrs.url), storageKey: str(block.attrs.storageKey) };
}

const samePicture = (a: Picture | null, b: Picture | null): boolean =>
  a !== null && b !== null && a.url === b.url && a.storageKey === b.storageKey;

function writeImage(controller: ViewController, blockId: string, patch: Record<string, unknown>, recorded: boolean) {
  const tr = controller.editor.createTransaction().step(setAttrsStep(blockId, patch));
  controller.dispatch(recorded ? tr : tr.setMeta('addToHistory', false));
}

/**
 * Writes the size of the picture a key names to an image block that still shows that key, unless an upload into the
 * block started since. The size is derived from the picture, so it is no step of its own: undoing the upload takes it
 * away too.
 */
export async function measureImage(
  controller: ViewController,
  blockId: string,
  storageKey: string,
  resolveAssetUrl: (storageKey: string) => string,
  token = claim(controller, blockId),
): Promise<void> {
  const src = resolvedAsset(resolveAssetUrl, storageKey);
  const size = src === null ? null : await intrinsicSize(src);
  if (size && isNewest(controller, blockId, token) && samePicture(pictureOf(controller, blockId), { url: '', storageKey })) {
    writeImage(controller, blockId, { ...size }, false);
  }
}

/**
 * Uploads a picture into an image block. Its key is written as soon as the upload resolves, in place of a link and the
 * size of the picture before, then its measured size. Of two uploads into one block, the one started last wins, and
 * none is written once the block shows another picture or the canvas is read-only.
 */
export async function uploadImage(
  controller: ViewController,
  blockId: string,
  file: File,
  { upload, resolveAssetUrl, onLand }: ImageUploadHost,
): Promise<void> {
  const token = claim(controller, blockId);
  const before = pictureOf(controller, blockId);
  const { storageKey } = await upload(file, 'image');
  if (!isNewest(controller, blockId, token) || !samePicture(pictureOf(controller, blockId), before)) return;
  onLand?.();
  writeImage(controller, blockId, { storageKey, url: undefined, width: undefined, height: undefined }, true);
  await measureImage(controller, blockId, storageKey, resolveAssetUrl, token);
}
