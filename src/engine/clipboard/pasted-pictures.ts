import { str } from '../blocks/data-fields';
import { headBlockId } from '../commands/block-helpers';
import { capIndents } from '../commands/cap-indents';
import type { EngineBlock } from '../model/types';
import { endOf } from '../state/selection';
import { Transaction } from '../state/transaction';
import { removeBlocksStep } from '../transform/block-steps';
import type { PastedSlice } from './slice';

/** The meta of a paste that held pictures it carried inline out of the document. */
export const PASTED_PICTURES = 'pastedPictures';

/** A picture a paste carried inline: its data address, the image block it would be, and the block it came after. */
export type PastedPicture = { readonly url: string; readonly block: EngineBlock; readonly after: string | null };

/**
 * Takes the image blocks that stand in for a paste's inline pictures back out of its transaction, so the document, its
 * history and every collaborator see the paste without them, and lists them in the meta with the block each came after.
 * A paste of nothing but such pictures changes nothing, and they come after the block the writer was in.
 */
export function setPicturesAside(tr: Transaction, { blocks, pictures = [] }: PastedSlice): Transaction {
  if (pictures.length === 0) return tr;
  const { before } = tr;
  const held = tr.doc.blocks.filter(
    ({ id, type, attrs }) => type === 'IMAGE' && !before.doc.index.has(id) && !str(attrs.url) && !str(attrs.storageKey),
  );
  const list = (after: (block: EngineBlock) => string | null) =>
    held.map((block, index): PastedPicture => ({ url: pictures[index], block, after: after(block) }));
  if (held.length === blocks.length) {
    const writer = headBlockId(before.selection) ?? before.doc.blocks[before.doc.blocks.length - 1]?.id ?? null;
    return new Transaction(before).setOrigin('paste').setMeta(PASTED_PICTURES, list(() => writer));
  }
  const head = headBlockId(tr.selection);
  const set = list((block) => {
    const at = tr.doc.index.get(block.id) ?? 0;
    tr.step(removeBlocksStep(at, 1));
    capIndents(tr, at);
    return tr.doc.blocks[at - 1]?.id ?? null;
  });
  const landed = set.find(({ block }) => block.id === head)?.after;
  if (landed) tr.setSelection(endOf(tr.doc, before.schema, landed));
  return tr.setMeta(PASTED_PICTURES, set);
}
