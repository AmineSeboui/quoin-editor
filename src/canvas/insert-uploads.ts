import { measureImage } from '../blocks/image/image-upload';
import { insertBlocks, type NewBlock } from '../blocks/insert-blocks';
import type { Pos, Selection } from '../engine';
import { headBlockId } from '../engine/commands/block-helpers';
import { newId } from '../engine/model/new-id';
import { sameSelection } from '../engine/state/selection';
import type { UploadFn, UploadResult } from '../types';
import type { ViewController } from '../view';

export type InsertUploadsOptions = {
  upload?: UploadFn;
  resolveAssetUrl: (storageKey: string) => string;
  onError: (error: Error) => void;
  /** What onError hears when the canvas was given no upload function. */
  unavailable: string;
};

type Writer = { selection: Selection | null; focus: Element | null };

const isImage = (file: File) => file.type.startsWith('image/');

const asError = (cause: unknown) => (cause instanceof Error ? cause : new Error(String(cause)));

function fileBlock(file: File, { storageKey, filename, size }: UploadResult): NewBlock {
  if (isImage(file)) return { id: newId(), type: 'IMAGE', attrs: { storageKey, alt: '' } };
  return { type: 'FILE', attrs: { storageKey, filename, size } };
}

function anchorBlock(controller: ViewController, at: Pos | null): string | null {
  const { doc, selection } = controller.editor.state;
  const candidates = [at?.block, headBlockId(selection), doc.blocks[doc.blocks.length - 1]?.id];
  return candidates.find((id): id is string => typeof id === 'string' && doc.index.has(id)) ?? null;
}

const writerOf = (controller: ViewController): Writer => ({
  selection: controller.editor.state.selection,
  focus: controller.root?.ownerDocument.activeElement ?? null,
});

function movedOn(controller: ViewController, before: Writer): boolean {
  const now = writerOf(controller);
  return now.focus !== before.focus || !sameSelection(now.selection, before.selection);
}

/**
 * Uploads the files and inserts an image block for each image and a file block for anything else, in their order,
 * then measures the images. A writer still where the paste or drop left them goes on in an empty line after the blocks;
 * one who moved on while the files uploaded keeps their caret and focus.
 */
export async function insertUploads(
  controller: ViewController,
  files: readonly File[],
  at: Pos | null,
  { upload, resolveAssetUrl, onError, unavailable }: InsertUploadsOptions,
): Promise<void> {
  if (!upload) return onError(new Error(unavailable));
  const writer = writerOf(controller);
  const outcomes = await Promise.allSettled(files.map(async (file) => upload(file, isImage(file) ? 'image' : 'file')));
  const blocks: NewBlock[] = [];
  outcomes.forEach((outcome, index) => {
    if (outcome.status === 'fulfilled') blocks.push(fileBlock(files[index], outcome.value));
    else onError(asError(outcome.reason));
  });
  if (blocks.length === 0 || controller.root === null || controller.readOnly) return;
  const landing = movedOn(controller, writer) ? 'stay' : 'line';
  if (!controller.run(insertBlocks(blocks, landing, anchorBlock(controller, at)))) return;
  for (const { id, attrs } of blocks) {
    if (id !== undefined) void measureImage(controller, id, String(attrs?.storageKey), resolveAssetUrl);
  }
}
