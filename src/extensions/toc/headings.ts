import { createSchema, type EngineDoc, type Schema } from '../../engine';
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

let defaultSchema: Schema | undefined;

/**
 * The headings of the document in order, as `toHTML` lists them in its table of contents: a heading with no text is
 * left out. Their text is read with `schema`, the core one by default, which has to know any atom of the host's own.
 */
export function headings(doc: EngineDoc, options: { schema?: Schema } = {}): TocHeading[] {
  const schema = options.schema ?? (defaultSchema ??= createSchema());
  return collectHeadings(doc.blocks, schema).map((heading) => ({ ...heading, anchor: headingId(heading.blockId) }));
}
