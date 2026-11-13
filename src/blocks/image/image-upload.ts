import type { ViewController } from '../../view';
import { intrinsicSize } from '../intrinsic-size';
import { claimUpload, uploadInto, writeAttrs, type BlockUploader } from '../upload/block-upload';
import { assetHref } from '../upload/resolved-asset';
import { writeSize } from './owed-size';

export const isImageFile = (file: File): boolean => file.type.startsWith('image/');

/**
 * Writes the size of the picture a key names to an image block that shows that key, as `writeSize` does. The size is
 * derived from the picture, so it is no step of its own: undoing the upload takes it away too.
 */
export async function measureImage(
  controller: ViewController,
  blockId: string,
  storageKey: string,
  resolveAssetUrl: (storageKey: string) => string,
  token = claimUpload(controller, blockId),
): Promise<void> {
  const src = assetHref(resolveAssetUrl, storageKey);
  const size = src === null ? null : await intrinsicSize(src);
  if (size) writeSize(controller, blockId, { storageKey, size, token });
}

/**
 * Uploads a picture into an image block. Its key is written as soon as the upload resolves, in place of a link and the
 * size of the picture before, then its measured size.
 */
export const uploadImage: BlockUploader = (controller, blockId, file, host) =>
  uploadInto(controller, blockId, file, { type: 'IMAGE', category: 'image' }, host, async ({ storageKey }, token) => {
    writeAttrs(controller, blockId, { storageKey, url: undefined, width: undefined, height: undefined }, true);
    await measureImage(controller, blockId, storageKey, host.resolveAssetUrl, token);
  });
