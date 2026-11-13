import { uploadImage } from '../blocks/image/image-upload';
import type { BlockUploadHost } from '../blocks/upload/block-upload';
import type { EditorState, Transaction } from '../engine';
import { str } from '../engine/blocks/data-fields';
import { PASTED_HTML } from '../engine/clipboard/slice';
import type { ViewController } from '../view';

export type PastedImagesHost = BlockUploadHost & { onError: (error: Error) => void; failed: string };

const FETCHABLE = /^https?:\/\//i;

function pastedPictures(tr: Transaction, state: EditorState): { id: string; url: string }[] {
  if (tr.getMeta(PASTED_HTML) !== true) return [];
  return state.doc.blocks.flatMap(({ id, type, attrs }) => {
    const url = str(attrs.url);
    const pasted = type === 'IMAGE' && FETCHABLE.test(url) && !str(attrs.storageKey) && !tr.before.doc.index.has(id);
    return pasted ? [{ id, url }] : [];
  });
}

async function pictureAt(url: string): Promise<File | null> {
  const response = await fetch(url).catch(() => null);
  const picture = response?.ok ? await response.blob().catch(() => null) : null;
  if (!picture?.type.startsWith('image/')) return null;
  return new File([picture], url.split(/[?#]/)[0].split('/').pop() || 'image', { type: picture.type });
}

/**
 * Reads each picture that HTML pasted from another document links to and uploads it into its image block, so the
 * document keeps a copy of its own. A picture the page cannot read, such as one its server keeps from other origins,
 * stays linked.
 */
export function uploadPastedImages(controller: ViewController, tr: Transaction, state: EditorState, host: PastedImagesHost) {
  for (const { id, url } of pastedPictures(tr, state)) {
    void pictureAt(url).then(async (file) => {
      if (file === null) return;
      await uploadImage(controller, id, file, host).catch((cause: unknown) =>
        host.onError(new Error((cause instanceof Error && cause.message) || host.failed)),
      );
    });
  }
}
