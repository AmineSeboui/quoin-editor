import { applyRemote } from '../engine/collab/apply-remote';
import type { CommandFactories } from '../engine/commands/chain';
import type { Editor } from '../engine/extension/editor';
import { createDoc } from '../engine/model/doc';
import { sameDoc } from '../engine/model/same-doc';
import { replaceDocStep } from '../engine/transform/replace-doc-step';
import { fromYBlock, toYBlock, type YBlocks } from './doc-shape';
import { removeCopies, uniqueBlocks } from './unique-blocks';

export type Seed = 'if-empty' | false;

/**
 * Brings the editor and the shared array to the same document as the editor connects. An empty array is seeded from
 * the editor in one transaction of `origin` when `seed` allows; otherwise the editor takes the array's document in one
 * remote change. Seeding is decided by what the array holds now, so two clients connecting to one empty document
 * before their provider synced both seed it: a host connects after the provider's first sync, or passes `seed: false`
 * to all but one client.
 */
export function seedOrLoad(editor: Editor<CommandFactories>, blocks: YBlocks, origin: object, seed: Seed): void {
  const doc = blocks.doc!;
  if (blocks.length === 0 && seed === 'if-empty') {
    doc.transact(() => blocks.insert(0, editor.state.doc.blocks.map(toYBlock)), origin);
    return;
  }
  const { kept, copies } = uniqueBlocks(blocks);
  if (copies.length > 0) doc.transact(() => removeCopies(blocks, copies), origin);
  const shared = createDoc(kept.map(fromYBlock));
  if (!sameDoc(shared, editor.state.doc)) applyRemote(editor, [replaceDocStep(shared)]);
}
