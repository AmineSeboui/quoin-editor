import type { PageCanvas } from '../paint/page-canvas';
import type { Rgb } from '../text/text-style';

/** A shaded area or a bar beside a run of boxes, such as a callout or a quote, painted again on each page it spans. */
export type Frame = {
  readonly x: number;
  readonly width: number;
  readonly fill?: Rgb;
  readonly bar?: { readonly width: number; readonly color: Rgb };
};

/**
 * What the layout stacks on pages: a line of text, a table row, a picture or a space. A gap is space between blocks,
 * dropped at the top of a page and where it does not fit. A box kept with the next one moves to a new page with it.
 */
export type Box = {
  readonly height: number;
  readonly paint?: (canvas: PageCanvas, top: number) => void;
  readonly gap?: boolean;
  readonly keepWithNext?: boolean;
  readonly frames?: readonly Frame[];
  /** The id of the heading this box starts, which a link to it lands on. */
  readonly anchor?: string;
};
