import { blockRangeSelection, insertBlockAfter, insertBlocksStep, type BlockAttrs, type Pos } from '../engine';
import { createBlock, headBlockId } from '../engine/commands/block-helpers';
import { runCommands } from '../engine/commands/run-commands';
import { setSelection } from '../engine/commands/selection-commands';
import { startOf } from '../engine/state/selection';
import type { UploadFn, UploadResult } from '../types';
import type { ViewController } from '../view';

type FileBlock = { type: 'IMAGE' | 'FILE'; attrs: BlockAttrs };

export type InsertUploadsOptions = { upload?: UploadFn; onError: (error: Error) => void };

const isImage = (file: File) => file.type.startsWith('image/');

const asError = (cause: unknown) => (cause instanceof Error ? cause : new Error(String(cause)));

function fileBlock(file: File, { storageKey, filename, size }: UploadResult): FileBlock {
  if (isImage(file)) return { type: 'IMAGE', attrs: { storageKey, alt: '' } };
  return { type: 'FILE', attrs: { storageKey, filename, size } };
}

function anchorBlock(controller: ViewController, at: Pos | null): string | null {
  const { doc, selection } = controller.editor.state;
  const candidates = [at?.block, headBlockId(selection), doc.blocks[doc.blocks.length - 1]?.id];
  return candidates.find((id): id is string => typeof id === 'string' && doc.index.has(id)) ?? null;
}

function insertIntoEmpty(controller: ViewController, blocks: readonly FileBlock[]): void {
  const { schema } = controller.editor.state;
  const created = blocks.map(({ type, attrs }) => createBlock(schema, type, attrs));
  const tr = controller.editor.createTransaction().step(insertBlocksStep(0, created));
  controller.dispatch(tr.setSelection(startOf(tr.doc, schema, created[created.length - 1].id)));
}

function insertFileBlocks(controller: ViewController, at: Pos | null, blocks: readonly FileBlock[]): void {
  const anchor = anchorBlock(controller, at);
  if (anchor === null) return insertIntoEmpty(controller, blocks);
  const inserts = blocks.map(({ type, attrs }) => insertBlockAfter(type, attrs));
  const { ok, tr } = runCommands(controller.editor.state, [setSelection(blockRangeSelection(anchor)), ...inserts]);
  if (ok && tr !== null) controller.dispatch(tr);
}

/** Uploads the files and inserts an image block for each image and a file block for anything else, in their order. */
export async function insertUploads(
  controller: ViewController,
  files: readonly File[],
  at: Pos | null,
  { upload, onError }: InsertUploadsOptions,
): Promise<void> {
  if (!upload) return onError(new Error('Uploads are not configured.'));
  const outcomes = await Promise.allSettled(files.map(async (file) => upload(file, isImage(file) ? 'image' : 'file')));
  const blocks: FileBlock[] = [];
  outcomes.forEach((outcome, index) => {
    if (outcome.status === 'fulfilled') blocks.push(fileBlock(files[index], outcome.value));
    else onError(asError(outcome.reason));
  });
  if (blocks.length > 0 && controller.root !== null && !controller.readOnly) insertFileBlocks(controller, at, blocks);
}
