import type { QuoinBlock } from '../model/quoin-block';

export type Slice = {
  readonly blocks: readonly QuoinBlock[];
  readonly openStart: boolean;
  readonly openEnd: boolean;
  /** Read from plain text: its first line takes the type of an empty block it is pasted into. */
  readonly plainText?: boolean;
};
