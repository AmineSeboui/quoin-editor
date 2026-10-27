import type * as Y from 'yjs';
import { applyRemote } from '../engine/collab/apply-remote';
import type { CommandFactories } from '../engine/commands/chain';
import type { Editor } from '../engine/extension/editor';
import { sameDoc } from '../engine/model/same-doc';
import { replaceDocStep } from '../engine/transform/replace-doc-step';
import { writeBlocks } from './doc-shape';
import { cleanEntry, createLayout, emptySpan, placeEntries, type Layout } from './layout';
import { readShared } from './read-shared';
import type { RequiredRegions } from './required-regions';

export type Seed = 'if-empty' | false;

/**
 * Brings the editor and the shared text to the same document as the editor connects, and returns where the text holds
 * it. An empty text is seeded from the editor in one transaction of `origin` when `seed` allows; otherwise the editor
 * takes the text's document in one remote change. Seeding is decided by what the text holds now, so two clients
 * connecting to one empty document before their provider synced both seed it: a host connects after the provider's
 * first sync, or passes `seed: false` to all but one client.
 */
export function seedOrLoad(
  editor: Editor<CommandFactories>,
  text: Y.Text,
  { origin, seed, required }: { origin: object; seed: Seed; required: RequiredRegions },
): Layout {
  const { blocks } = editor.state.doc;
  if (text.length === 0 && seed === 'if-empty') {
    let maps: Y.Map<unknown>[] = [];
    text.doc!.transact(() => (maps = writeBlocks(text, 0, blocks)), origin);
    const layout = createLayout([emptySpan()], new Map());
    placeEntries(layout, 1, 0, blocks.map((block, i) => cleanEntry(block, maps[i])));
    return layout;
  }
  const { doc, layout } = readShared(text, required);
  if (!sameDoc(doc, editor.state.doc)) applyRemote(editor, [replaceDocStep(doc)]);
  return layout;
}
