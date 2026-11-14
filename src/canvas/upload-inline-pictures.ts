import { measureImage } from '../blocks/image/image-upload';
import { isStored } from '../blocks/upload/block-upload';
import { insertBlocksStep, type EngineDoc, type Transaction } from '../engine';
import { PASTED_PICTURES, type PastedPicture } from '../engine/clipboard/pasted-pictures';
import { capIndents } from '../engine/commands/cap-indents';
import { newId } from '../engine/model/new-id';
import { uploadError } from '../upload/upload-error';
import type { ViewController } from '../view';
import { inlinePicture, isTooLarge } from './inline-picture';
import type { PastedImagesHost } from './upload-pasted-images';

export type InlinePicturesHost = PastedImagesHost & { tooLarge: string };

async function uploaded(url: string, host: InlinePicturesHost): Promise<string | null> {
  if (isTooLarge(url)) {
    host.onError(new Error(host.tooLarge));
    return null;
  }
  const file = await inlinePicture(url);
  if (file === null) return null;
  try {
    const stored = await host.upload(file, 'image');
    if (isStored(stored)) return stored.storageKey;
    host.onError(new Error(host.failed));
  } catch (cause) {
    host.onError(uploadError(cause, host.failed));
  }
  return null;
}

function slotAfter(doc: EngineDoc, anchor: string | null): number | undefined {
  if (anchor === null) return 0;
  const index = doc.index.get(anchor);
  return index === undefined ? undefined : index + 1;
}

// A picture goes in after the block it came after in the paste, or after the picture before it that came after the
// same block, at its own depth. One whose block is gone by then has nowhere to go and is left out.
function place(tr: Transaction, pictures: readonly PastedPicture[], keys: readonly (string | null)[]): [string, string][] {
  const placed = new Map<string | null, string>();
  const landed: [string, string][] = [];
  pictures.forEach(({ block, after }, index) => {
    const storageKey = keys[index];
    const at = slotAfter(tr.doc, placed.get(after) ?? after);
    if (storageKey === null || at === undefined) return;
    const id = newId();
    tr.step(insertBlocksStep(at, [{ ...block, id, attrs: { ...block.attrs, storageKey } }]));
    capIndents(tr, at, at + 1);
    placed.set(after, id);
    landed.push([id, storageKey]);
  });
  return landed;
}

/**
 * Uploads the pictures a paste carried inline, which the paste held out of the document, and puts them in where they
 * were once every upload is in, so their data never reaches the document, its history or a collaborator. A picture too
 * large to read is reported to `onError` as `tooLarge`, and an upload that fails as the image block reports one.
 */
export function uploadInlinePictures(controller: ViewController, tr: Transaction, host: InlinePicturesHost): void {
  const pictures = tr.getMeta<readonly PastedPicture[]>(PASTED_PICTURES) ?? [];
  if (pictures.length === 0) return;
  void Promise.all(pictures.map(({ url }) => uploaded(url, host))).then((keys) => {
    if (controller.root === null || controller.readOnly) return;
    const { editor } = controller;
    const put = editor.createTransaction();
    const landed = place(put, pictures, keys);
    if (landed.length === 0) return;
    editor.dispatch(put);
    for (const [id, storageKey] of landed) void measureImage(controller, id, storageKey, host.resolveAssetUrl);
  });
}
