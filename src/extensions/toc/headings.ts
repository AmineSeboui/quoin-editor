import type { EngineDoc, Schema } from '../../engine';
import { headingId } from '../../engine/render/headings';
import { collectHeadings } from '../../engine/render/toc-html';

/** A heading of the document, as a table of contents lists it. */
export type TocHeading = {
  /** The id of the heading's block, which a link to the block names as `#block-<blockId>`. */
  readonly blockId: string;
  /** The id `toHTML` gives the heading's element, `h-<blockId>`. */
  readonly anchor: string;
  /** From 1 to 6. */
  readonly level: number;
  /** The heading's plain text. */
  readonly text: string;
};

/**
 * The headings of the document in order, read with the schema that knows its atoms, as `toHTML` lists them in its
 * table of contents: a heading with no text is left out.
 */
export function headings(doc: EngineDoc, schema: Schema): TocHeading[] {
  return collectHeadings(doc.blocks, schema).map((heading) => ({ ...heading, anchor: headingId(heading.blockId) }));
}
