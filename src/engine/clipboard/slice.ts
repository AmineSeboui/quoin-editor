import type { QuoinBlock } from '../model/quoin-block';

export type Slice = {
  readonly blocks: readonly QuoinBlock[];
  readonly openStart: boolean;
  readonly openEnd: boolean;
  /** Read from plain text: its first line takes the type of an empty block it is pasted into. */
  readonly plainText?: boolean;
};

/** A slice the clipboard gave as HTML from another document, which the canvas may hold pictures of its own for. */
export type PastedSlice = Slice & { readonly fromHTML?: boolean };

/** The meta of a transaction that pastes HTML from another document. */
export const PASTED_HTML = 'pastedHTML';
