import type { Heading } from '../../engine/render/headings';
import type { ResolveAssetUrl } from '../../export/asset-source';
import type { FontSet } from '../font/font-set';
import type { PdfImage } from '../image/pdf-image';
import type { PdfProblem } from '../pdf-problem';
import type { InlineReading } from '../text/inline-pieces';

/** What the layout of every block shares: the fonts, the pictures, the headings and the width of the page. */
export type LayoutContext = InlineReading & {
  readonly resolveAssetUrl: ResolveAssetUrl;
  readonly fonts: FontSet;
  readonly images: ReadonlyMap<string, LoadedPicture>;
  readonly headings: readonly Heading[];
  /** Where the text area starts, from the left edge of the page. */
  readonly left: number;
  readonly width: number;
  /** The height of the text area of a page. */
  readonly room: number;
  /** Records the characters of a block that no font draws, each run drawn as one box. */
  missing(blockId: string, clusters: readonly string[]): void;
  report(problem: PdfProblem): void;
};

/** A picture ready to draw, or why it could not be: it failed to load, or it is of a format a PDF cannot hold. */
export type LoadedPicture = PdfImage | 'unavailable' | 'format';

const INDENT_STEP = 24;

/** The left edge and width of a block nested `indent` deep, its width never under half the text area. */
export function indented(ctx: LayoutContext, indent: number, inset = 0): { x: number; width: number } {
  const offset = Math.min(indent * INDENT_STEP, ctx.width / 2) + inset;
  return { x: ctx.left + offset, width: ctx.width - offset };
}
