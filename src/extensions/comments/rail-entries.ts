import { indexOfBlock } from '../../engine/model/doc';
import type { EngineDoc } from '../../engine/model/types';
import { anchorText, commentAnchors, type AnchorRange } from './comment-anchors';
import type { CommentThread } from './comment-threads';

/** An open thread as the rail and the sheet list it: with no ranges once all of its text has been deleted. */
export type RailEntry = {
  readonly thread: CommentThread;
  readonly ranges: readonly AnchorRange[];
  readonly anchorText: string;
};

const NONE: readonly AnchorRange[] = [];

/** The open threads, those anchored in the order their text comes in the document, then those whose text is gone. */
export function railEntries(doc: EngineDoc, threads: readonly CommentThread[]): RailEntry[] {
  const anchors = commentAnchors(doc);
  const entries = threads
    .filter(({ resolved }) => !resolved)
    .map((thread): RailEntry => {
      const ranges = anchors.get(thread.id) ?? NONE;
      return { thread, ranges, anchorText: anchorText(doc, ranges) };
    });
  const place = ({ ranges: [first] }: RailEntry) =>
    first === undefined ? [Infinity, 0] : [indexOfBlock(doc, first.block), first.from];
  return entries
    .map((entry, order) => ({ entry, order, at: place(entry) }))
    .sort((a, b) => a.at[0] - b.at[0] || a.at[1] - b.at[1] || a.order - b.order)
    .map(({ entry }) => entry);
}
